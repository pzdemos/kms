/**
 * 项目服务
 * 负责项目的业务逻辑
 */

import { ProjectRepository } from '../repositories/project.repository';
import { UserRepository } from '../repositories/user.repository';
import { AuditService } from './audit.service';
import { CryptoService } from '../core/crypto.service';
import { Project, CreateProjectOptions, Role } from '../types';
import { createProject, validateProject } from '../models/project.model';
import { createUser } from '../models/user.model';
import { generateSalt } from '../core/key-derivation';
import { ValidationError, ProjectNotFoundError } from '../types';
import { validatePasswordStrength } from '../utils/constants';
import { AuditAction, ResourceType } from '../types';
import { generateId } from '../utils/constants';
import { hash } from 'bcrypt';

export class ProjectService {
  constructor(
    private projectRepo: ProjectRepository,
    private userRepo: UserRepository,
    private auditService: AuditService,
    private cryptoService: CryptoService
  ) {}

  /**
   * 创建项目
   */
  async createProject(options: CreateProjectOptions, userId: string): Promise<Project> {
    // 验证密码强度
    const passwordValidation = validatePasswordStrength(options.masterPassword);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join(', '));
    }

    // 验证项目名称唯一性
    const existingProject = await this.projectRepo.findByProjectName(options.projectName);
    if (existingProject) {
      throw new ValidationError('Project name already exists');
    }

    // 派生主密钥
    const salt = generateSalt();
    const masterKey = await this.cryptoService.deriveMasterKey(options.masterPassword, salt);
    const masterKeyHash = await this.cryptoService.hashMasterKey(masterKey);

    // 加密主密钥（这里简化处理，实际应该使用系统主密钥加密）
    // 为了安全，我们存储哈希用于验证，不存储加密的主密钥
    // 使用时需要用户重新提供密码来派生主密钥

    const project = createProject(
      options,
      '', // 加密后的主密钥（可选实现）
      masterKeyHash,
      salt
    );

    await this.projectRepo.insertOne(project as any);

    // 自动创建项目所有者用户（管理员）
    // 使用 userId 作为用户名，这样 setCurrentUser 后可以直接使用
    const ownerUser = createUser(
      project.projectId,
      {
        username: userId, // 使用调用者的 userId 作为用户名
        password: options.masterPassword,
        roles: [Role.ADMIN]
      },
      await hash(options.masterPassword, 10)
    );

    await this.userRepo.insertOne(ownerUser as any);

    // 记录审计日志
    await this.auditService.logProjectCreated(
      project.projectId,
      userId,
      project.projectName,
      true
    );

    return project;
  }

  /**
   * 获取项目
   */
  async getProject(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findByProjectId(projectId);

    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    return project;
  }

  /**
   * 列出所有项目
   */
  async listProjects(): Promise<Project[]> {
    return await this.projectRepo.findProjects();
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = await this.getProject(projectId);

    await this.projectRepo.softDeleteProject(projectId);

    await this.auditService.log({
      projectId,
      userId,
      action: AuditAction.DELETE_PROJECT,
      resourceType: ResourceType.PROJECT,
      resourceId: projectId,
      details: {
        keyName: project.projectName,
        success: true,
      },
    });
  }

  /**
   * 解锁项目主密钥（使用主密码）
   */
  async unlockProjectMasterKey(projectId: string, masterPassword: string): Promise<string> {
    const project = await this.getProject(projectId);

    const masterKey = await this.cryptoService.unlockProjectMasterKey(
      masterPassword,
      project.salt,
      project.masterKeyHash
    );

    return masterKey.toString('hex');
  }
}

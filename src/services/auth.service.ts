/**
 * 认证服务
 * 负责用户认证和授权
 */

import { UserRepository } from '../repositories/user.repository';
import { AuditService } from './audit.service';
import { User, CreateUserData, AuthCredentials, AuthResult, Role } from '../types';
import { createUser, validateUser, toSafeUser } from '../models/user.model';
import { hash, compare } from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuthenticationError, ValidationError, UserNotFoundError } from '../types';
import { AuditAction, ResourceType } from '../types';
import { generateId } from '../utils/constants';

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private auditService: AuditService
  ) {}

  /**
   * 创建用户
   */
  async createUser(
    projectId: string,
    creatorId: string,
    userData: CreateUserData
  ): Promise<Omit<User, 'passwordHash' | 'apiKeyHash'>> {
    // 验证用户数据
    const validation = validateUser(userData);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    // 检查用户名是否已存在
    const existingUser = await this.userRepo.findByProjectAndUsername(
      projectId,
      userData.username
    );
    if (existingUser) {
      throw new ValidationError('Username already exists');
    }

    // 哈希密码
    const passwordHash = await hash(userData.password, 10);

    // 生成API密钥
    const apiKey = this.generateApiKey();
    const apiKeyHash = await hash(apiKey, 10);

    const user = createUser(projectId, userData, passwordHash, apiKeyHash);

    await this.userRepo.insertOne(user as any);

    // 记录审计日志
    await this.auditService.log({
      projectId,
      userId: creatorId,
      action: AuditAction.CREATE_USER,
      resourceType: ResourceType.USER,
      resourceId: user.userId!,
      details: {
        success: true,
      },
    });

    // 返回用户信息（不包含敏感信息）和API密钥
    return {
      ...toSafeUser(user),
      apiKey, // 仅在创建时返回一次
    } as any;
  }

  /**
   * 用户登录
   */
  async login(
    projectId: string,
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    const user = await this.userRepo.findByProjectAndUsername(
      projectId,
      credentials.username
    );

    if (!user) {
      await this.auditService.log({
        projectId,
        action: AuditAction.LOGIN_FAILED,
        resourceType: ResourceType.USER,
        resourceId: credentials.username,
        details: {
          success: false,
          errorMessage: 'User not found',
        },
      });

      return {
        success: false,
        error: 'Invalid username or password',
      };
    }

    if (user.status !== 'active') {
      await this.auditService.log({
        projectId,
        userId: user.userId,
        action: AuditAction.LOGIN_FAILED,
        resourceType: ResourceType.USER,
        resourceId: user.userId!,
        details: {
          success: false,
          errorMessage: 'User account is not active',
        },
      });

      return {
        success: false,
        error: 'User account is not active',
      };
    }

    const passwordMatch = await compare(credentials.password, user.passwordHash);

    if (!passwordMatch) {
      await this.auditService.log({
        projectId,
        userId: user.userId,
        action: AuditAction.LOGIN_FAILED,
        resourceType: ResourceType.USER,
        resourceId: user.userId!,
        details: {
          success: false,
          errorMessage: 'Invalid password',
        },
      });

      return {
        success: false,
        error: 'Invalid username or password',
      };
    }

    // 更新最后登录时间
    await this.userRepo.updateLastLogin(user.userId!);

    // 记录审计日志
    await this.auditService.log({
      projectId,
      userId: user.userId,
      action: AuditAction.LOGIN,
      resourceType: ResourceType.USER,
      resourceId: user.userId!,
      details: {
        success: true,
      },
    });

    return {
      success: true,
      user: toSafeUser(user),
    };
  }

  /**
   * 使用API密钥认证
   */
  async authenticateWithApiKey(
    projectId: string,
    apiKey: string
  ): Promise<User | null> {
    // 查找所有用户并检查API密钥
    const users = await this.userRepo.findByProjectId(projectId);

    for (const user of users) {
      if (user.apiKeyHash && await compare(apiKey, user.apiKeyHash)) {
        if (user.status === 'active') {
          return user;
        }
      }
    }

    return null;
  }

  /**
   * 验证用户凭证
   */
  async verifyCredentials(
    projectId: string,
    username: string,
    password: string
  ): Promise<boolean> {
    const result = await this.login(projectId, { username, password });
    return result.success;
  }

  /**
   * 生成API密钥
   */
  private generateApiKey(): string {
    const apiKeyPrefix = 'kms_';
    const randomBytesBuffer = randomBytes(32);
    const randomString = randomBytesBuffer.toString('hex');
    return `${apiKeyPrefix}${randomString}`;
  }

  /**
   * 轮换API密钥
   */
  async rotateApiKey(
    projectId: string,
    userId: string,
    targetUserId: string
  ): Promise<string> {
    const user = await this.userRepo.getByUserId(targetUserId);

    if (user.projectId !== projectId) {
      throw new ValidationError('User does not belong to this project');
    }

    // 生成新API密钥
    const newApiKey = this.generateApiKey();
    const newApiKeyHash = await hash(newApiKey, 10);

    await this.userRepo.updateUser(targetUserId, { apiKeyHash: newApiKeyHash });

    return newApiKey;
  }
}

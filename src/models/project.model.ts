/**
 * 项目数据模型
 */

import { Project, CreateProjectOptions, ProjectStatus } from '../types';
import { generateId } from '../utils/constants';

/**
 * 创建新项目
 */
export function createProject(options: CreateProjectOptions, masterKeyEncrypted: string, masterKeyHash: string, salt: string): Project {
  const now = new Date();

  return {
    projectId: generateId('proj'),
    projectName: options.projectName,
    masterKeyHash,
    masterKeyEncrypted,
    salt,
    createdAt: now,
    updatedAt: now,
    status: ProjectStatus.ACTIVE,
    metadata: options.metadata,
  };
}

/**
 * 验证项目数据
 */
export function validateProject(project: Partial<Project>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!project.projectName || project.projectName.trim().length === 0) {
    errors.push('Project name is required');
  }

  if (project.projectName && project.projectName.length > 100) {
    errors.push('Project name must be less than 100 characters');
  }

  if (!project.projectId || project.projectId.trim().length === 0) {
    errors.push('Project ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 转换项目为安全格式（不包含敏感信息）
 */
export function toSafeProject(project: Project): Omit<Project, 'masterKeyHash' | 'masterKeyEncrypted' | 'salt'> {
  const { masterKeyHash, masterKeyEncrypted, salt, ...safeProject } = project;
  return safeProject;
}

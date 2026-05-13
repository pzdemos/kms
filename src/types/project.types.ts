/**
 * 项目相关类型定义
 */

/**
 * 项目状态
 */
export enum ProjectStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

/**
 * 项目数据结构
 */
export interface Project {
  /** MongoDB ObjectId */
  _id?: string;
  /** 项目唯一标识符 */
  projectId: string;
  /** 项目名称 */
  projectName: string;
  /** 主密钥哈希（用于验证） */
  masterKeyHash: string;
  /** 加密后的主密钥 */
  masterKeyEncrypted: string;
  /** 盐值 */
  salt: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 项目状态 */
  status: ProjectStatus;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 创建项目选项
 */
export interface CreateProjectOptions {
  /** 项目名称 */
  projectName: string;
  /** 主密码（用于派生主密钥） */
  masterPassword: string;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 项目查询过滤器
 */
export interface ProjectFilter {
  /** 项目状态 */
  status?: ProjectStatus;
  /** 项目名称（模糊搜索） */
  projectName?: string;
}

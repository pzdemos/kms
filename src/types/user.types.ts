/**
 * 用户相关类型定义
 */

/**
 * 用户角色
 */
export enum Role {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  DEVELOPER = 'developer',
  READONLY = 'readonly',
  AUDITOR = 'auditor'
}

/**
 * 用户权限
 */
export enum Permission {
  // 项目管理
  PROJECT_CREATE = 'project:create',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',

  // 密钥管理
  KEY_CREATE = 'key:create',
  KEY_READ = 'key:read',
  KEY_UPDATE = 'key:update',
  KEY_DELETE = 'key:delete',
  KEY_LIST = 'key:list',

  // 用户管理
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // 审计
  AUDIT_READ = 'audit:read'
}

/**
 * 用户状态
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked'
}

/**
 * 用户数据结构
 */
export interface User {
  /** MongoDB ObjectId */
  _id?: string;
  /** 用户唯一标识符 */
  userId: string;
  /** 关联项目ID */
  projectId: string;
  /** 用户名 */
  username: string;
  /** 密码哈希 */
  passwordHash: string;
  /** 角色列表 */
  roles: Role[];
  /** 直接权限列表 */
  permissions: Permission[];
  /** API密钥哈希 */
  apiKeyHash?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 最后登录时间 */
  lastLoginAt?: Date;
  /** 用户状态 */
  status: UserStatus;
}

/**
 * 创建用户数据
 */
export interface CreateUserData {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 角色 */
  roles?: Role[];
  /** 直接权限 */
  permissions?: Permission[];
}

/**
 * 用户认证信息
 */
export interface AuthCredentials {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}

/**
 * 认证结果
 */
export interface AuthResult {
  /** 是否成功 */
  success: boolean;
  /** 用户信息 */
  user?: User;
  /** 错误信息 */
  error?: string;
}

/**
 * API密钥信息
 */
export interface ApiKeyInfo {
  /** API密钥（明文，仅创建时返回一次） */
  apiKey: string;
  /** API密钥哈希（存储） */
  apiKeyHash: string;
}

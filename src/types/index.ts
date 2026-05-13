/**
 * 类型定义统一导出
 */

// 加密相关
export * from './crypto.types';

// 项目相关
export * from './project.types';

// 密钥相关
export * from './key.types';

// 用户相关
export * from './user.types';

// 审计日志相关
export * from './audit.types';

/**
 * KMS客户端配置
 */
export interface KMSClientOptions {
  /** MongoDB连接字符串 */
  connectionString: string;
  /** 数据库名称 */
  databaseName: string;
  /** 连接选项 */
  connectionOptions?: {
    /** 连接超时（毫秒） */
    connectTimeoutMS?: number;
    /** Socket超时（毫秒） */
    socketTimeoutMS?: number;
    /** 服务器选择超时（毫秒） */
    serverSelectionTimeoutMS?: number;
    /** 最大连接池大小 */
    maxPoolSize?: number;
    /** 最小连接池大小 */
    minPoolSize?: number;
  };
}

/**
 * 加密的 KMS 客户端配置选项
 * 用于安全地存储数据库连接字符串
 */
export interface EncryptedKMSClientOptions {
  /** 加密的连接字符串（JSON 格式） */
  encryptedConnectionString: string;
  /** 数据库名称 */
  databaseName: string;
  /** 连接选项 */
  connectionOptions?: {
    /** 连接超时（毫秒） */
    connectTimeoutMS?: number;
    /** Socket超时（毫秒） */
    socketTimeoutMS?: number;
    /** 服务器选择超时（毫秒） */
    serverSelectionTimeoutMS?: number;
    /** 最大连接池大小 */
    maxPoolSize?: number;
    /** 最小连接池大小 */
    minPoolSize?: number;
  };
  /** 私钥（PEM 格式），默认从 KMS_PRIVATE_KEY 环境变量读取 */
  privateKey?: string;
  /** 私钥密码（如果私钥有密码保护），默认从 KMS_PRIVATE_KEY_PASSPHRASE 环境变量读取 */
  privateKeyPassphrase?: string;
}

/**
 * 错误类型
 */
export class KMSError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'KMSError';
  }
}

export class ProjectNotFoundError extends KMSError {
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`, 'PROJECT_NOT_FOUND');
    this.name = 'ProjectNotFoundError';
  }
}

export class KeyNotFoundError extends KMSError {
  constructor(keyId: string) {
    super(`Key not found: ${keyId}`, 'KEY_NOT_FOUND');
    this.name = 'KeyNotFoundError';
  }
}

export class UserNotFoundError extends KMSError {
  constructor(userId: string) {
    super(`User not found: ${userId}`, 'USER_NOT_FOUND');
    this.name = 'UserNotFoundError';
  }
}

export class AuthenticationError extends KMSError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_FAILED');
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends KMSError {
  constructor(message: string = 'Permission denied') {
    super(message, 'PERMISSION_DENIED');
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends KMSError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class CryptoError extends KMSError {
  constructor(message: string) {
    super(message, 'CRYPTO_ERROR');
    this.name = 'CryptoError';
  }
}

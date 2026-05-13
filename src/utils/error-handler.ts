/**
 * 错误处理工具
 */

import {
  KMSError,
  type ProjectNotFoundError,
  type KeyNotFoundError,
  type UserNotFoundError,
  type AuthenticationError,
  type ForbiddenError,
  type ValidationError,
  type CryptoError,
} from '../types';

// 重新导出错误类以供其他模块使用
export type {
  ProjectNotFoundError,
  KeyNotFoundError,
  UserNotFoundError,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
  CryptoError,
} from '../types';

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // 项目错误 (1xxx)
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  PROJECT_ALREADY_EXISTS = 'PROJECT_ALREADY_EXISTS',
  PROJECT_SUSPENDED = 'PROJECT_SUSPENDED',

  // 密钥错误 (2xxx)
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  KEY_ALREADY_EXISTS = 'KEY_ALREADY_EXISTS',
  KEY_EXPIRED = 'KEY_EXPIRED',
  KEY_DISABLED = 'KEY_DISABLED',

  // 用户错误 (3xxx)
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_LOCKED = 'USER_LOCKED',

  // 认证错误 (4xxx)
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  INVALID_API_KEY = 'INVALID_API_KEY',

  // 权限错误 (5xxx)
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 验证错误 (6xxx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // 加密错误 (7xxx)
  CRYPTO_ERROR = 'CRYPTO_ERROR',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',

  // 数据库错误 (8xxx)
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_FAILED = 'CONNECTION_FAILED',

  // 通用错误 (9xxx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

/**
 * 创建KMS错误
 */
export function createKMSError(code: ErrorCode, message?: string): KMSError {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.PROJECT_NOT_FOUND]: 'Project not found',
    [ErrorCode.PROJECT_ALREADY_EXISTS]: 'Project already exists',
    [ErrorCode.PROJECT_SUSPENDED]: 'Project is suspended',
    [ErrorCode.KEY_NOT_FOUND]: 'Key not found',
    [ErrorCode.KEY_ALREADY_EXISTS]: 'Key already exists',
    [ErrorCode.KEY_EXPIRED]: 'Key has expired',
    [ErrorCode.KEY_DISABLED]: 'Key is disabled',
    [ErrorCode.USER_NOT_FOUND]: 'User not found',
    [ErrorCode.USER_ALREADY_EXISTS]: 'User already exists',
    [ErrorCode.USER_LOCKED]: 'User account is locked',
    [ErrorCode.AUTHENTICATION_FAILED]: 'Authentication failed',
    [ErrorCode.INVALID_PASSWORD]: 'Invalid password',
    [ErrorCode.INVALID_API_KEY]: 'Invalid API key',
    [ErrorCode.PERMISSION_DENIED]: 'Permission denied',
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions',
    [ErrorCode.VALIDATION_ERROR]: 'Validation error',
    [ErrorCode.INVALID_INPUT]: 'Invalid input',
    [ErrorCode.MISSING_REQUIRED_FIELD]: 'Missing required field',
    [ErrorCode.CRYPTO_ERROR]: 'Cryptographic error',
    [ErrorCode.ENCRYPTION_FAILED]: 'Encryption failed',
    [ErrorCode.DECRYPTION_FAILED]: 'Decryption failed',
    [ErrorCode.DATABASE_ERROR]: 'Database error',
    [ErrorCode.CONNECTION_FAILED]: 'Connection failed',
    [ErrorCode.INTERNAL_ERROR]: 'Internal error',
    [ErrorCode.NOT_IMPLEMENTED]: 'Not implemented',
  };

  return new KMSError(message || messages[code], code);
}

/**
 * 包装异步错误
 */
export function asyncError<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof KMSError) {
        throw error;
      }
      throw createKMSError(ErrorCode.INTERNAL_ERROR, error instanceof Error ? error.message : 'Unknown error');
    }
  }) as T;
}

/**
 * 格式化错误消息
 */
export function formatErrorMessage(error: Error | KMSError): string {
  if (error instanceof KMSError) {
    return `[${error.code}] ${error.message}`;
  }
  return error.message;
}

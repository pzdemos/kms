/**
 * KMS - 密钥管理系统
 * 主入口文件
 */

// 导出主类
export { KMSClient } from './client';

// 导出所有类型
export * from './types';

// 导出错误类
export {
  KMSError,
  ProjectNotFoundError,
  KeyNotFoundError,
  UserNotFoundError,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
  CryptoError,
} from './types';

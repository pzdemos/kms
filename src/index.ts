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

// 导出加密工具（用于连接字符串加密）
export {
  generateRSAKeyPair,
  encryptConnectionString,
  decryptConnectionString,
  generateKeyId,
  isValidPEMKey,
  getPrivateKeyPassphrase,
  type RSAKeyPair,
  type EncryptedConnectionString
} from './core/asymmetric-crypto';

// 导出配置加载工具
export {
  loadEncryptedConfig,
  loadConfigFromEnvironment,
  createClientFromEncryptedConfig,
  readPrivateKeyFile,
  type EncryptedDatabaseConfig,
  type KMSClientConfig
} from './utils/config-loader';

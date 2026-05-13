/**
 * 配置加载工具
 * 用于从加密配置文件中加载连接字符串
 */

import * as fs from 'fs';
import * as path from 'path';
import { getPrivateKeyPassphrase } from '../core/asymmetric-crypto';
import {
  parseEncryptedConnectionStringConfig,
  decryptConnectionString,
  type EncryptedConnectionString
} from '../core/asymmetric-crypto';

/**
 * 加密的数据库配置
 */
export interface EncryptedDatabaseConfig {
  encryptedConnectionString: string;
  algorithm?: string;
  keyId?: string;
  createdAt?: string;
  databaseName?: string;
  connectionOptions?: {
    connectTimeoutMS?: number;
    socketTimeoutMS?: number;
    serverSelectionTimeoutMS?: number;
    maxPoolSize?: number;
    minPoolSize?: number;
  };
}

/**
 * KMS 客户端配置
 */
export interface KMSClientConfig {
  connectionString: string;
  databaseName: string;
  connectionOptions?: {
    connectTimeoutMS?: number;
    socketTimeoutMS?: number;
    serverSelectionTimeoutMS?: number;
    maxPoolSize?: number;
    minPoolSize?: number;
  };
}

/**
 * 从加密配置文件加载配置
 * @param configPath 配置文件路径
 * @param privateKeyPem 私钥（可选，默认从环境变量读取）
 * @param passphrase 私钥密码（可选，默认从环境变量读取）
 * @returns KMS 客户端配置
 */
export function loadEncryptedConfig(
  configPath: string,
  privateKeyPem?: string,
  passphrase?: string
): KMSClientConfig {
  // 读取配置文件
  const config: EncryptedDatabaseConfig = JSON.parse(
    fs.readFileSync(configPath, 'utf-8')
  );

  // 获取私钥
  const finalPrivateKeyPem = privateKeyPem || process.env.KMS_PRIVATE_KEY;
  if (!finalPrivateKeyPem) {
    throw new Error('私钥未提供。请设置 KMS_PRIVATE_KEY 环境变量或传入 privateKeyPem 参数');
  }

  // 获取密码
  const finalPassphrase = passphrase || getPrivateKeyPassphrase();

  // 解密连接字符串
  const connectionString = parseEncryptedConnectionStringConfig(
    { encryptedConnectionString: config.encryptedConnectionString },
    finalPrivateKeyPem,
    finalPassphrase
  );

  return {
    connectionString,
    databaseName: config.databaseName || 'kms',
    connectionOptions: config.connectionOptions
  };
}

/**
 * 从环境变量和文件加载配置
 * 优先级：加密配置文件 > 环境变量
 * @returns KMS 客户端配置
 */
export function loadConfigFromEnvironment(): KMSClientConfig {
  const configPath = process.env.KMS_ENCRYPTED_CONFIG_PATH;

  if (configPath && fs.existsSync(configPath)) {
    return loadEncryptedConfig(configPath);
  }

  // 回退到环境变量
  const connectionString = process.env.KMS_CONNECTION_STRING || process.env.MONGO_URL;
  if (!connectionString) {
    throw new Error('未找到连接字符串。请设置 KMS_ENCRYPTED_CONFIG_PATH 或 KMS_CONNECTION_STRING 环境变量');
  }

  return {
    connectionString,
    databaseName: process.env.KMS_DATABASE_NAME || 'kms',
    connectionOptions: {
      connectTimeoutMS: process.env.KMS_CONNECT_TIMEOUT
        ? parseInt(process.env.KMS_CONNECT_TIMEOUT, 10)
        : undefined,
      socketTimeoutMS: process.env.KMS_SOCKET_TIMEOUT
        ? parseInt(process.env.KMS_SOCKET_TIMEOUT, 10)
        : undefined,
      maxPoolSize: process.env.KMS_MAX_POOL_SIZE
        ? parseInt(process.env.KMS_MAX_POOL_SIZE, 10)
        : undefined
    }
  };
}

/**
 * 创建 KMS 客户端（从加密配置）
 * @param configPath 配置文件路径
 * @param privateKeyPem 私钥（可选）
 * @param passphrase 私钥密码（可选）
 * @returns KMS 客户端选项
 */
export function createClientFromEncryptedConfig(
  configPath: string,
  privateKeyPem?: string,
  passphrase?: string
): KMSClientConfig {
  return loadEncryptedConfig(configPath, privateKeyPem, passphrase);
}

/**
 * 读取私钥文件
 * @param filePath 私钥文件路径
 * @returns 私钥内容
 */
export function readPrivateKeyFile(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`私钥文件不存在: ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf-8');
}

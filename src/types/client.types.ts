/**
 * KMS 客户端类型定义
 */

import type { EncryptedConnectionString } from '../core/asymmetric-crypto';

/**
 * KMS 客户端配置选项
 */
export interface KMSClientOptions {
  /** MongoDB 连接字符串（明文） */
  connectionString: string;
  /** 数据库名称 */
  databaseName: string;
  /** 连接选项 */
  connectionOptions?: {
    connectTimeoutMS?: number;
    socketTimeoutMS?: number;
    serverSelectionTimeoutMS?: number;
    maxPoolSize?: number;
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
  /** 私钥（PEM 格式），默认从 KMS_PRIVATE_KEY 环境变量读取 */
  privateKey?: string;
  /** 私钥密码（如果私钥有密码保护），默认从 KMS_PRIVATE_KEY_PASSPHRASE 环境变量读取 */
  privateKeyPassphrase?: string;
  /** 连接选项 */
  connectionOptions?: {
    connectTimeoutMS?: number;
    socketTimeoutMS?: number;
    serverSelectionTimeoutMS?: number;
    maxPoolSize?: number;
    minPoolSize?: number;
  };
}

/**
 * 客户端配置（联合类型）
 */
export type ClientOptions = KMSClientOptions | EncryptedKMSClientOptions;

/**
 * 加密相关类型定义
 */

/**
 * 加密后的数据结构
 */
export interface EncryptedData {
  /** 加密后的数据（十六进制） */
  encrypted: string;
  /** 初始化向量（十六进制） */
  iv: string;
  /** 认证标签（十六进制） */
  authTag: string;
}

/**
 * 密钥派生配置
 */
export interface KeyDerivationConfig {
  /** 迭代次数 */
  iterations: number;
  /** 密钥长度（字节） */
  keyLength: number;
  /** 盐值（十六进制） */
  salt: string;
}

/**
 * 加密配置
 */
export interface EncryptionConfig {
  /** 加密算法 */
  algorithm: string;
  /** 密钥长度（字节） */
  keyLength: number;
  /** IV长度（字节） */
  ivLength: number;
}

/**
 * 项目主密钥信息
 */
export interface MasterKeyInfo {
  /** 加密后的主密钥 */
  encryptedMasterKey: string;
  /** 主密钥哈希（用于验证） */
  masterKeyHash: string;
  /** 盐值 */
  salt: string;
}

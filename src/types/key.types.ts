/**
 * 密钥相关类型定义
 */

/**
 * 密钥类型
 */
export enum KeyType {
  MONGODB = 'mongodb',
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  REDIS = 'redis',
  CUSTOM = 'custom'
}

/**
 * 密钥状态
 */
export enum KeyStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
  DELETED = 'deleted'
}

/**
 * 密钥数据结构（不含明文值）
 */
export interface Key {
  /** MongoDB ObjectId */
  _id?: string;
  /** 密钥唯一标识符 */
  keyId: string;
  /** 关联项目ID */
  projectId: string;
  /** 密钥名称 */
  keyName: string;
  /** 密钥类型 */
  keyType: KeyType;
  /** 加密后的密钥值 */
  encryptedValue: string;
  /** 初始化向量 */
  iv: string;
  /** 认证标签 */
  authTag: string;
  /** 密钥版本号 */
  version: number;
  /** 标签 */
  tags: string[];
  /** 描述 */
  description?: string;
  /** 创建者 */
  createdBy: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 最后访问时间 */
  lastAccessedAt?: Date;
  /** 最后轮换时间 */
  lastRotatedAt?: Date;
  /** 过期时间 */
  expiresAt?: Date;
  /** 密钥状态 */
  status: KeyStatus;
}

/**
 * 密钥值（包含解密后的明文）
 */
export interface KeyValue extends Omit<Key, 'encryptedValue' | 'iv' | 'authTag'> {
  /** 解密后的明文值 */
  value: string;
}

/**
 * 创建密钥数据
 */
export interface CreateKeyData {
  /** 密钥名称 */
  keyName: string;
  /** 密钥类型 */
  keyType: KeyType;
  /** 明文密钥值 */
  value: string;
  /** 标签 */
  tags?: string[];
  /** 描述 */
  description?: string;
  /** 过期时间 */
  expiresAt?: Date;
}

/**
 * 更新密钥数据
 */
export interface UpdateKeyData {
  /** 新的密钥值 */
  value?: string;
  /** 标签 */
  tags?: string[];
  /** 描述 */
  description?: string;
  /** 过期时间 */
  expiresAt?: Date;
  /** 状态 */
  status?: KeyStatus;
}

/**
 * 密钥查询过滤器
 */
export interface KeyFilters {
  /** 密钥类型 */
  keyType?: KeyType;
  /** 标签过滤（包含任一标签） */
  tags?: string[];
  /** 密钥状态 */
  status?: KeyStatus;
  /** 搜索密钥名称（模糊匹配） */
  search?: string;
}

/**
 * 密钥轮换结果
 */
export interface KeyRotationResult {
  /** 旧版本密钥 */
  oldKey: Key;
  /** 新版本密钥 */
  newKey: Key;
}

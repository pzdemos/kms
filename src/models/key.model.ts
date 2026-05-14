/**
 * 密钥数据模型
 */

import { Key, KeyValue, CreateKeyData, UpdateKeyData, KeyType, KeyStatus } from '../types';
import { generateId } from '../utils/constants';

/**
 * 创建新密钥
 */
export function createKey(
  projectId: string,
  keyData: CreateKeyData,
  encryptedData: { encrypted: string; iv: string; authTag: string },
  createdBy: string
): Key {
  const now = new Date();

  return {
    keyId: generateId('key'),
    projectId,
    keyName: keyData.keyName,
    keyType: keyData.keyType,
    encryptedValue: encryptedData.encrypted,
    iv: encryptedData.iv,
    authTag: encryptedData.authTag,
    version: 1,
    tags: keyData.tags || [],
    description: keyData.description,
    createdBy,
    createdAt: now,
    updatedAt: now,
    expiresAt: keyData.expiresAt,
    status: KeyStatus.ACTIVE,
  };
}

/**
 * 验证密钥数据
 */
export function validateKey(keyData: Partial<CreateKeyData>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!keyData.keyName || keyData.keyName.trim().length === 0) {
    errors.push('Key name is required');
  }

  if (keyData.keyName && keyData.keyName.length > 100) {
    errors.push('Key name must be less than 100 characters');
  }

  if (!keyData.keyType) {
    errors.push('Key type is required');
  }

  if (!keyData.value || keyData.value.trim().length === 0) {
    errors.push('Key value is required');
  }

  if (keyData.value && keyData.value.length > 2000) {
    errors.push('Key value must be less than 2000 characters');
  }

  if (keyData.expiresAt && keyData.expiresAt < new Date()) {
    errors.push('Expiration date must be in the future');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 更新密钥
 */
export function updateKey(key: Key, updates: UpdateKeyData, newEncryptedData?: { encrypted: string; iv: string; authTag: string }): Key {
  const updatedKey: Key = { ...key };

  if (newEncryptedData) {
    updatedKey.encryptedValue = newEncryptedData.encrypted;
    updatedKey.iv = newEncryptedData.iv;
    updatedKey.authTag = newEncryptedData.authTag;
    updatedKey.version += 1;
    updatedKey.lastRotatedAt = new Date();
  }

  if (updates.tags !== undefined) {
    updatedKey.tags = updates.tags;
  }

  if (updates.description !== undefined) {
    updatedKey.description = updates.description;
  }

  if (updates.expiresAt !== undefined) {
    updatedKey.expiresAt = updates.expiresAt;
  }

  if (updates.status !== undefined) {
    updatedKey.status = updates.status;
  }

  updatedKey.updatedAt = new Date();

  return updatedKey;
}

/**
 * 转换密钥为KeyValue（包含解密值）
 */
export function toKeyValue(key: Key, decryptedValue: string): KeyValue {
  const { encryptedValue, iv, authTag, ...keyValue } = key;
  return {
    ...keyValue,
    value: decryptedValue,
  };
}

/**
 * 检查密钥是否已过期
 */
export function isKeyExpired(key: Key): boolean {
  return key.expiresAt != null && key.expiresAt < new Date();
}

/**
 * 检查密钥是否可用
 */
export function isKeyAccessible(key: Key): boolean {
  if (key.status !== KeyStatus.ACTIVE) {
    return false;
  }

  if (isKeyExpired(key)) {
    return false;
  }

  return true;
}

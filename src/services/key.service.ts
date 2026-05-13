/**
 * 密钥服务
 * 负责密钥的业务逻辑
 */

import { KeyRepository } from '../repositories/key.repository';
import { AuditService } from './audit.service';
import { PermissionService } from './permission.service';
import { CryptoService } from '../core/crypto.service';
import {
  Key,
  KeyValue,
  CreateKeyData,
  UpdateKeyData,
  KeyFilters,
  KeyType,
} from '../types';
import { createKey, updateKey, validateKey, toKeyValue, isKeyAccessible } from '../models/key.model';
import { ValidationError, KeyNotFoundError } from '../types';
import { AuditAction, ResourceType, Permission } from '../types';
import { bufferToHex, hexToBuffer } from '../core/crypto';

export class KeyService {
  constructor(
    private keyRepo: KeyRepository,
    private auditService: AuditService,
    private permissionService: PermissionService,
    private cryptoService: CryptoService
  ) {}

  /**
   * 创建密钥
   */
  async createKey(
    projectId: string,
    userId: string,
    masterPassword: string,
    keyData: CreateKeyData
  ): Promise<Key> {
    // 验证权限
    await this.permissionService.requirePermission(projectId, userId, Permission.KEY_CREATE);

    // 验证密钥数据
    const validation = validateKey(keyData);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    // 检查密钥名称是否已存在
    const existingKey = await this.keyRepo.findByProjectAndName(
      projectId,
      keyData.keyName
    );
    if (existingKey) {
      throw new ValidationError('Key with this name already exists');
    }

    // 加密密钥值
    const masterKeyHex = await this.getMasterKey(projectId, masterPassword);
    const masterKey = hexToBuffer(masterKeyHex);
    const encryptedData = await this.cryptoService.encryptKey(keyData.value, masterKey);

    // 创建密钥
    const key = createKey(projectId, keyData, encryptedData, userId);

    await this.keyRepo.insertOne(key as any);

    // 记录审计日志
    await this.auditService.logKeyCreated(
      projectId,
      userId,
      key.keyId,
      key.keyName,
      key.keyType,
      true
    );

    return key;
  }

  /**
   * 获取密钥（解密）
   */
  async getKey(
    projectId: string,
    userId: string,
    masterPassword: string,
    keyId: string
  ): Promise<KeyValue> {
    // 验证权限
    await this.permissionService.requirePermission(projectId, userId, Permission.KEY_READ);

    // 获取密钥
    const key = await this.keyRepo.findByKeyId(keyId);
    if (!key) {
      throw new KeyNotFoundError(keyId);
    }

    // 验证项目
    if (key.projectId !== projectId) {
      throw new ValidationError('Key does not belong to this project');
    }

    // 检查密钥是否可访问
    if (!isKeyAccessible(key)) {
      throw new ValidationError('Key is not accessible');
    }

    // 解密密钥值
    const masterKeyHex = await this.getMasterKey(projectId, masterPassword);
    const masterKey = hexToBuffer(masterKeyHex);
    const decryptedValue = await this.cryptoService.decryptKey(
      key.encryptedValue,
      key.iv,
      key.authTag,
      masterKey
    );

    // 更新最后访问时间
    await this.keyRepo.updateLastAccessed(keyId);

    // 记录审计日志
    await this.auditService.logKeyRead(projectId, userId, keyId, key.keyName, true);

    return toKeyValue(key, decryptedValue);
  }

  /**
   * 列出密钥
   */
  async listKeys(
    projectId: string,
    userId: string,
    filters?: KeyFilters,
    options?: { page?: number; limit?: number }
  ): Promise<{ keys: Key[]; total: number }> {
    // 验证权限
    await this.permissionService.requirePermission(projectId, userId, Permission.KEY_LIST);

    return await this.keyRepo.findByProjectId(projectId, filters, options);
  }

  /**
   * 更新密钥
   */
  async updateKey(
    projectId: string,
    userId: string,
    masterPassword: string,
    keyId: string,
    updates: UpdateKeyData
  ): Promise<Key> {
    // 验证权限
    await this.permissionService.requirePermission(projectId, userId, Permission.KEY_UPDATE);

    const key = await this.keyRepo.getByKeyId(keyId);

    // 验证项目
    if (key.projectId !== projectId) {
      throw new ValidationError('Key does not belong to this project');
    }

    let newEncryptedData;

    // 如果更新密钥值，需要重新加密
    if (updates.value) {
      const masterKeyHex = await this.getMasterKey(projectId, masterPassword);
      const masterKey = hexToBuffer(masterKeyHex);
      newEncryptedData = await this.cryptoService.encryptKey(updates.value, masterKey);
    }

    const updatedKey = updateKey(key, updates, newEncryptedData);

    await this.keyRepo.updateKey(keyId, updatedKey);

    return updatedKey;
  }

  /**
   * 删除密钥
   */
  async deleteKey(projectId: string, userId: string, keyId: string): Promise<void> {
    // 验证权限
    await this.permissionService.requirePermission(projectId, userId, Permission.KEY_DELETE);

    const key = await this.keyRepo.getByKeyId(keyId);

    // 验证项目
    if (key.projectId !== projectId) {
      throw new ValidationError('Key does not belong to this project');
    }

    await this.keyRepo.softDeleteKey(keyId);

    // 记录审计日志
    await this.auditService.logKeyDeleted(projectId, userId, keyId, key.keyName, true);
  }

  /**
   * 获取项目主密钥（需要从项目服务获取）
   */
  private async getMasterKey(projectId: string, masterPassword: string): Promise<string> {
    // 这里需要调用ProjectService来获取主密钥
    // 为了避免循环依赖，我们将这个方法标记为private，实际使用时需要注入ProjectService
    // 或者将密钥派生逻辑提取到独立的模块
    throw new Error('Master key retrieval not implemented - use ProjectService');
  }
}

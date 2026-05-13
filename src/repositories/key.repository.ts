/**
 * 密钥仓储
 * 负责密钥的数据访问
 */

import { BaseRepository } from './base.repository';
import { Key, KeyFilters, KeyStatus, KeyType } from '../types';
import { KeyNotFoundError } from '../types';

export class KeyRepository extends BaseRepository<Key> {
  constructor(db: any) {
    super(db, 'keys');
    this.initializeIndexes();
  }

  /**
   * 初始化索引
   */
  private async initializeIndexes(): Promise<void> {
    await this.createIndexes([
      { keyId: 1 },
      { projectId: 1 },
      { keyName: 1 },
      { projectId: 1, keyName: 1 },
      { keyType: 1 },
      { status: 1 },
      { tags: 1 },
      { expiresAt: 1 },
      { createdAt: -1 },
    ]);
  }

  /**
   * 根据密钥ID查找
   */
  async findByKeyId(keyId: string): Promise<Key | null> {
    return await this.findOne({ keyId } as any);
  }

  /**
   * 根据密钥ID查找，如果不存在则抛出错误
   */
  async getByKeyId(keyId: string): Promise<Key> {
    const key = await this.findByKeyId(keyId);
    if (!key) {
      throw new KeyNotFoundError(keyId);
    }
    return key;
  }

  /**
   * 根据项目ID和密钥名称查找
   */
  async findByProjectAndName(projectId: string, keyName: string): Promise<Key | null> {
    return await this.findOne({ projectId, keyName } as any);
  }

  /**
   * 查询项目的所有密钥
   */
  async findByProjectId(
    projectId: string,
    filters?: KeyFilters,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ keys: Key[]; total: number }> {
    const query: any = { projectId };

    if (filters?.keyType) {
      query.keyType = filters.keyType;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters?.search) {
      query.keyName = { $regex: filters.search, $options: 'i' };
    }

    const total = await this.count(query);

    const skip = options?.page && options?.limit ? (options.page - 1) * options.limit : 0;
    const limit = options?.limit || 100;

    const keys = await this.findMany(query, {
      sort: { createdAt: -1 },
      skip,
      limit,
    });

    return { keys, total };
  }

  /**
   * 更新密钥
   */
  async updateKey(keyId: string, updates: Partial<Key>): Promise<boolean> {
    return await this.updateOne(
      { keyId } as any,
      { $set: { ...updates, updatedAt: new Date() } }
    );
  }

  /**
   * 删除密钥（软删除）
   */
  async softDeleteKey(keyId: string): Promise<boolean> {
    return await this.updateOne(
      { keyId } as any,
      { $set: { status: KeyStatus.DELETED, updatedAt: new Date() } }
    );
  }

  /**
   * 永久删除密钥
   */
  async hardDeleteKey(keyId: string): Promise<boolean> {
    return await this.deleteOne({ keyId } as any);
  }

  /**
   * 批量查询密钥
   */
  async findByKeyIds(keyIds: string[]): Promise<Key[]> {
    return await this.findMany({ keyId: { $in: keyIds } } as any);
  }

  /**
   * 更新密钥最后访问时间
   */
  async updateLastAccessed(keyId: string): Promise<boolean> {
    return await this.updateOne(
      { keyId } as any,
      { $set: { lastAccessedAt: new Date() } }
    );
  }

  /**
   * 查询过期密钥
   */
  async findExpiredKeys(projectId?: string): Promise<Key[]> {
    const query: any = {
      expiresAt: { $lt: new Date() },
      status: { $ne: KeyStatus.DELETED },
    };

    if (projectId) {
      query.projectId = projectId;
    }

    return await this.findMany(query);
  }
}

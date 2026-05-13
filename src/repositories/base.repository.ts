/**
 * 基础仓储类
 * 提供通用的数据库操作
 */

import { MongoClient, Db, Collection, ObjectId, Filter, UpdateFilter, Document } from 'mongodb';
import type { KMSError } from '../types';
import { createKMSError, ErrorCode } from '../utils/error-handler';

/**
 * 基础仓储类
 */
export abstract class BaseRepository<T extends Document> {
  protected db: Db;
  protected collectionName: string;

  constructor(db: Db, collectionName: string) {
    this.db = db;
    this.collectionName = collectionName;
  }

  /**
   * 获取集合
   */
  protected getCollection(): Collection<T> {
    return this.db.collection(this.collectionName);
  }

  /**
   * 创建索引
   */
  protected async createIndexes(indexes: Record<string, 1 | -1>[]): Promise<void> {
    const collection = this.getCollection();
    for (const index of indexes) {
      await collection.createIndex(index);
    }
  }

  /**
   * 插入单个文档
   */
  async insertOne(document: T): Promise<T> {
    const collection = this.getCollection();
    const result = await collection.insertOne(document as any);
    return { ...document, _id: result.insertedId.toString() } as T;
  }

  /**
   * 查询单个文档
   */
  async findOne(filter: Filter<T>): Promise<T | null> {
    const collection = this.getCollection();
    return await collection.findOne(filter) as T | null;
  }

  /**
   * 查询多个文档
   */
  async findMany(
    filter: Filter<T> = {},
    options?: {
      sort?: Record<string, 1 | -1>;
      limit?: number;
      skip?: number;
    }
  ): Promise<T[]> {
    const collection = this.getCollection();
    let query = collection.find(filter);

    if (options?.sort) {
      query = query.sort(options.sort);
    }

    if (options?.skip) {
      query = query.skip(options.skip);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query.toArray() as T[];
  }

  /**
   * 更新单个文档
   */
  async updateOne(filter: Filter<T>, update: UpdateFilter<T>): Promise<boolean> {
    const collection = this.getCollection();
    const result = await collection.updateOne(filter, update);
    return result.modifiedCount > 0;
  }

  /**
   * 删除单个文档
   */
  async deleteOne(filter: Filter<T>): Promise<boolean> {
    const collection = this.getCollection();
    const result = await collection.deleteOne(filter);
    return result.deletedCount > 0;
  }

  /**
   * 统计文档数量
   */
  async count(filter: Filter<T> = {}): Promise<number> {
    const collection = this.getCollection();
    return await collection.countDocuments(filter);
  }

  /**
   * 检查文档是否存在
   */
  async exists(filter: Filter<T>): Promise<boolean> {
    const count = await this.count(filter);
    return count > 0;
  }
}

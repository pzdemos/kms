/**
 * 用户仓储
 * 负责用户的数据访问
 */

import { BaseRepository } from './base.repository';
import { User, UserStatus } from '../types';
import { UserNotFoundError } from '../types';

export class UserRepository extends BaseRepository<User> {
  constructor(db: any) {
    super(db, 'users');
    this.initializeIndexes();
  }

  /**
   * 初始化索引
   */
  private async initializeIndexes(): Promise<void> {
    await this.createIndexes([
      { userId: 1 },
      { projectId: 1 },
      { username: 1 },
      { projectId: 1, username: 1 },
      { status: 1 },
      { apiKeyHash: 1 },
      { createdAt: -1 },
    ]);
  }

  /**
   * 根据用户ID查找
   */
  async findByUserId(userId: string): Promise<User | null> {
    return await this.findOne({ userId } as any);
  }

  /**
   * 根据用户ID查找，如果不存在则抛出错误
   */
  async getByUserId(userId: string): Promise<User> {
    const user = await this.findByUserId(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    return user;
  }

  /**
   * 根据项目ID和用户名查找
   */
  async findByProjectAndUsername(projectId: string, username: string): Promise<User | null> {
    return await this.findOne({ projectId, username } as any);
  }

  /**
   * 查询项目的所有用户
   */
  async findByProjectId(projectId: string): Promise<User[]> {
    return await this.findMany({ projectId } as any, { sort: { createdAt: -1 } });
  }

  /**
   * 根据API密钥哈希查找用户
   */
  async findByApiKeyHash(apiKeyHash: string): Promise<User | null> {
    return await this.findOne({ apiKeyHash } as any);
  }

  /**
   * 更新用户
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    return await this.updateOne(
      { userId } as any,
      { $set: { ...updates, updatedAt: new Date() } }
    );
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(userId: string): Promise<boolean> {
    return await this.updateOne(
      { userId } as any,
      { $set: { lastLoginAt: new Date() } }
    );
  }

  /**
   * 锁定用户
   */
  async lockUser(userId: string): Promise<boolean> {
    return await this.updateOne(
      { userId } as any,
      { $set: { status: UserStatus.LOCKED, updatedAt: new Date() } }
    );
  }

  /**
   * 激活用户
   */
  async activateUser(userId: string): Promise<boolean> {
    return await this.updateOne(
      { userId } as any,
      { $set: { status: UserStatus.ACTIVE, updatedAt: new Date() } }
    );
  }

  /**
   * 删除用户（软删除）
   */
  async softDeleteUser(userId: string): Promise<boolean> {
    return await this.updateOne(
      { userId } as any,
      { $set: { status: UserStatus.INACTIVE, updatedAt: new Date() } }
    );
  }

  /**
   * 永久删除用户
   */
  async hardDeleteUser(userId: string): Promise<boolean> {
    return await this.deleteOne({ userId } as any);
  }
}

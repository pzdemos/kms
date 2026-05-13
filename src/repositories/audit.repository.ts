/**
 * 审计日志仓储
 * 负责审计日志的数据访问
 */

import { BaseRepository } from './base.repository';
import { AuditLog, AuditQuery, AuditAction, ResourceType, AuditSeverity } from '../types';

export class AuditRepository extends BaseRepository<AuditLog> {
  constructor(db: any) {
    super(db, 'audit_logs');
    this.initializeIndexes();
  }

  /**
   * 初始化索引
   */
  private async initializeIndexes(): Promise<void> {
    await this.createIndexes([
      { projectId: 1 },
      { userId: 1 },
      { action: 1 },
      { resourceType: 1 },
      { resourceId: 1 },
      { timestamp: -1 },
      { severity: 1 },
      { projectId: 1, timestamp: -1 },
      { userId: 1, timestamp: -1 },
    ]);
  }

  /**
   * 查询审计日志
   */
  async findAuditLogs(
    projectId: string,
    query: AuditQuery
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const filter: any = { projectId };

    if (query.startDate) {
      filter.timestamp = { ...filter.timestamp, $gte: query.startDate };
    }

    if (query.endDate) {
      filter.timestamp = { ...filter.timestamp, $lte: query.endDate };
    }

    if (query.action) {
      filter.action = query.action;
    }

    if (query.resourceType) {
      filter.resourceType = query.resourceType;
    }

    if (query.userId) {
      filter.userId = query.userId;
    }

    if (query.severity) {
      filter.severity = query.severity;
    }

    if (query.success !== undefined) {
      filter['details.success'] = query.success;
    }

    const total = await this.count(filter);

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const logs = await this.findMany(filter, {
      sort: { timestamp: -1 },
      skip,
      limit,
    });

    return { logs, total };
  }

  /**
   * 查询最近的审计日志
   */
  async findRecentLogs(
    projectId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    return await this.findMany(
      { projectId } as any,
      { sort: { timestamp: -1 }, limit }
    );
  }

  /**
   * 统计特定操作的次数
   */
  async countByAction(
    projectId: string,
    action: AuditAction,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const filter: any = { projectId, action };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
    }

    return await this.count(filter);
  }

  /**
   * 统计失败的登录尝试
   */
  async countFailedLogins(
    projectId: string,
    userId?: string,
    since?: Date
  ): Promise<number> {
    const filter: any = {
      projectId,
      action: AuditAction.LOGIN_FAILED,
    };

    if (userId) {
      filter.userId = userId;
    }

    if (since) {
      filter.timestamp = { $gte: since };
    }

    return await this.count(filter);
  }

  /**
   * 删除旧日志（用于归档）
   */
  async deleteOldLogs(beforeDate: Date): Promise<number> {
    const collection = this.getCollection();
    const result = await collection.deleteMany({
      timestamp: { $lt: beforeDate },
    });
    return result.deletedCount;
  }
}

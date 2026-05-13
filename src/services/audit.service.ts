/**
 * 审计服务
 * 负责记录和查询审计日志
 */

import { AuditRepository } from '../repositories/audit.repository';
import { AuditLog, AuditQuery, AuditAction, ResourceType } from '../types';
import { createAuditLog } from '../models/audit.model';

export class AuditService {
  constructor(private auditRepo: AuditRepository) {}

  /**
   * 记录审计日志
   */
  async log(data: {
    projectId: string;
    userId?: string;
    action: AuditAction;
    resourceType: ResourceType;
    resourceId: string;
    details: {
      keyName?: string;
      keyType?: string;
      ipAddress?: string;
      userAgent?: string;
      success: boolean;
      errorMessage?: string;
      [key: string]: any;
    };
  }): Promise<void> {
    const log = createAuditLog(data);
    await this.auditRepo.insertOne(log as any);
  }

  /**
   * 查询审计日志
   */
  async getAuditLogs(projectId: string, query: AuditQuery): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const result = await this.auditRepo.findAuditLogs(projectId, query);
    return {
      logs: result.logs,
      total: result.total,
      page: query.page || 1,
      limit: query.limit || 50,
    };
  }

  /**
   * 获取最近的审计日志
   */
  async getRecentLogs(projectId: string, limit: number = 100): Promise<AuditLog[]> {
    return await this.auditRepo.findRecentLogs(projectId, limit);
  }

  /**
   * 统计失败登录次数
   */
  async countFailedLogins(projectId: string, userId?: string, since?: Date): Promise<number> {
    return await this.auditRepo.countFailedLogins(projectId, userId, since);
  }

  /**
   * 记录项目创建
   */
  async logProjectCreated(
    projectId: string,
    userId: string,
    projectName: string,
    success: boolean
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      action: AuditAction.CREATE_PROJECT,
      resourceType: ResourceType.PROJECT,
      resourceId: projectId,
      details: {
        keyName: projectName,
        success,
      },
    });
  }

  /**
   * 记录密钥创建
   */
  async logKeyCreated(
    projectId: string,
    userId: string,
    keyId: string,
    keyName: string,
    keyType: string,
    success: boolean
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      action: AuditAction.CREATE_KEY,
      resourceType: ResourceType.KEY,
      resourceId: keyId,
      details: {
        keyName,
        keyType,
        success,
      },
    });
  }

  /**
   * 记录密钥读取
   */
  async logKeyRead(
    projectId: string,
    userId: string,
    keyId: string,
    keyName: string,
    success: boolean
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      action: AuditAction.READ_KEY,
      resourceType: ResourceType.KEY,
      resourceId: keyId,
      details: {
        keyName,
        success,
      },
    });
  }

  /**
   * 记录密钥删除
   */
  async logKeyDeleted(
    projectId: string,
    userId: string,
    keyId: string,
    keyName: string,
    success: boolean
  ): Promise<void> {
    await this.log({
      projectId,
      userId,
      action: AuditAction.DELETE_KEY,
      resourceType: ResourceType.KEY,
      resourceId: keyId,
      details: {
        keyName,
        success,
      },
    });
  }
}

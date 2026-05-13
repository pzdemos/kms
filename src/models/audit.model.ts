/**
 * 审计日志数据模型
 */

import { AuditLog, AuditSeverity, AuditAction, ResourceType } from '../types';
import { generateId } from '../utils/constants';

/**
 * 创建审计日志
 */
export function createAuditLog(data: {
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
}): AuditLog {
  const timestamp = new Date();

  return {
    _id: generateId('audit'),
    projectId: data.projectId,
    userId: data.userId,
    action: data.action,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    details: {
      ...data.details,
    },
    timestamp,
    severity: calculateSeverity(data.action, data.details.success),
  };
}

/**
 * 计算日志严重级别
 */
export function calculateSeverity(action: AuditAction, success: boolean): AuditSeverity {
  if (!success) {
    const criticalActions = [
      AuditAction.DELETE_PROJECT,
      AuditAction.DELETE_KEY,
      AuditAction.LOGIN_FAILED,
    ];
    const warningActions = [
      AuditAction.UPDATE_KEY,
      AuditAction.UPDATE_PROJECT,
      AuditAction.PERMISSION_DENIED,
    ];

    if (criticalActions.includes(action)) {
      return AuditSeverity.CRITICAL;
    }
    if (warningActions.includes(action)) {
      return AuditSeverity.WARNING;
    }
    return AuditSeverity.ERROR;
  }

  // 成功的操作
  const criticalActions = [
    AuditAction.DELETE_PROJECT,
    AuditAction.DELETE_KEY,
    AuditAction.DELETE_USER,
  ];

  if (criticalActions.includes(action)) {
    return AuditSeverity.CRITICAL;
  }

  return AuditSeverity.INFO;
}

/**
 * 格式化审计日志详情
 */
export function formatAuditDetails(details: {
  keyName?: string;
  keyType?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  [key: string]: any;
}): string {
  const parts: string[] = [];

  if (details.keyName) {
    parts.push(`Key: ${details.keyName}`);
  }

  if (details.keyType) {
    parts.push(`Type: ${details.keyType}`);
  }

  if (details.ipAddress) {
    parts.push(`IP: ${details.ipAddress}`);
  }

  if (!details.success && details.errorMessage) {
    parts.push(`Error: ${details.errorMessage}`);
  }

  return parts.join(' | ');
}

/**
 * 审计日志相关类型定义
 */

/**
 * 操作类型
 */
export enum AuditAction {
  // 项目操作
  CREATE_PROJECT = 'CREATE_PROJECT',
  UPDATE_PROJECT = 'UPDATE_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',

  // 密钥操作
  CREATE_KEY = 'CREATE_KEY',
  READ_KEY = 'READ_KEY',
  UPDATE_KEY = 'UPDATE_KEY',
  DELETE_KEY = 'DELETE_KEY',
  LIST_KEYS = 'LIST_KEYS',
  ROTATE_KEY = 'ROTATE_KEY',

  // 用户操作
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  GRANT_ROLE = 'GRANT_ROLE',
  REVOKE_ROLE = 'REVOKE_ROLE',

  // 认证操作
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',

  // 权限
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

/**
 * 资源类型
 */
export enum ResourceType {
  PROJECT = 'project',
  KEY = 'key',
  USER = 'user'
}

/**
 * 日志严重级别
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 审计日志数据结构
 */
export interface AuditLog {
  /** MongoDB ObjectId */
  _id?: string;
  /** 项目ID */
  projectId: string;
  /** 操作用户ID */
  userId?: string;
  /** 操作类型 */
  action: AuditAction;
  /** 资源类型 */
  resourceType: ResourceType;
  /** 资源ID */
  resourceId: string;
  /** 操作详情 */
  details: AuditDetails;
  /** 时间戳 */
  timestamp: Date;
  /** 严重级别 */
  severity: AuditSeverity;
}

/**
 * 审计日志详情
 */
export interface AuditDetails {
  /** 密钥名称 */
  keyName?: string;
  /** 密钥类型 */
  keyType?: string;
  /** IP地址 */
  ipAddress?: string;
  /** User Agent */
  userAgent?: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  errorMessage?: string;
  /** 额外信息 */
  [key: string]: any;
}

/**
 * 审计日志查询参数
 */
export interface AuditQuery {
  /** 开始时间 */
  startDate?: Date;
  /** 结束时间 */
  endDate?: Date;
  /** 操作类型 */
  action?: AuditAction;
  /** 资源类型 */
  resourceType?: ResourceType;
  /** 用户ID */
  userId?: string;
  /** 严重级别 */
  severity?: AuditSeverity;
  /** 是否成功 */
  success?: boolean;
  /** 分页：页码 */
  page?: number;
  /** 分页：每页数量 */
  limit?: number;
}

/**
 * 审计日志查询结果
 */
export interface AuditQueryResult {
  /** 日志列表 */
  logs: AuditLog[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页数量 */
  limit: number;
}

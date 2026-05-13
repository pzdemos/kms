/**
 * 系统常量定义
 */

import { Role, Permission } from '../types';

/**
 * 安全配置常量
 */
export const SECURITY_CONFIG = {
  // 密钥派生配置
  KEY_DERIVATION: {
    ALGORITHM: 'pbkdf2',
    ITERATIONS: 100000,
    KEY_LENGTH: 32, // 256 bits
    DIGEST: 'sha256',
  },

  // 加密配置
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_LENGTH: 32, // 256 bits
    IV_LENGTH: 16, // 128 bits
    AUTH_TAG_LENGTH: 16, // 128 bits
  },

  // 密码策略
  PASSWORD_POLICY: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
  },

  // 速率限制
  RATE_LIMITING: {
    WINDOW_MS: 15 * 60 * 1000, // 15分钟
    MAX_REQUESTS: 100,
  },

  // API密钥长度
  API_KEY_LENGTH: 64,
} as const;

/**
 * 角色-权限映射
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.KEY_CREATE,
    Permission.KEY_READ,
    Permission.KEY_UPDATE,
    Permission.KEY_DELETE,
    Permission.KEY_LIST,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.AUDIT_READ,
  ],
  [Role.OPERATOR]: [
    Permission.KEY_READ,
    Permission.KEY_UPDATE,
    Permission.KEY_LIST,
    Permission.AUDIT_READ,
  ],
  [Role.DEVELOPER]: [Permission.KEY_READ, Permission.KEY_LIST],
  [Role.READONLY]: [Permission.KEY_LIST],
  [Role.AUDITOR]: [Permission.AUDIT_READ],
};

/**
 * 密钥类型列表
 */
export const KEY_TYPES = ['mongodb', 'mysql', 'postgresql', 'redis', 'custom'] as const;

/**
 * 集合名称
 */
export const COLLECTIONS = {
  PROJECTS: 'projects',
  KEYS: 'keys',
  USERS: 'users',
  AUDIT_LOGS: 'audit_logs',
} as const;

/**
 * ID生成器
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}${random}`;
}

/**
 * 密码强度验证
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const policy = SECURITY_CONFIG.PASSWORD_POLICY;

  if (password.length < policy.MIN_LENGTH) {
    errors.push(`Password must be at least ${policy.MIN_LENGTH} characters long`);
  }

  if (policy.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy.REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (policy.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

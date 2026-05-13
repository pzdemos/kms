/**
 * 用户数据模型
 */

import { User, CreateUserData, Role, UserStatus } from '../types';
import { generateId } from '../utils/constants';

/**
 * 创建新用户
 */
export function createUser(
  projectId: string,
  userData: CreateUserData,
  passwordHash: string,
  apiKeyHash?: string
): User {
  const now = new Date();

  return {
    userId: generateId('user'),
    projectId,
    username: userData.username,
    passwordHash,
    roles: userData.roles || [],
    permissions: userData.permissions || [],
    apiKeyHash,
    createdAt: now,
    updatedAt: now,
    status: UserStatus.ACTIVE,
  };
}

/**
 * 验证用户数据
 */
export function validateUser(userData: Partial<CreateUserData>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!userData.username || userData.username.trim().length === 0) {
    errors.push('Username is required');
  }

  if (userData.username && (userData.username.length < 3 || userData.username.length > 50)) {
    errors.push('Username must be between 3 and 50 characters');
  }

  if (!userData.password || userData.password.length === 0) {
    errors.push('Password is required');
  }

  if (userData.roles && userData.roles.length === 0) {
    errors.push('At least one role is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 更新用户最后登录时间
 */
export function updateLastLogin(user: User): User {
  return {
    ...user,
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * 锁定用户
 */
export function lockUser(user: User): User {
  return {
    ...user,
    status: UserStatus.LOCKED,
    updatedAt: new Date(),
  };
}

/**
 * 激活用户
 */
export function activateUser(user: User): User {
  return {
    ...user,
    status: UserStatus.ACTIVE,
    updatedAt: new Date(),
  };
}

/**
 * 添加角色
 */
export function addRole(user: User, role: Role): User {
  if (user.roles.includes(role)) {
    return user;
  }

  return {
    ...user,
    roles: [...user.roles, role],
    updatedAt: new Date(),
  };
}

/**
 * 移除角色
 */
export function removeRole(user: User, role: Role): User {
  return {
    ...user,
    roles: user.roles.filter((r) => r !== role),
    updatedAt: new Date(),
  };
}

/**
 * 添加权限
 */
export function addPermission(user: User, permission: string): User {
  if (user.permissions.includes(permission as any)) {
    return user;
  }

  return {
    ...user,
    permissions: [...user.permissions, permission as any],
    updatedAt: new Date(),
  };
}

/**
 * 移除权限
 */
export function removePermission(user: User, permission: string): User {
  return {
    ...user,
    permissions: user.permissions.filter((p) => p !== permission),
    updatedAt: new Date(),
  };
}

/**
 * 转换用户为安全格式（不包含敏感信息）
 */
export function toSafeUser(user: User): Omit<User, 'passwordHash' | 'apiKeyHash'> {
  const { passwordHash, apiKeyHash, ...safeUser } = user;
  return safeUser;
}

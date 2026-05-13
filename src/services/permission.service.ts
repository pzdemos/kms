/**
 * 权限服务
 * 负责权限验证和访问控制
 */

import { UserRepository } from '../repositories/user.repository';
import { AuditService } from './audit.service';
import { Role, Permission, ForbiddenError, AuditAction, ResourceType } from '../types';
import { ROLE_PERMISSIONS } from '../utils/constants';

export class PermissionService {
  constructor(
    private userRepo: UserRepository,
    private auditService: AuditService
  ) {}

  /**
   * 检查用户是否拥有指定权限
   */
  async checkPermission(
    projectId: string,
    userId: string,
    requiredPermission: Permission
  ): Promise<boolean> {
    const user = await this.userRepo.findByProjectAndUsername(projectId, userId);

    if (!user) {
      return false;
    }

    if (user.status !== 'active') {
      return false;
    }

    // 检查直接权限
    if (user.permissions.includes(requiredPermission)) {
      return true;
    }

    // 检查角色权限
    for (const role of user.roles) {
      const rolePermissions = ROLE_PERMISSIONS[role];
      if (rolePermissions?.includes(requiredPermission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 要求用户必须拥有指定权限，否则抛出异常
   */
  async requirePermission(
    projectId: string,
    userId: string,
    requiredPermission: Permission
  ): Promise<void> {
    const hasPermission = await this.checkPermission(
      projectId,
      userId,
      requiredPermission
    );

    if (!hasPermission) {
      await this.auditService.log({
        projectId,
        userId,
        action: AuditAction.PERMISSION_DENIED,
        resourceType: ResourceType.KEY,
        resourceId: requiredPermission,
        details: {
          success: false,
          errorMessage: `User ${userId} does not have permission: ${requiredPermission}`,
        },
      });

      throw new ForbiddenError(`User does not have required permission: ${requiredPermission}`);
    }
  }

  /**
   * 检查用户是否拥有指定角色
   */
  async hasRole(projectId: string, userId: string, role: Role): Promise<boolean> {
    const user = await this.userRepo.findByProjectAndUsername(projectId, userId);

    if (!user) {
      return false;
    }

    return user.roles.includes(role);
  }

  /**
   * 授予角色
   */
  async grantRole(
    projectId: string,
    adminUserId: string,
    targetUserId: string,
    role: Role
  ): Promise<void> {
    // 验证管理员权限
    await this.requirePermission(projectId, adminUserId, Permission.USER_UPDATE);

    const user = await this.userRepo.findByProjectAndUsername(projectId, targetUserId);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.roles.includes(role)) {
      return; // 已经拥有该角色
    }

    await this.userRepo.updateUser(user.userId!, {
      roles: [...user.roles, role],
    });

    await this.auditService.log({
      projectId,
      userId: adminUserId,
      action: AuditAction.GRANT_ROLE,
      resourceType: ResourceType.USER,
      resourceId: user.userId!,
      details: {
        success: true,
      },
    });
  }

  /**
   * 撤销角色
   */
  async revokeRole(
    projectId: string,
    adminUserId: string,
    targetUserId: string,
    role: Role
  ): Promise<void> {
    // 验证管理员权限
    await this.requirePermission(projectId, adminUserId, Permission.USER_UPDATE);

    const user = await this.userRepo.findByProjectAndUsername(projectId, targetUserId);

    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepo.updateUser(user.userId!, {
      roles: user.roles.filter((r) => r !== role),
    });

    await this.auditService.log({
      projectId,
      userId: adminUserId,
      action: AuditAction.REVOKE_ROLE,
      resourceType: ResourceType.USER,
      resourceId: user.userId!,
      details: {
        success: true,
      },
    });
  }

  /**
   * 获取用户的所有权限（包括角色权限）
   */
  async getUserPermissions(projectId: string, userId: string): Promise<Permission[]> {
    const user = await this.userRepo.findByProjectAndUsername(projectId, userId);

    if (!user) {
      return [];
    }

    const permissions = new Set<Permission>(user.permissions);

    // 添加角色权限
    for (const role of user.roles) {
      const rolePermissions = ROLE_PERMISSIONS[role] || [];
      rolePermissions.forEach((p) => permissions.add(p));
    }

    return Array.from(permissions);
  }
}

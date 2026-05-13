/**
 * KMS客户端主类
 * 对外API接口
 */

import { MongoClient, Db } from 'mongodb';
import {
  KMSClientOptions,
  Project,
  Key,
  KeyValue,
  CreateKeyData,
  UpdateKeyData,
  KeyFilters,
  CreateUserData,
  Role,
  User,
  AuditLog,
  AuditQuery,
} from './types';
import { CryptoService } from './core/crypto.service';
import { ProjectRepository } from './repositories/project.repository';
import { KeyRepository } from './repositories/key.repository';
import { UserRepository } from './repositories/user.repository';
import { AuditRepository } from './repositories/audit.repository';
import { ProjectService } from './services/project.service';
import { KeyService } from './services/key.service';
import { AuthService } from './services/auth.service';
import { PermissionService } from './services/permission.service';
import { AuditService } from './services/audit.service';
import { KMSError, ErrorCode, createKMSError } from './utils/error-handler';

/**
 * KMS客户端类
 */
export class KMSClient {
  private mongoClient: MongoClient;
  private db: Db;
  private cryptoService: CryptoService;
  private projectRepo: ProjectRepository;
  private keyRepo: KeyRepository;
  private userRepo: UserRepository;
  private auditRepo: AuditRepository;
  private projectService: ProjectService;
  private keyService: KeyService;
  private authService: AuthService;
  private permissionService: PermissionService;
  private auditService: AuditService;
  private connected: boolean = false;
  private currentUserId: string | null = null;

  constructor(private options: KMSClientOptions) {
    this.mongoClient = new MongoClient(this.options.connectionString, {
      connectTimeoutMS: this.options.connectionOptions?.connectTimeoutMS || 10000,
      socketTimeoutMS: this.options.connectionOptions?.socketTimeoutMS || 30000,
      serverSelectionTimeoutMS:
        this.options.connectionOptions?.serverSelectionTimeoutMS || 10000,
      maxPoolSize: this.options.connectionOptions?.maxPoolSize || 10,
      minPoolSize: this.options.connectionOptions?.minPoolSize || 0,
    });
  }

  /**
   * 连接到数据库
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      await this.mongoClient.connect();
      this.db = this.mongoClient.db(this.options.databaseName);
      this.connected = true;

      // 初始化服务和仓储
      this.initializeServices();

      // 创建索引
      await this.initializeIndexes();
    } catch (error) {
      throw createKMSError(
        ErrorCode.CONNECTION_FAILED,
        error instanceof Error ? error.message : 'Failed to connect to database'
      );
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.mongoClient.close();
      this.connected = false;
    }
  }

  /**
   * 初始化服务
   */
  private initializeServices(): void {
    this.cryptoService = new CryptoService();
    this.projectRepo = new ProjectRepository(this.db);
    this.keyRepo = new KeyRepository(this.db);
    this.userRepo = new UserRepository(this.db);
    this.auditRepo = new AuditRepository(this.db);
    this.auditService = new AuditService(this.auditRepo);
    this.permissionService = new PermissionService(this.userRepo, this.auditService);
    this.projectService = new ProjectService(
      this.projectRepo,
      this.userRepo,
      this.auditService,
      this.cryptoService
    );
    this.authService = new AuthService(this.userRepo, this.auditService);
    this.keyService = new KeyService(
      this.keyRepo,
      this.auditService,
      this.permissionService,
      this.cryptoService
    );
  }

  /**
   * 初始化数据库索引
   */
  private async initializeIndexes(): Promise<void> {
    // 索引在Repository的构造函数中自动创建
  }

  /**
   * 设置当前用户（用于权限验证）
   */
  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * 获取当前用户ID
   */
  private getCurrentUserId(): string {
    if (!this.currentUserId) {
      throw createKMSError(ErrorCode.AUTHENTICATION_FAILED, 'No user context set');
    }
    return this.currentUserId;
  }

  // ============ 项目管理 ============

  /**
   * 创建项目
   */
  async createProject(
    projectName: string,
    masterPassword: string,
    metadata?: Record<string, any>
  ): Promise<Project> {
    await this.ensureConnected();

    const userId = this.getCurrentUserId();
    return await this.projectService.createProject(
      { projectName, masterPassword, metadata },
      userId
    );
  }

  /**
   * 获取项目
   */
  async getProject(projectId: string): Promise<Project> {
    await this.ensureConnected();
    return await this.projectService.getProject(projectId);
  }

  /**
   * 列出所有项目
   */
  async listProjects(): Promise<Project[]> {
    await this.ensureConnected();
    return await this.projectService.listProjects();
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.ensureConnected();

    const userId = this.getCurrentUserId();
    await this.projectService.deleteProject(projectId, userId);
  }

  // ============ 密钥管理 ============

  /**
   * 创建密钥
   */
  async createKey(
    projectId: string,
    masterPassword: string,
    keyData: CreateKeyData
  ): Promise<Key> {
    await this.ensureConnected();

    const userId = this.getCurrentUserId();
    return await this.keyService.createKey(projectId, userId, masterPassword, keyData);
  }

  /**
   * 获取密钥（解密）
   */
  async getKey(
    projectId: string,
    masterPassword: string,
    keyId: string
  ): Promise<KeyValue> {
    await this.ensureConnected();

    const userId = this.getCurrentUserId();
    return await this.keyService.getKey(projectId, userId, masterPassword, keyId);
  }

  /**
   * 列出密钥
   */
  async listKeys(
    projectId: string,
    filters?: KeyFilters,
    options?: { page?: number; limit?: number }
  ): Promise<{ keys: Key[]; total: number }> {
    await this.ensureConnected();

    const userId = this.getCurrentUserId();
    return await this.keyService.listKeys(projectId, userId, filters, options);
  }

  /**
   * 更新密钥
   */
  async updateKey(
    projectId: string,
    masterPassword: string,
    keyId: string,
    updates: UpdateKeyData
  ): Promise<Key> {
    await this.ensureConnected();

    const userId = this.getCurrentUserId();
    return await this.keyService.updateKey(projectId, userId, masterPassword, keyId, updates);
  }

  /**
   * 删除密钥
   */
  async deleteKey(projectId: string, keyId: string): Promise<void> {
    await this.ensureConnected();

    const userId = this.getCurrentUserId();
    await this.keyService.deleteKey(projectId, userId, keyId);
  }

  // ============ 用户管理 ============

  /**
   * 创建用户
   */
  async createUser(
    projectId: string,
    userData: CreateUserData
  ): Promise<Omit<User, 'passwordHash' | 'apiKeyHash'>> {
    await this.ensureConnected();

    const userId = this.getCurrentUserId();
    return await this.authService.createUser(projectId, userId, userData);
  }

  /**
   * 用户登录
   */
  async login(projectId: string, username: string, password: string): Promise<boolean> {
    await this.ensureConnected();

    const result = await this.authService.login(projectId, { username, password });

    if (result.success && result.user) {
      this.setCurrentUser(result.user.userId!);
    }

    return result.success;
  }

  /**
   * 授予角色
   */
  async grantRole(projectId: string, userId: string, role: Role): Promise<void> {
    await this.ensureConnected();

    const currentUserId = this.getCurrentUserId();
    await this.permissionService.grantRole(projectId, currentUserId, userId, role);
  }

  /**
   * 撤销角色
   */
  async revokeRole(projectId: string, userId: string, role: Role): Promise<void> {
    await this.ensureConnected();

    const currentUserId = this.getCurrentUserId();
    await this.permissionService.revokeRole(projectId, currentUserId, userId, role);
  }

  // ============ 审计日志 ============

  /**
   * 获取审计日志
   */
  async getAuditLogs(
    projectId: string,
    query: AuditQuery
  ): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number }> {
    await this.ensureConnected();
    return await this.auditService.getAuditLogs(projectId, query);
  }

  /**
   * 获取最近的审计日志
   */
  async getRecentLogs(projectId: string, limit: number = 100): Promise<AuditLog[]> {
    await this.ensureConnected();
    return await this.auditService.getRecentLogs(projectId, limit);
  }

  /**
   * 确保已连接
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      throw createKMSError(ErrorCode.CONNECTION_FAILED, 'Client not connected. Call connect() first.');
    }
  }
}

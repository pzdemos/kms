#!/usr/bin/env node
/**
 * KMS CLI - 交互式命令行工具
 *
 * 用于管理密钥、项目、用户等
 *
 * 使用方法：
 *   node cli/kms.ts
 *   或
 *   npm link 后直接使用 kms 命令
 */

import * as readline from 'readline';
import { MongoClient, Db } from 'mongodb';
import { KMSClient, KeyType } from '../src';
import * as fs from 'fs';
import * as path from 'path';

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

interface CLIOptions {
  connectionString: string;
  databaseName: string;
}

class KMSCLI {
  private kms: KMSClient | null = null;
  private currentUserId: string = 'cli_user';
  private options: CLIOptions;

  constructor(options: CLIOptions) {
    this.options = options;
  }

  /**
   * 显示主菜单
   */
  async showMainMenu(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 KMS - 密钥管理系统 CLI');
    console.log('='.repeat(60));
    console.log('\n请选择操作：');
    console.log('  1. 项目管理');
    console.log('  2. 密钥管理');
    console.log('  3. 用户管理');
    console.log('  4. 审计日志');
    console.log('  5. 系统设置');
    console.log('  0. 退出');
    console.log('');

    const answer = await this.question('请输入选项 (0-5): ');

    switch (answer.trim()) {
      case '1':
        await this.projectMenu();
        break;
      case '2':
        await this.keyMenu();
        break;
      case '3':
        await this.userMenu();
        break;
      case '4':
        await this.auditMenu();
        break;
      case '5':
        await this.settingsMenu();
        break;
      case '0':
        console.log('\n👋 再见！');
        process.exit(0);
      default:
        console.log('\n❌ 无效选项，请重新选择');
        await this.showMainMenu();
    }
  }

  /**
   * 项目管理菜单
   */
  async projectMenu(): Promise<void> {
    console.log('\n📁 项目管理');
    console.log('-'.repeat(40));
    console.log('  1. 创建新项目');
    console.log('  2. 查看所有项目');
    console.log('  3. 删除项目');
    console.log('  0. 返回主菜单');
    console.log('');

    const answer = await this.question('请选择操作 (0-3): ');

    switch (answer.trim()) {
      case '1':
        await this.createProject();
        break;
      case '2':
        await this.listProjects();
        break;
      case '3':
        await this.deleteProject();
        break;
      case '0':
        await this.showMainMenu();
        break;
      default:
        console.log('❌ 无效选项');
        await this.projectMenu();
    }
  }

  /**
   * 密钥管理菜单
   */
  async keyMenu(): Promise<void> {
    console.log('\n🔑 密钥管理');
    console.log('-'.repeat(40));
    console.log('  1. 创建密钥');
    console.log('  2. 查看所有密钥');
    console.log('  3. 获取密钥值');
    console.log(' 4. 更新密钥');
    console.log(' 5. 删除密钥');
    console.log('  6. 按标签搜索');
    console.log('  0. 返回主菜单');
    console.log('');

    const answer = await this.question('请选择操作 (0-6): ');

    switch (answer.trim()) {
      case '1':
        await this.createKey();
        break;
      case '2':
        await this.listKeys();
        break;
      case '3':
        await this.getKey();
        break;
      case '4':
        await this.updateKey();
        break;
      case '5':
        await this.deleteKey();
        break;
      case '6':
        await this.searchKeys();
        break;
      case '0':
        await this.showMainMenu();
        break;
      default:
        console.log('❌ 无效选项');
        await this.keyMenu();
    }
  }

  /**
   * 用户管理菜单
   */
  async userMenu(): Promise<void> {
    console.log('\n👥 用户管理');
    console.log('-'.repeat(40));
    console.log('  1. 创建用户');
    console.log('  2. 查看用户列表');
    console.log('  3. 删除用户');
    console.log('  0. 返回主菜单');
    console.log('');

    const answer = await this.question('请选择操作 (0-3): ');

    switch (answer.trim()) {
      case '1':
        await this.createUser();
        break;
      case '2':
        await this.listUsers();
        break;
      case '3':
        await this.deleteUser();
        break;
      case '0':
        await this.showMainMenu();
        break;
      default:
        console.log('❌ 无效选项');
        await this.userMenu();
    }
  }

  /**
   * 审计日志菜单
   */
  async auditMenu(): Promise<void> {
    console.log('\n📝 审计日志');
    console.log('-'.repeat(40));
    console.log('  1. 查看最近日志');
    console.log('  2. 搜索日志');
    console.log('  0. 返回主菜单');
    console.log('');

    const answer = await this.question('请选择操作 (0-2): ');

    switch (answer.trim()) {
      case '1':
        await this.getRecentLogs();
        break;
      case '2':
        await this.searchAuditLogs();
        break;
      case '0':
        await this.showMainMenu();
        break;
      default:
        console.log('❌ 无效选项');
        await this.auditMenu();
    }
  }

  /**
   * 系统设置菜单
   */
  async settingsMenu(): Promise<void> {
    console.log('\n⚙️  系统设置');
    console.log('-'.repeat(40));
    console.log('  1. 切换数据库连接');
    console.log('  2. 生成加密密钥对');
    console.log('  3. 查看当前配置');
    console.log('  0. 返回主菜单');
    console.log('');

    const answer = await this.question('请选择操作 (0-3): ');

    switch (answer.trim()) {
      case '1':
        await this.switchConnection();
        break;
      case '2':
        await this.generateKeyPair();
        break;
      case '3':
        this.showCurrentConfig();
        await this.pressEnter();
        await this.settingsMenu();
        break;
      case '0':
        await this.showMainMenu();
        break;
      default:
        console.log('❌ 无效选项');
        await this.settingsMenu();
    }
  }

  // ============ 项目管理功能 ============

  /**
   * 创建项目
   */
  async createProject(): Promise<void> {
    console.log('\n➕ 创建新项目');
    console.log('-'.repeat(40));

    const projectName = await this.question('项目名称: ', true);
    if (!projectName) {
      console.log('❌ 项目名称不能为空');
      return await this.projectMenu();
    }

    const masterPassword = await this.question('主密码 (用于加密项目密钥): ', true);
    if (!masterPassword || masterPassword.length < 8) {
      console.log('❌ 主密码至少需要 8 个字符');
      return await this.projectMenu();
    }

    const confirm = await this.question('确认创建? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ 已取消');
      return await this.projectMenu();
    }

    try {
      await this.ensureConnected();
      this.kms!.setCurrentUser(this.currentUserId);

      const metadata: Record<string, any> = {};
      const env = await this.question('环境 (dev/staging/prod): ');
      if (env) metadata.environment = env;

      const project = await this.kms!.createProject(projectName, masterPassword, metadata);

      console.log('\n✅ 项目创建成功！');
      console.log(`   项目 ID: ${project.projectId}`);
      console.log(`   项目名称: ${project.projectName}`);

      await this.pressEnter();
    } catch (error: any) {
      console.log(`\n❌ 创建失败: ${error.message}`);
    }

    await this.projectMenu();
  }

  /**
   * 查看所有项目
   */
  async listProjects(): Promise<void> {
    console.log('\n📋 项目列表');
    console.log('-'.repeat(40));

    try {
      await this.ensureConnected();
      const projects = await this.kms!.listProjects();

      if (projects.length === 0) {
        console.log('   暂无项目');
        await this.pressEnter();
        return await this.projectMenu();
      }

      console.log(`\n共 ${projects.length} 个项目:\n`);

      projects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.projectName}`);
        console.log(`   ID: ${project.projectId}`);
        console.log(`   状态: ${project.status}`);
        if (project.metadata) {
          console.log(`   元数据: ${JSON.stringify(project.metadata)}`);
        }
        console.log('');
      });

    } catch (error: any) {
      console.log(`\n❌ 查询失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.projectMenu();
  }

  /**
   * 删除项目
   */
  async deleteProject(): Promise<void> {
    console.log('\n🗑️  删除项目');
    console.log('-'.repeat(40));

    try {
      await this.ensureConnected();
      const projects = await this.kms!.listProjects();

      if (projects.length === 0) {
        console.log('   暂无项目');
        await this.pressEnter();
        return await this.projectMenu();
      }

      // 显示项目列表
      console.log('\n选择要删除的项目:\n');
      projects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.projectName} (${project.projectId})`);
      });

      const index = await this.question('\n请输入项目编号: ');
      const project = projects[parseInt(index) - 1];

      if (!project) {
        console.log('❌ 无效选择');
        await this.pressEnter();
        return await this.projectMenu();
      }

      const confirm = await this.question(`\n确认删除项目 "${project.projectName}"? 此操作不可恢复! (yes/no): `);
      if (confirm !== 'yes') {
        console.log('❌ 已取消');
        return await this.projectMenu();
      }

      await this.kms!.setCurrentUser(this.currentUserId);
      await this.kms!.deleteProject(project.projectId);

      console.log('\n✅ 项目已删除');

    } catch (error: any) {
      console.log(`\n❌ 删除失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.projectMenu();
  }

  // ============ 密钥管理功能 ============

  /**
   * 创建密钥
   */
  async createKey(): Promise<void> {
    console.log('\n🔑 创建密钥');
    console.log('-'.repeat(40));

    try {
      await this.ensureConnected();

      // 选择项目
      const projects = await this.kms!.listProjects();
      if (projects.length === 0) {
        console.log('❌ 请先创建项目');
        await this.pressEnter();
        return await this.keyMenu();
      }

      console.log('\n选择项目:\n');
      projects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.projectName}`);
      });

      const projectIndex = await this.question('\n请输入项目编号: ');
      const project = projects[parseInt(projectIndex) - 1];
      if (!project) {
        console.log('❌ 无效选择');
        await this.pressEnter();
        return await this.keyMenu();
      }

      // 输入密钥信息
      const keyName = await this.question('密钥名称: ', true);
      const keyType = await this.selectKeyType();
      const value = await this.question('密钥值 (连接字符串): ', true);
      const description = await this.question('描述: ');

      const tags = await this.question('标签 (逗号分隔，可选): ');
      const tagArray = tags ? tags.split(',').map(t => t.trim()) : [];

      const masterPassword = await this.question('项目主密码: ', true);

      const confirm = await this.question('\n确认创建? (y/n): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('❌ 已取消');
        return await this.keyMenu();
      }

      this.kms!.setCurrentUser(this.currentUserId);

      const key = await this.kms!.createKey(project.projectId, masterPassword, {
        keyName,
        keyType,
        value,
        description: description || undefined,
        tags: tagArray
      });

      console.log('\n✅ 密钥创建成功！');
      console.log(`   密钥 ID: ${key.keyId}`);
      console.log(`   密钥类型: ${key.keyType}`);

    } catch (error: any) {
      console.log(`\n❌ 创建失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.keyMenu();
  }

  /**
   * 查看所有密钥
   */
  async listKeys(): Promise<void> {
    console.log('\n📋 密钥列表');
    console.log('-'.repeat(40));

    try {
      const projectId = await this.selectProject();
      if (!projectId) return await this.keyMenu();

      this.kms!.setCurrentUser(this.currentUserId);

      const { keys, total } = await this.kms!.listKeys(projectId);

      if (total === 0) {
        console.log('   暂无密钥');
        await this.pressEnter();
        return await this.keyMenu();
      }

      console.log(`\n共 ${total} 个密钥:\n`);

      keys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.keyName}`);
        console.log(`   ID: ${key.keyId}`);
        console.log(`   类型: ${key.keyType}`);
        console.log(`   状态: ${key.status}`);
        console.log(`   标签: ${key.tags.join(', ') || '无'}`);
        console.log(`   描述: ${key.description || '无'}`);
        console.log('');
      });

    } catch (error: any) {
      console.log(`\n❌ 查询失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.keyMenu();
  }

  /**
   * 获取密钥值
   */
  async getKey(): Promise<void> {
    console.log('\n🔓 获取密钥值');
    console.log('-'.repeat(40));

    try {
      const projectId = await this.selectProject();
      if (!projectId) return await this.keyMenu();

      const { keys, total } = await this.kms!.listKeys(projectId);

      if (total === 0) {
        console.log('   暂无密钥');
        await this.pressEnter();
        return await this.keyMenu();
      }

      console.log('\n选择密钥:\n');
      keys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.keyName} (${key.keyType})`);
      });

      const index = await this.question('\n请输入密钥编号: ');
      const key = keys[parseInt(index) - 1];
      if (!key) {
        console.log('❌ 无效选择');
        await this.pressEnter();
        return await this.keyMenu();
      }

      const masterPassword = await this.question('\n项目主密码: ', true);

      this.kms!.setCurrentUser(this.currentUserId);

      const keyValue = await this.kms!.getKey(projectId, masterPassword, key.keyId);

      console.log('\n✅ 密钥值:');
      console.log('   ' + keyValue.value);
      console.log('\n⚠️  请妥善保管密钥值，不要分享给他人！');

    } catch (error: any) {
      console.log(`\n❌ 获取失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.keyMenu();
  }

  /**
   * 更新密钥
   */
  async updateKey(): Promise<void> {
    console.log('\n✏️ 更新密钥');
    console.log('-'.repeat(40));

    try {
      const projectId = await this.selectProject();
      if (!projectId) return await this.keyMenu();

      const { keys, total } = await this.kms!.listKeys(projectId);

      if (total === 0) {
        console.log('   暂无密钥');
        await this.pressEnter();
        return await this.keyMenu();
      }

      console.log('\n选择要更新的密钥:\n');
      keys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.keyName}`);
      });

      const index = await this.question('\n请输入密钥编号: ');
      const key = keys[parseInt(index) - 1];
      if (!key) {
        console.log('❌ 无效选择');
        await this.pressEnter();
        return await this.keyMenu();
      }

      console.log('\n输入新信息 (留空保持不变):');
      const description = await this.question('新描述: ');
      const tags = await this.question('新标签 (逗号分隔): ');

      this.kms!.setCurrentUser(this.currentUserId);

      const updates: any = {};
      if (description) updates.description = description;
      if (tags) updates.tags = tags.split(',').map(t => t.trim());

      const masterPassword = await this.question('\n项目主密码: ', true);

      const updatedKey = await this.kms!.updateKey(projectId, masterPassword, key.keyId, updates);

      console.log('\n✅ 密钥更新成功！');

    } catch (error: any) {
      console.log(`\n❌ 更新失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.keyMenu();
  }

  /**
   * 删除密钥
   */
  async deleteKey(): Promise<void> {
    console.log('\n🗑️ 删除密钥');
    console.log('-'.repeat(40));

    try {
      const projectId = await this.selectProject();
      if (!projectId) return await this.keyMenu();

      const { keys, total } = await this.kms!.listKeys(projectId);

      if (total === 0) {
        console.log('   暂无密钥');
        await this.pressEnter();
        return await this.keyMenu();
      }

      console.log('\n选择要删除的密钥:\n');
      keys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.keyName}`);
      });

      const index = await this.question('\n请输入密钥编号: ');
      const key = keys[parseInt(index) - 1];
      if (!key) {
        console.log('❌ 无效选择');
        await this.pressEnter();
        return await this.keyMenu();
      }

      const confirm = await this.question(`\n确认删除密钥 "${key.keyName}"? (yes/no): `);
      if (confirm !== 'yes') {
        console.log('❌ 已取消');
        return await this.keyMenu();
      }

      this.kms!.setCurrentUser(this.currentUserId);
      await this.kms!.deleteKey(projectId, key.keyId);

      console.log('\n✅ 密钥已删除');

    } catch (error: any) {
      console.log(`\n❌ 删除失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.keyMenu();
  }

  /**
   * 搜索密钥
   */
  async searchKeys(): Promise<void> {
    console.log('\n🔍 搜索密钥');
    console.log('-'.repeat(40));

    try {
      const projectId = await this.selectProject();
      if (!projectId) return await this.keyMenu();

      const search = await this.question('搜索关键词: ');
      const tagFilter = await this.question('过滤标签 (可选): ');

      this.kms!.setCurrentUser(this.currentUserId);

      const filters: any = {};
      if (search) filters.search = search;
      if (tagFilter) {
        filters.tags = tagFilter.split(',').map(t => t.trim());
      }

      const { keys, total } = await this.kms!.listKeys(projectId, filters);

      console.log(`\n找到 ${total} 个匹配的密钥:\n`);

      keys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.keyName}`);
        console.log(`   类型: ${key.keyType}`);
        console.log(`   标签: ${key.tags.join(', ') || '无'}`);
        console.log('');
      });

    } catch (error: any) {
      console.log(`\n❌ 搜索失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.keyMenu();
  }

  // ============ 用户管理功能 ============

  /**
   * 创建用户
   */
  async createUser(): Promise<void> {
    console.log('\n👤 创建用户');
    console.log('-'.repeat(40));

    try {
      await this.ensureConnected();

      const projectId = await this.selectProject();
      if (!projectId) return await this.userMenu();

      const username = await this.question('用户名: ', true);
      const password = await this.question('密码: ', true);

      console.log('\n选择角色 (可多选，用逗号分隔):');
      console.log('  1. admin - 管理员 (所有权限)');
      console.log('  2. operator - 运维人员 (读取、更新密钥)');
      console.log('  3. developer - 开发人员 (读取密钥)');
      console.log('  4. readonly - 只读用户 (列出密钥)');
      console.log('  5. auditor - 审计员 (查看日志)');

      const rolesAnswer = await this.question('\n输入角色编号 (如 1,2,3): ');
      const roleMap: any = {
        '1': 'admin',
        '2': 'operator',
        '3': 'developer',
        '4': 'readonly',
        '5': 'auditor'
      };

      const selectedRoles = rolesAnswer.split(',')
        .map(n => roleMap[n.trim()])
        .filter(r => r);

      this.kms!.setCurrentUser(this.currentUserId);

      const user = await this.kms!.createUser(projectId, {
        username,
        password,
        roles: selectedRoles
      });

      console.log('\n✅ 用户创建成功！');
      console.log(`   用户 ID: ${user.userId}`);
      console.log(`   用户名: ${user.username}`);
      console.log(`   角色: ${user.roles.join(', ')}`);
      if ((user as any).apiKey) {
        console.log(`   API 密钥: ${(user as any).apiKey} (仅显示一次，请妥善保管)`);
      }

    } catch (error: any) {
      console.log(`\n❌ 创建失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.userMenu();
  }

  /**
   * 查看用户列表
   */
  async listUsers(): Promise<void> {
    console.log('\n👥 用户列表');
    console.log('-'.repeat(40));

    try {
      const projectId = await this.selectProject();
      if (!projectId) return await this.userMenu();

      this.kms!.setCurrentUser(this.currentUserId);

      // 通过审计日志获取用户信息
      const logs = await this.kms!.getAuditLogs(projectId, { limit: 100 });
      const userActions = new Set();

      logs.logs.forEach(log => {
        if (log.action === 'CREATE_USER' && log.details.success) {
          const userId = log.resourceId;
          // 从日志中获取更多信息
          userActions.add(userId);
        }
      });

      // 简化显示 - 实际应用中需要查询用户表
      console.log(`\n📊 项目用户统计: ${userActions.size} 个用户`);
      console.log('\n提示: 详细用户列表请使用 MongoDB 客户端查看');

    } catch (error: any) {
      console.log(`\n❌ 查询失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.userMenu();
  }

  /**
   * 删除用户
   */
  async deleteUser(): Promise<void> {
    console.log('\n🗑️ 删除用户');
    console.log('-'.repeat(40));

    console.log('⚠️  此功能需要直接在 MongoDB 中操作');
    console.log('   使用: db.users.deleteMany({ projectId: "your-project-id" })');
    console.log('   然后运行: db.users.deleteMany({ projectId: "your-project-id" })');

    await this.pressEnter();
    await this.userMenu();
  }

  // ============ 审计日志功能 ============

  /**
   * 获取最近日志
   */
  async getRecentLogs(): Promise<void> {
    console.log('\n📝 最近日志');
    console.log('-'.repeat(40));

    try {
      const projectId = await this.selectProject();
      if (!projectId) return await this.auditMenu();

      const limit = 20;
      const logs = await this.kms!.getRecentLogs(projectId, limit);

      console.log(`\n最近 ${logs.length} 条操作:\n`);

      logs.forEach((log, index) => {
        const time = new Date(log.timestamp).toLocaleString();
        const status = log.details.success ? '✅' : '❌';
        console.log(`${index + 1}. ${status} [${time}] ${log.action}`);
      });

    } catch (error: any) {
      console.log(`\n❌ 查询失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.auditMenu();
  }

  /**
   * 搜索审计日志
   */
  async searchAuditLogs(): Promise<void> {
    console.log('\n🔍 搜索审计日志');
    console.log('-'.repeat(40));

    try {
      const projectId = await this.selectProject();
      if (!projectId) return await this.auditMenu();

      const action = await this.question('操作类型 (如 key.create, user.login): ');

      this.kms!.setCurrentUser(this.currentUserId);

      // 简化显示 - 实际需要更多功能
      const logs = await this.kms!.getAuditLogs(projectId, { limit: 100 });
      const filtered = logs.logs.filter(log => log.action.includes(action));

      console.log(`\n找到 ${filtered.length} 条匹配的日志\n`);

      filtered.forEach((log, index) => {
        const time = new Date(log.timestamp).toLocaleString();
        const status = log.details.success ? '✅' : '❌';
        console.log(`${index + 1}. ${status} [${time}] ${log.action}`);
        console.log(`   操作者: ${log.userId || 'unknown'}`);
      });

    } catch (error: any) {
      console.log(`\n❌ 搜索失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.auditMenu();
  }

  // ============ 系统设置功能 ============

  /**
   * 切换数据库连接
   */
  async switchConnection(): Promise<void> {
    console.log('\n🔗 切换数据库连接');
    console.log('-'.repeat(40));

    const newConnectionString = await this.question('新连接字符串: ', true);
    const newDatabaseName = await this.question('数据库名称: ', true);

    try {
      // 测试连接
      const mongoClient = new MongoClient(newConnectionString);
      await mongoClient.connect();
      const db = mongoClient.db(newDatabaseName);
      await db.command({ ping: 1 });
      await mongoClient.close();

      // 更新连接
      if (this.kms) {
        await this.kms.disconnect();
      }

      this.options.connectionString = newConnectionString;
      this.options.databaseName = newDatabaseName;

      console.log('\n✅ 连接测试成功！');
      console.log(`   连接字符串: ${newConnectionString}`);
      console.log(`   数据库: ${newDatabaseName}`);

      // 保存配置
      await this.saveConfig();

    } catch (error: any) {
      console.log(`\n❌ 连接失败: ${error.message}`);
    }

    await this.pressEnter();
    await this.settingsMenu();
  }

  /**
   * 生成加密密钥对
   */
  async generateKeyPair(): Promise<void> {
    console.log('\n🔑 生成 RSA 加密密钥对');
    console.log('-'.repeat(40));

    const passphrase = await this.question('私钥密码 (可选，推荐设置): ');

    console.log('\n正在生成密钥对...\n');

    // 导入密钥生成函数
    const { generateRSAKeyPair } = require('../src/core/asymmetric-crypto');
    const keyPair = generateRSAKeyPair(passphrase || undefined);

    console.log('✅ 密钥对生成成功！\n');

    console.log('公钥 (可存储在代码库中):');
    console.log('```');
    console.log(keyPair.publicKey);
    console.log('```\n');

    console.log('私钥 (请妥善保管，不要提交到代码库):');
    console.log('```');
    console.log(keyPair.privateKey);
    console.log('```\n');

    console.log('💡 使用建议:');
    console.log('1. 将公钥保存为 config/public_key.pem');
    console.log('2. 将私钥保存到安全位置（如密钥管理服务）');
    console.log('3. 使用私钥加密连接字符串，然后可以安全提交到代码库');

    await this.pressEnter();
    await this.settingsMenu();
  }

  /**
   * 查看当前配置
   */
  showCurrentConfig(): void {
    console.log('\n⚙️ 当前配置');
    console.log('-'.repeat(40));
    console.log(`连接字符串: ${this.options.connectionString}`);
    console.log(`数据库名称: ${this.options.databaseName}`);
    console.log(`当前用户: ${this.currentUserId}`);
  }

  // ============ 辅助方法 ============

  /**
   * 确保已连接
   */
  public async ensureConnected(): Promise<void> {
    if (!this.kms) {
      this.kms = new KMSClient(this.options);
    }

    // 简单检查 - 实际应该有更好的连接状态跟踪
    try {
      await this.kms.connect();
    } catch {
      // 已经连接，忽略错误
    }
  }

  /**
   * 选择项目
   */
  private async selectProject(): Promise<string | null> {
    await this.ensureConnected();
    const projects = await this.kms!.listProjects();

    if (projects.length === 0) {
      console.log('   暂无可用项目');
      return null;
    }

    console.log('\n可用项目:\n');
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.projectName}`);
    });

    const index = await this.question('\n请选择项目编号 (0 取消): ');
    const num = parseInt(index);

    if (isNaN(num) || num === 0) return null;

    const project = projects[num - 1];
    return project.projectId;
  }

  /**
   * 选择密钥类型
   */
  private async selectKeyType(): Promise<KeyType> {
    console.log('\n选择密钥类型:\n');
    console.log('1. mongodb');
    console.log('2. mysql');
    console.log('3. postgresql');
    console.log('4. redis');
    console.log('5. custom');

    const types = [KeyType.MONGODB, KeyType.MYSQL, KeyType.POSTGRESQL, KeyType.REDIS, KeyType.CUSTOM];
    const index = await this.question('\n请选择密钥类型 (1-5): ');

    const num = parseInt(index);
    if (num < 1 || num > 5) {
      throw new Error('无效选择');
    }

    return types[num - 1];
  }

  /**
   * 保存配置
   */
  private async saveConfig(): Promise<void> {
    // TODO: 实现配置持久化
    console.log('\n💡 提示: 可以将配置保存到 ~/.kms/config.json');
  }

  /**
   * 等待用户按回车
   */
  private async pressEnter(): Promise<void> {
    await this.question('\n按回车继续...');
  }

  /**
   * 提问并获取答案
   */
  private question(query: string, required = false): Promise<string> {
    return new Promise((resolve) => {
      rl.question(query, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

/**
 * 从命令行参数获取数据库配置
 */
function getDatabaseConfigFromArgs(args: string[]): CLIOptions | null {
  if (args.length === 0) return null;

  const config: CLIOptions = {
    connectionString: '',
    databaseName: 'kms'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--connection' || arg === '-c') {
      config.connectionString = args[++i];
    } else if (arg === '--database' || arg === '-d') {
      config.databaseName = args[++i];
    }
  }

  if (!config.connectionString) {
    return null;
  }

  return config;
}

/**
 * 创建配置文件路径
 */
function getConfigPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    throw new Error('无法确定用户主目录');
  }

  const configDir = path.join(homeDir, '.kms');
  return path.join(configDir, 'config.json');
}

/**
 * 从配置文件加载配置
 */
function loadConfigFromFile(): CLIOptions | null {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config;
  } catch (error) {
    console.error(`配置文件加载失败: ${error}`);
    return null;
  }
}

/**
 * 保存配置到文件
 */
function saveConfigToFile(config: CLIOptions): void {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
}

// ============================================================
// 主程序入口
// ============================================================

async function main() {
  console.log('\n🔐 KMS CLI - 密钥管理系统命令行工具\n');

  // 尝试从文件加载配置
  let options = loadConfigFromFile();

  // 尝试从命令行参数获取配置
  if (!options) {
    options = getDatabaseConfigFromArgs(process.argv.slice(2));
  }

  // 如果都没有，使用默认值并提示
  if (!options) {
    console.log('💡 提示: 可以通过以下方式配置数据库连接：');
    console.log('   1. 命令行参数: kms --connection <string> --database <name>');
    console.log('   2. 配置文件: ~/.kms/config.json');
    console.log('   3. 交互输入: 启动后选择 "系统设置" → "切换连接"\n');

    // 询问配置
    const connectionString = await question('MongoDB 连接字符串 (mongodb://localhost:27017): ', true);
    if (!connectionString) {
      console.log('\n❌ 连接字符串不能为空');
      process.exit(1);
    }

    options = {
      connectionString,
      databaseName: 'kms'
    };

    // 询问是否保存配置
    const saveConfig = await question('\n是否保存配置到 ~/.kms/config.json? (y/n): ');
    if (saveConfig.toLowerCase() === 'y') {
      saveConfigToFile(options);
      console.log('✅ 配置已保存');
    }
  }

  // 创建 CLI 实例
  const cli = new KMSCLI(options);

  try {
    await cli.ensureConnected();
    await cli.showMainMenu();
  } catch (error: any) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

function question(query: string, required = false): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      const result = answer.trim();
      if (required && !result) {
        console.log('此字段不能为空');
        resolve(question(query, required));
        return;
      }
      resolve(result);
    });
  });
}

// 运行 CLI
main();

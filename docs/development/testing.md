# KMS 项目测试指南

## 已完成的功能

### 1. 核心功能
- ✅ 项目管理（创建、查看、删除）
- ✅ 密钥管理（创建、查看、更新、删除、搜索）
- ✅ 用户管理（创建用户、角色分配）
- ✅ 审计日志（查看、搜索）
- ✅ 权限系统（基于角色的访问控制）
- ✅ 加密存储（AES-256-GCM）
- ✅ 主密钥派生（PBKDF2）

### 2. CLI 工具
- ✅ 交互式菜单系统
- ✅ 项目管理菜单
- ✅ 密钥管理菜单
- ✅ 用户管理菜单
- ✅ 审计日志菜单
- ✅ 系统设置菜单
- ✅ 配置文件支持（~/.kms/config.json）

### 3. 文档
- ✅ README.md（项目介绍）
- ✅ QUICKSTART.md（快速入门）
- ✅ CLI_GUIDE.md（CLI 使用指南）
- ✅ 完整的 API 文档结构

### 4. 修复的问题
- ✅ KeyService 主密钥获取问题
- ✅ 权限检查逻辑（支持 username 和 userId）
- ✅ 项目创建时自动创建管理员用户
- ✅ CLI 工具的各种语法错误

## 测试步骤

### 1. 构建

```bash
# 构建主项目
npm run build

# 构建 CLI 工具
npm run build:cli
```

### 2. 测试 CLI 工具

```bash
# 方式 1: 直接运行
node dist/cli/kms.js

# 方式 2: 全局链接后运行
npm link
kms

# 方式 3: 使用 npx
npx @pengzi/kms
```

### 3. 功能测试流程

#### 测试项目创建
1. 启动 CLI 工具
2. 选择"项目管理" → "创建新项目"
3. 输入项目名称：`test-project`
4. 输入主密码：`TestPassword123!`
5. 确认创建
6. 验证项目出现在项目列表中

#### 测试密钥创建
1. 选择"密钥管理" → "创建密钥"
2. 选择项目：`test-project`
3. 输入密钥信息：
   - 密钥名称：`test-mongodb`
   - 密钥类型：`mongodb`
   - 密钥值：`mongodb://test:test@localhost:27017/test`
4. 输入主密码：`TestPassword123!`
5. 确认创建
6. 验证密钥出现在密钥列表中

#### 测试密钥获取
1. 选择"密钥管理" → "获取密钥值"
2. 选择项目：`test-project`
3. 选择密钥：`test-mongodb`
4. 输入主密码：`TestPassword123!`
5. 验证密钥值正确显示

#### 测试权限系统
1. 创建新用户（角色：developer）
2. 尝试用 developer 用户创建密钥（应该失败）
3. 尝试用 developer 用户读取密钥（应该成功）

### 4. API 测试

创建测试文件 `test-api.js`：

```javascript
const { KMSClient, KeyType } = require('./dist/index.js');

async function test() {
  const kms = new KMSClient({
    connectionString: 'mongodb://localhost:27017',
    databaseName: 'kms'
  });

  try {
    await kms.connect();
    console.log('✅ 连接成功');

    kms.setCurrentUser('test-user');

    // 测试项目创建
    const project = await kms.createProject(
      'api-test-project',
      'ApiTest123!',
      { environment: 'test' }
    );
    console.log('✅ 项目创建成功:', project.projectId);

    // 测试密钥创建
    const key = await kms.createKey(
      project.projectId,
      'ApiTest123!',
      {
        keyName: 'test-redis',
        keyType: KeyType.REDIS,
        value: 'redis://localhost:6379',
        tags: ['test']
      }
    );
    console.log('✅ 密钥创建成功:', key.keyId);

    // 测试密钥获取
    const keyValue = await kms.getKey(
      project.projectId,
      'ApiTest123!',
      key.keyId
    );
    console.log('✅ 密钥获取成功:', keyValue.value);

    // 测试密钥列表
    const { keys, total } = await kms.listKeys(project.projectId);
    console.log('✅ 密钥列表获取成功: 共', total, '个密钥');

    console.log('\n🎉 所有测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await kms.disconnect();
  }
}

test();
```

运行测试：

```bash
node test-api.js
```

## 发布流程

### 1. 更新版本号

```bash
npm version patch  # 或 minor, major
```

### 2. 构建

```bash
npm run build
npm run build:cli
```

### 3. 测试

```bash
npm test
```

### 4. 发布

```bash
npm publish --access public
```

## 注意事项

1. **主密码安全**
   - 测试时使用简单密码即可
   - 生产环境必须使用强密码
   - 不要在代码中硬编码主密码

2. **数据清理**
   - 测试完成后清理测试数据
   - 使用不同的测试数据库
   - 定期清理过期项目

3. **性能考虑**
   - 大量密钥时使用分页
   - 合理设置索引
   - 监控数据库性能

## 下一步改进

1. **功能增强**
   - 密钥轮换功能
   - 密钥过期时间
   - 批量操作支持
   - 导出/导入功能

2. **安全性增强**
   - 双因素认证
   - IP 白名单
   - 密钥访问审计
   - 加密连接字符串支持

3. **用户体验**
   - 配色支持
   - 进度显示
   - 自动补全
   - 帮助文档完善

## 问题反馈

如遇到问题，请提供：
1. 完整的错误信息
2. 操作步骤
3. 环境信息（Node.js 版本、MongoDB 版本）
4. 相关配置

到 GitHub Issues 反馈。

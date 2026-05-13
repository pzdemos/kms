# KMS - 密钥管理系统

高安全性、易用的密钥管理系统npm包，专为管理数据库连接字符串而设计。

## 特性

- **高安全性**：AES-256-GCM加密存储密钥
- **多租户支持**：项目级别隔离，每个项目独立的主密钥
- **访问控制**：基于角色的权限管理（RBAC）
- **审计日志**：完整记录所有密钥操作
- **TypeScript**：完整的类型定义
- **易用性**：简洁的API设计

## 安全特性

- ✅ 密钥使用AES-256-GCM加密存储
- ✅ 项目主密钥通过PBKDF2从用户密码派生（100,000次迭代）
- ✅ 基于RBAC的细粒度访问控制
- ✅ 所有操作记录审计日志
- ✅ 密码使用bcrypt哈希存储
- ✅ API密钥哈希存储，不保留明文

## 安装

```bash
npm install @pzdemons/kms
```

## 前置要求

- Node.js >= 18.0.0
- MongoDB >= 4.4

## 快速开始

### 1. 初始化客户端

```typescript
import { KMSClient, KeyType } from '@pzdemons/kms';

const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms'
});

// 连接到数据库
await kms.connect();
```

### 2. 创建项目

```typescript
// 设置当前用户（首次使用可以设置为任意字符串）
kms.setCurrentUser('admin_user_id');

const project = await kms.createProject(
  'my-application',           // 项目名称
  'very-strong-password-123!',  // 主密码（请妥善保管）
  {
    environment: 'production',
    department: 'engineering'
  }
);

console.log('Project created:', project.projectId);
```

### 3. 创建数据库连接密钥

```typescript
// 创建MongoDB连接密钥
const mongodbKey = await kms.createKey(
  project.projectId,
  'very-strong-password-123!',  // 主密码
  {
    keyName: 'mongodb-primary',
    keyType: KeyType.MONGODB,
    value: 'mongodb://user:password@localhost:27017/mydb',
    tags: ['production', 'database'],
    description: 'Primary MongoDB database'
  }
);

// 创建Redis连接密钥
const redisKey = await kms.createKey(
  project.projectId,
  'very-strong-password-123!',
  {
    keyName: 'redis-cache',
    keyType: KeyType.REDIS,
    value: 'redis://localhost:6379',
    tags: ['production', 'cache']
  }
);
```

### 4. 获取密钥（自动解密）

```typescript
const keyValue = await kms.getKey(
  project.projectId,
  'very-strong-password-123!',
  mongodbKey.keyId
);

console.log('Connection string:', keyValue.value);
// 输出: mongodb://user:password@localhost:27017/mydb
```

### 5. 列出所有密钥

```typescript
const { keys, total } = await kms.listKeys(project.projectId);

console.log(`Total keys: ${total}`);
keys.forEach(key => {
  console.log(`- ${key.keyName} (${key.keyType})`);
});
```

### 6. 按标签过滤

```typescript
const prodKeys = await kms.listKeys(project.projectId, {
  tags: ['production'],
  keyType: KeyType.MONGODB
});

console.log('Production MongoDB keys:', prodKeys.total);
```

### 7. 查看审计日志

```typescript
const auditLogs = await kms.getAuditLogs(project.projectId, {
  page: 1,
  limit: 20
});

console.log('Recent activities:');
auditLogs.logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.action} - ${log.details.success ? 'Success' : 'Failed'}`);
});
```

## 高级用法

### Express集成示例

```typescript
import express from 'express';
import { KMSClient, KeyType } from '@pzdemons/kms';

const app = express();
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms'
});

await kms.connect();

// 创建密钥API
app.post('/api/keys', async (req, res) => {
  const { projectId, masterPassword, keyName, keyType, value } = req.body;

  const key = await kms.createKey(projectId, masterPassword, {
    keyName,
    keyType,
    value,
    tags: ['api-created']
  });

  res.json({ success: true, keyId: key.keyId });
});

// 获取密钥API
app.get('/api/keys/:keyId', async (req, res) => {
  const { projectId, masterPassword } = req.headers;
  const { keyId } = req.params;

  const keyValue = await kms.getKey(
    projectId,
    masterPassword,
    keyId
  );

  res.json({ value: keyValue.value });
});

app.listen(3000);
```

更多示例请查看：
- [基础使用示例](./examples/basic-usage.ts)
- [Express集成](./examples/with-express.ts)
- [数据库连接管理](./examples/database-connections.ts)

## API文档

完整的API文档请查看：[API.md](./docs/API.md)

## 安全最佳实践

为了确保系统的安全性，请遵循以下最佳实践：

1. **主密码安全**
   - 使用至少12个字符的强密码
   - 包含大小写字母、数字和特殊字符
   - 定期轮换主密码（建议每180天）

2. **密钥轮换**
   - 定期轮换数据库连接凭证（建议每90天）
   - 设置密钥过期时间

3. **访问控制**
   - 使用最小权限原则
   - 为不同环境使用不同的用户和项目
   - 定期审查用户权限

4. **网络安全**
   - 生产环境使用TLS/SSL连接MongoDB
   - 实施IP白名单
   - 配置API速率限制

5. **监控和审计**
   - 定期检查审计日志
   - 监控失败的登录尝试
   - 设置安全告警

完整的安全指南请查看：[SECURITY.md](./docs/SECURITY.md)

## 支持的密钥类型

- `mongodb` - MongoDB连接字符串
- `mysql` - MySQL连接字符串
- `postgresql` - PostgreSQL连接字符串
- `redis` - Redis连接字符串
- `custom` - 自定义密钥

## 角色和权限

| 角色 | 描述 | 权限 |
|------|------|------|
| `admin` | 项目管理员 | 所有权限 |
| `operator` | 运维人员 | 读取、更新密钥，查看审计日志 |
| `developer` | 开发人员 | 读取密钥 |
| `readonly` | 只读用户 | 列出密钥 |
| `auditor` | 审计员 | 查看审计日志 |

## 错误处理

```typescript
import {
  KMSError,
  ProjectNotFoundError,
  KeyNotFoundError,
  AuthenticationError,
  ForbiddenError,
  ValidationError
} from '@your-org/kms';

try {
  const key = await kms.getKey(projectId, masterPassword, keyId);
} catch (error) {
  if (error instanceof KeyNotFoundError) {
    console.error('Key not found');
  } else if (error instanceof AuthenticationError) {
    console.error('Invalid master password');
  } else if (error instanceof ForbiddenError) {
    console.error('Permission denied');
  } else {
    console.error('Error:', error.message);
  }
}
```

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 项目结构

```
kms/
├── src/
│   ├── client.ts              # KMSClient主类
│   ├── core/                  # 加密核心模块
│   ├── models/                # 数据模型
│   ├── repositories/          # 数据访问层
│   ├── services/              # 业务逻辑层
│   ├── types/                 # TypeScript类型定义
│   └── utils/                 # 工具函数
├── examples/                  # 使用示例
├── docs/                      # 文档
└── tests/                     # 测试
```

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT

## 联系方式

- 作者：pzdemons
- 问题反馈：[GitHub Issues](https://github.com/pzdemons/kms/issues)
- 安全问题：security@pzdemons.com

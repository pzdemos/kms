# KMS - 密钥管理系统

高安全性、易用的密钥管理系统npm包，专为管理数据库连接字符串而设计。

## 特性

- **高安全性**：AES-256-GCM加密存储密钥
- **多租户支持**：项目级别隔离，每个项目独立的主密钥
- **访问控制**：基于角色的权限管理（RBAC）
- **审计日志**：完整记录所有密钥操作
- **TypeScript**：完整的类型定义
- **易用性**：简洁的API设计
- **CLI工具**：交互式命令行工具，无需编写代码即可管理密钥

## 安全特性

- ✅ 密钥使用AES-256-GCM加密存储
- ✅ 项目主密钥通过PBKDF2从用户密码派生（100,000次迭代）
- ✅ 基于RBAC的细粒度访问控制
- ✅ 所有操作记录审计日志
- ✅ 密码使用bcrypt哈希存储
- ✅ API密钥哈希存储，不保留明文

## 安装

```bash
npm install @pengzi/kms
```

安装后即可使用 CLI 工具：

```bash
kms
```

## 前置要求

- Node.js >= 18.0.0
- MongoDB >= 4.4

## 快速开始

### 方式 1: 使用 CLI 工具（推荐新手）

```bash
# 启动交互式 CLI
kms

# 首次使用需要配置数据库连接
# 按提示输入 MongoDB 连接字符串

# 创建项目
选择: 项目管理 → 创建新项目
项目名称: my-project
主密码: MySecurePassword123!

# 创建密钥
选择: 密钥管理 → 创建密钥
项目: my-project
密钥名称: mongodb-primary
密钥类型: mongodb
密钥值: mongodb://user:pass@localhost:27017/mydb

# 获取密钥
选择: 密钥管理 → 获取密钥值
```

详细 CLI 使用说明请查看：[CLI 工具指南](./docs/guides/cli-guide.md)

### 方式 2: 使用 Node.js SDK

#### 1. 初始化客户端

```typescript
import { KMSClient, KeyType } from '@pengzi/kms';

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

## 完整使用指南

### 连接配置

#### MongoDB Atlas（推荐，自动 TLS）

```typescript
const kms = new KMSClient({
  connectionString: 'mongodb+srv://user:pass@cluster.mongodb.net',
  databaseName: 'kms'
});
await kms.connect();
```

#### 自建 MongoDB + TLS

```typescript
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms',
  connectionOptions: {
    tls: true,
    tlsCAFile: '/etc/ssl/mongodb/ca.pem'
  }
});
await kms.connect();
```

#### 开发环境（本地 MongoDB）

```typescript
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms'
});
await kms.connect();
```

### 用户管理

```typescript
// 创建用户
const user = await kms.createUser(projectId, {
  username: 'developer1',
  password: 'UserPassword123!',
  roles: ['developer']  // 可选: admin, operator, developer, readonly, auditor
});

// 授予角色
await kms.grantRole(projectId, user.userId, 'operator');

// 撤销角色
await kms.revokeRole(projectId, user.userId, 'developer');
```

### 密钥管理完整流程

```typescript
// 1. 创建密钥
const key = await kms.createKey(projectId, masterPassword, {
  keyName: 'production-db',
  keyType: KeyType.MONGODB,
  value: 'mongodb://user:pass@host:27017/db',
  tags: ['production', 'database'],
  description: '生产环境主数据库',
  expiresAt: new Date('2025-12-31')  // 可选：设置过期时间
});

// 2. 列出密钥（分页）
const { keys, total } = await kms.listKeys(projectId, {
  keyType: KeyType.MONGODB,
  tags: ['production']
}, {
  page: 1,
  limit: 20
});

// 3. 更新密钥
const updatedKey = await kms.updateKey(
  projectId,
  masterPassword,
  key.keyId,
  {
    description: '更新的描述',
    tags: ['production', 'database', 'important']
  }
);

// 4. 删除密钥
await kms.deleteKey(projectId, key.keyId);
```

### 审计日志查询

```typescript
// 查看最近日志
const recentLogs = await kms.getRecentLogs(projectId, 50);

// 高级查询
const auditLogs = await kms.getAuditLogs(projectId, {
  page: 1,
  limit: 20,
  action: 'CREATE_KEY',  // 可选：过滤操作类型
  userId: 'user123',      // 可选：过滤用户
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31')
});

console.log('总记录数:', auditLogs.total);
console.log('当前页:', auditLogs.page);
```

### 项目管理

```typescript
// 列出所有项目
const projects = await kms.listProjects();

// 获取项目详情
const project = await kms.getProject(projectId);

// 删除项目（会删除所有密钥）
await kms.deleteProject(projectId);
```

## 高级用法

### Express 集成示例

```typescript
import express from 'express';
import { KMSClient, KeyType } from '@pengzi/kms';

const app = express();
app.use(express.json());

const kms = new KMSClient({
  connectionString: process.env.MONGODB_URI,
  databaseName: 'kms'
});

await kms.connect();

// 中间件：设置当前用户
app.use((req, res, next) => {
  kms.setCurrentUser(req.user?.id || 'api-user');
  next();
});

// API: 创建密钥
app.post('/api/keys', async (req, res) => {
  try {
    const { projectId, masterPassword, keyName, keyType, value } = req.body;

    const key = await kms.createKey(projectId, masterPassword, {
      keyName,
      keyType,
      value,
      tags: ['api-created']
    });

    res.json({ success: true, keyId: key.keyId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API: 获取密钥
app.get('/api/keys/:keyId', async (req, res) => {
  try {
    const { projectId, masterPassword } = req.headers;
    const { keyId } = req.params;

    const keyValue = await kms.getKey(
      projectId,
      masterPassword,
      keyId
    );

    res.json({ value: keyValue.value });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// API: 列出密钥
app.get('/api/keys', async (req, res) => {
  try {
    const { projectId } = req.query;
    const { keys, total } = await kms.listKeys(projectId);

    res.json({ keys, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('KMS API server running on port 3000');
});
```

### 环境变量配置

创建 `.env` 文件：

```bash
# MongoDB 连接
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
KMS_DATABASE=kms

# 或者使用加密连接
KMS_ENCRYPTED_CONNECTION={"encrypted":"..."}

# 私钥（如果使用加密连接）
KMS_PRIVATE_KEY_FILE=/path/to/private-key.pem
```

使用环境变量：

```typescript
import dotenv from 'dotenv';
dotenv.config();

const kms = new KMSClient({
  connectionString: process.env.MONGODB_URI,
  databaseName: process.env.KMS_DATABASE || 'kms'
});
```

### 使用加密连接字符串

```typescript
import {
  loadEncryptedConfig,
  createClientFromEncryptedConfig
} from '@pengzi/kms';

// 从配置文件加载加密的连接字符串
const config = loadEncryptedConfig('./config/encrypted-db.json');

// 创建客户端
const kms = await createClientFromEncryptedConfig(config);
```

### 错误处理最佳实践

```typescript
import {
  KMSClient,
  KeyNotFoundError,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
  ProjectNotFoundError
} from '@pengzi/kms';

async function getKeySafely(
  kms: KMSClient,
  projectId: string,
  masterPassword: string,
  keyId: string
) {
  try {
    const keyValue = await kms.getKey(projectId, masterPassword, keyId);
    return { success: true, value: keyValue.value };
  } catch (error) {
    if (error instanceof KeyNotFoundError) {
      return { success: false, error: '密钥不存在' };
    } else if (error instanceof AuthenticationError) {
      return { success: false, error: '主密码错误' };
    } else if (error instanceof ForbiddenError) {
      return { success: false, error: '权限不足' };
    } else if (error instanceof ValidationError) {
      return { success: false, error: '数据验证失败' };
    } else if (error instanceof ProjectNotFoundError) {
      return { success: false, error: '项目不存在' };
    } else {
      return { success: false, error: '未知错误' };
    }
  }
}

// 使用
const result = await getKeySafely(kms, projectId, masterPassword, keyId);
if (result.success) {
  console.log('密钥值:', result.value);
} else {
  console.error('错误:', result.error);
}
```

### TypeScript 支持

KMS 提供完整的 TypeScript 类型定义：

```typescript
import {
  KMSClient,
  KeyType,
  Role,
  KeyStatus,
  Permission
} from '@pengzi/kms';

// 类型安全的密钥创建
const keyData: CreateKeyData = {
  keyName: 'my-redis',
  keyType: KeyType.REDIS,
  value: 'redis://localhost:6379',
  tags: ['cache'],
  description: 'Redis 缓存'
};

// 类型安全的项目创建
const projectOptions: CreateProjectOptions = {
  projectName: 'my-app',
  masterPassword: 'StrongPassword123!',
  metadata: {
    environment: 'production',
    team: 'backend'
  }
};
```

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
- [快速入门](./docs/getting-started/quickstart.md)
- [CLI 工具指南](./docs/guides/cli-guide.md)
- [API 使用示例](./docs/guides/api-usage.md)

## 文档

完整文档请查看：[文档导航](./docs/README.md)

### 核心文档
- [安装指南](./docs/getting-started/installation.md) - 详细的安装步骤
- [5分钟快速入门](./docs/getting-started/quickstart.md) - 快速上手指南
- [CLI 工具指南](./docs/guides/cli-guide.md) - 交互式命令行工具
- [TLS/SSL 配置](./docs/guides/tls-guide.md) - 安全连接配置
- [API 参考](./docs/api/reference.md) - 完整的 API 文档

## 安全最佳实践

为了确保系统的安全性，请遵循以下最佳实践：

1. **使用 TLS/SSL 连接** ⚠️ 重要
   - 生产环境**必须**使用 TLS/SSL 加密连接
   - MongoDB Atlas 默认启用 TLS，连接字符串使用 `mongodb+srv://`
   - 自建 MongoDB 需配置 TLS 证书
   ```javascript
   // MongoDB Atlas（自动启用 TLS）
   const kms = new KMSClient({
     connectionString: 'mongodb+srv://user:pass@cluster.mongodb.net/kms',
     databaseName: 'kms'
   });

   // 自建 MongoDB + TLS
   const kms = new KMSClient({
     connectionString: 'mongodb://localhost:27017/kms',
     databaseName: 'kms',
     connectionOptions: {
       tls: true,
       tlsCAFile: '/path/to/ca.pem'
     }
   });
   ```
   详细说明请查看：[TLS 连接指南](./docs/TLS_GUIDE.md)

2. **主密码安全**
   - 使用至少12个字符的强密码
   - 包含大小写字母、数字和特殊字符
   - 定期轮换主密码（建议每180天）

3. **密钥轮换**
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

完整的安全指南请查看：[安全最佳实践](./docs/security/best-practices.md)

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

## 实际应用场景

### 场景 1: 微服务架构中的密钥管理

```typescript
// 服务 A: 创建密钥
const serviceA = async () => {
  const kms = new KMSClient({
    connectionString: process.env.MONGODB_URI,
    databaseName: 'kms'
  });
  await kms.connect();

  const project = await kms.createProject('microservices-app', masterPassword);

  // 为每个服务创建密钥
  await kms.createKey(project.projectId, masterPassword, {
    keyName: 'user-service-db',
    keyType: KeyType.MONGODB,
    value: process.env.USER_DB_URL,
    tags: ['user-service', 'database']
  });

  await kms.createKey(project.projectId, masterPassword, {
    keyName: 'order-service-db',
    keyType: KeyType.MONGODB,
    value: process.env.ORDER_DB_URL,
    tags: ['order-service', 'database']
  });
};

// 服务 B: 获取密钥
const serviceB = async () => {
  const kms = new KMSClient({
    connectionString: process.env.MONGODB_URI,
    databaseName: 'kms'
  });
  await kms.connect();

  // 只获取自己需要的密钥
  const { keys } = await kms.listKeys(projectId, {
    tags: ['user-service']
  });

  keys.forEach(async (key) => {
    const keyValue = await kms.getKey(projectId, masterPassword, key.keyId);
    // 使用连接字符串初始化数据库连接
    await connectToDatabase(keyValue.value);
  });
};
```

### 场景 2: 多环境部署

```typescript
const environments = ['development', 'staging', 'production'];

for (const env of environments) {
  const projectName = `myapp-${env}`;
  const project = await kms.createProject(projectName, masterPassword);

  // 为每个环境创建相应的密钥
  await kms.createKey(project.projectId, masterPassword, {
    keyName: 'database',
    keyType: KeyType.MONGODB,
    value: envDatabases[env],
    tags: [env, 'database']
  });
}
```

### 场景 3: 密钥轮换

```typescript
async function rotateKey(projectId: string, keyId: string, masterPassword: string) {
  const kms = new KMSClient({ /* config */ });
  await kms.connect();

  // 1. 获取旧密钥值（如果需要）
  const oldValue = await kms.getKey(projectId, masterPassword, keyId);

  // 2. 更新为新值
  const newValue = generateNewConnectionString();
  await kms.updateKey(projectId, masterPassword, keyId, {
    value: newValue
  });

  // 3. 通知相关服务（使用消息队列）
  await notifyServicesKeyRotated(keyId, newValue);

  console.log(`密钥 ${keyId} 已轮换`);
}
```

### 场景 4: 访问控制

```typescript
// 为不同团队创建不同的项目
const frontendTeam = await kms.createProject('frontend-app', masterPassword);
const backendTeam = await kms.createProject('backend-app', masterPassword);

// 创建不同权限的用户
const frontendDev = await kms.createUser(frontendTeam.projectId, {
  username: 'frontend-dev',
  password: 'Password123!',
  roles: ['developer']  // 只读权限
});

const backendAdmin = await kms.createUser(backendTeam.projectId, {
  username: 'backend-admin',
  password: 'AdminPass123!',
  roles: ['admin']  // 完全权限
});

// 前端开发者尝试访问后端项目（会失败）
try {
  await kms.createKey(backendTeam.projectId, masterPassword, {
    keyName: 'test-key',
    keyType: KeyType.CUSTOM,
    value: 'test-value'
  });
} catch (error) {
  console.error('权限被拒绝');
}
```

## CLI 工具使用

### 安装和启动

```bash
# 全局安装
npm install -g @pengzi/kms

# 启动 CLI
kms
```

### 配置文件

创建 `~/.kms/config.json`:

```json
{
  "connectionString": "mongodb://localhost:27017",
  "databaseName": "kms"
}
```

### 常用命令

```bash
# 创建项目
选择: 1 (项目管理) → 1 (创建新项目)

# 创建密钥
选择: 2 (密钥管理) → 1 (创建密钥)

# 获取密钥值
选择: 2 (密钥管理) → 3 (获取密钥值)

# 查看审计日志
选择: 4 (审计日志) → 1 (查看最近日志)
```

详细的 CLI 使用说明请查看：[CLI 工具指南](./docs/guides/cli-guide.md)

## 错误处理

```typescript
import {
  KMSClient,
  KeyNotFoundError,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
  ProjectNotFoundError
} from '@pengzi/kms';

try {
  const key = await kms.getKey(projectId, masterPassword, keyId);
} catch (error) {
  if (error instanceof KeyNotFoundError) {
    console.error('密钥不存在');
  } else if (error instanceof AuthenticationError) {
    console.error('主密码错误或用户未认证');
  } else if (error instanceof ForbiddenError) {
    console.error('权限不足');
  } else if (error instanceof ValidationError) {
    console.error('数据验证失败:', error.message);
  } else if (error instanceof ProjectNotFoundError) {
    console.error('项目不存在');
  } else {
    console.error('未知错误:', error.message);
  }
}
```

## 最佳实践

### 1. 密钥命名规范

```typescript
// 好的命名 ✅
const goodKeyNames = [
  'production-mongodb-primary',
  'staging-redis-cache',
  'dev-postgresql-analytics',
  'stripe-api-key'
];

// 不好的命名 ❌
const badKeyNames = [
  'db',          // 太模糊
  'key1',        // 无意义
  'test',        // 不明确
  'a'            // 太短
];
```

### 2. 标签使用

```typescript
// 使用有意义的标签
await kms.createKey(projectId, masterPassword, {
  keyName: 'mongodb-primary',
  keyType: KeyType.MONGODB,
  value: connectionString,
  tags: [
    'production',      // 环境
    'database',        // 类型
    'mongodb',         // 技术
    'primary',         // 用途
    'critical'         // 重要级别
  ]
});
```

### 3. 主密码管理

```typescript
// ❌ 不要硬编码主密码
const masterPassword = 'password123';

// ❌ 不要将主密码存储在代码仓库
const masterPassword = fs.readFileSync('password.txt');

// ✅ 使用环境变量
const masterPassword = process.env.MASTER_PASSWORD;

// ✅ 或使用密钥管理服务
const masterPassword = await getKeyFromVault();
```

### 4. 连接池配置

```typescript
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms',
  connectionOptions: {
    maxPoolSize: 50,              // 最大连接数
    minPoolSize: 10,              // 最小连接数
    connectTimeoutMS: 10000,      // 连接超时
    socketTimeoutMS: 30000,       // Socket 超时
    serverSelectionTimeoutMS: 5000 // 服务器选择超时
  }
});
```

### 5. 错误处理和重试

```typescript
async function getKeyWithRetry(
  kms: KMSClient,
  projectId: string,
  masterPassword: string,
  keyId: string,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await kms.getKey(projectId, masterPassword, keyId);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## 性能优化

### 1. 批量操作

```typescript
// 批量创建密钥
const keysToCreate = [
  { name: 'db1', type: KeyType.MONGODB, value: '...' },
  { name: 'db2', type: KeyType.MONGODB, value: '...' },
  { name: 'cache', type: KeyType.REDIS, value: '...' }
];

const promises = keysToCreate.map(keyData =>
  kms.createKey(projectId, masterPassword, keyData)
);

const results = await Promise.all(promises);
```

### 2. 分页查询

```typescript
// 使用分页减少内存使用
const pageSize = 100;
let page = 1;
let hasMore = true;

while (hasMore) {
  const { keys, total } = await kms.listKeys(projectId, {}, {
    page,
    limit: pageSize
  });

  // 处理当前页的密钥
  keys.forEach(key => {
    // 处理密钥
  });

  // 检查是否还有更多数据
  hasMore = page * pageSize < total;
  page++;
}
```

### 3. 连接复用

```typescript
// ❌ 不好的做法：每次操作都创建新连接
async function badExample() {
  const kms1 = new KMSClient({ /* config */ });
  await kms1.connect();
  await kms1.createKey(...);
  await kms1.disconnect();

  const kms2 = new KMSClient({ /* config */ });
  await kms2.connect();
  await kms2.getKey(...);
  await kms2.disconnect();
}

// ✅ 好的做法：复用连接
class KMSManager {
  private client: KMSClient;

  constructor() {
    this.client = new KMSClient({ /* config */ });
  }

  async init() {
    await this.client.connect();
  }

  async createKey(...args: any[]) {
    return await this.client.createKey(...args);
  }

  async destroy() {
    await this.client.disconnect();
  }
}
```

## 安全注意事项

### 敏感信息处理

```typescript
// ❌ 不要在日志中记录密钥值
console.log('密钥值:', keyValue.value);

// ❌ 不要在错误消息中暴露密钥值
throw new Error(`密钥 ${keyValue.value} 创建失败`);

// ✅ 只记录必要信息
console.log('密钥 ID:', key.keyId);
console.log('密钥名称:', key.keyName);
```

### 审计和监控

```typescript
// 定期检查审计日志
async function securityAudit(kms: KMSClient, projectId: string) {
  const logs = await kms.getAuditLogs(projectId, {
    limit: 1000
  });

  // 检查异常活动
  const suspiciousActivities = logs.logs.filter(log => {
    return !log.details.success ||
           log.action === 'PERMISSION_DENIED' ||
           log.action === 'LOGIN_FAILED';
  });

  if (suspiciousActivities.length > 0) {
    console.warn('发现可疑活动:', suspiciousActivities);
    // 发送告警
    await sendAlert(suspiciousActivities);
  }
}
```

## 开发

### 本地开发

```bash
# 克隆项目
git clone https://github.com/pengzi/kms.git
cd kms

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

### 运行测试

```bash
# 单元测试
npm test

# 测试覆盖率
npm run test:coverage

# 集成测试
cd test-kms
node simple-test.js
```

### 贡献指南

我们欢迎所有形式的贡献！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

详细贡献指南请查看：[贡献指南](./docs/development/contributing.md)

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

MIT License

Copyright (c) 2025 pzdemons

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 联系方式

- **作者**: pzdemons
- **包名**: @pengzi/kms
- **GitHub**: [pengzi/kms](https://github.com/pengzi/kms)
- **问题反馈**: [GitHub Issues](https://github.com/pengzi/kms/issues)
- **安全问题**: 请通过私有渠道报告

## 相关资源

- [完整文档](./docs/README.md)
- [API 参考](./docs/api/reference.md)
- [更新日志](./docs/about/changelog.md)
- [测试报告](./docs/about/test-reports/)

---

**当前版本**: v1.2.0  
**最后更新**: 2025-05-15  
**Node.js**: >= 18.0.0  
**MongoDB**: >= 4.4

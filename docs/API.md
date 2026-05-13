# KMS API 文档

## 目录

- [初始化](#初始化)
- [项目管理](#项目管理)
- [密钥管理](#密钥管理)
- [用户管理](#用户管理)
- [审计日志](#审计日志)

## 初始化

### 构造函数

```typescript
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms',
  connectionOptions: {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    maxPoolSize: 10,
  }
});
```

### 连接数据库

```typescript
await kms.connect();
```

### 断开连接

```typescript
await kms.disconnect();
```

## 项目管理

### 创建项目

```typescript
const project = await kms.createProject(
  'my-application',      // 项目名称
  'master-password-123', // 主密码
  {                      // 元数据（可选）
    environment: 'production',
    department: 'engineering'
  }
);
```

**返回值：** `Project`

### 获取项目

```typescript
const project = await kms.getProject(projectId);
```

**返回值：** `Project`

### 列出所有项目

```typescript
const projects = await kms.listProjects();
```

**返回值：** `Project[]`

### 删除项目

```typescript
await kms.deleteProject(projectId);
```

## 密钥管理

### 创建密钥

```typescript
const key = await kms.createKey(
  projectId,
  'master-password-123',  // 主密码
  {
    keyName: 'mongodb-primary',
    keyType: KeyType.MONGODB,
    value: 'mongodb://user:pass@localhost:27017/mydb',
    tags: ['production', 'database'],
    description: 'Primary database',
    expiresAt: new Date('2025-12-31')
  }
);
```

**参数：**
- `projectId` - 项目ID
- `masterPassword` - 主密码
- `keyData` - 密钥数据
  - `keyName` - 密钥名称（必需）
  - `keyType` - 密钥类型（必需）
  - `value` - 密钥值（必需）
  - `tags` - 标签数组（可选）
  - `description` - 描述（可选）
  - `expiresAt` - 过期时间（可选）

**返回值：** `Key`

### 获取密钥（解密）

```typescript
const keyValue = await kms.getKey(
  projectId,
  'master-password-123',
  keyId
);

console.log(keyValue.value); // 解密后的明文值
```

**返回值：** `KeyValue`

### 列出密钥

```typescript
const { keys, total } = await kms.listKeys(
  projectId,
  {
    keyType: KeyType.MONGODB,  // 按类型过滤（可选）
    tags: ['production'],      // 按标签过滤（可选）
    status: KeyStatus.ACTIVE,  // 按状态过滤（可选）
    search: 'mongo'            // 搜索名称（可选）
  },
  {
    page: 1,
    limit: 20
  }
);
```

**返回值：** `{ keys: Key[], total: number }`

### 更新密钥

```typescript
const updatedKey = await kms.updateKey(
  projectId,
  'master-password-123',
  keyId,
  {
    value: 'new-connection-string',
    tags: ['production', 'database', 'updated'],
    description: 'Updated description'
  }
);
```

**返回值：** `Key`

### 删除密钥

```typescript
await kms.deleteKey(projectId, keyId);
```

## 用户管理

### 创建用户

```typescript
const user = await kms.createUser(
  projectId,
  {
    username: 'john_doe',
    password: 'SecurePassword123!',
    roles: [Role.DEVELOPER],
    permissions: []
  }
);
```

**返回值：** `Omit<User, 'passwordHash' | 'apiKeyHash'>`

### 用户登录

```typescript
const success = await kms.login(
  projectId,
  'john_doe',
  'SecurePassword123!'
);

if (success) {
  console.log('Login successful');
}
```

**返回值：** `boolean`

### 授予角色

```typescript
await kms.grantRole(projectId, userId, Role.ADMIN);
```

### 撤销角色

```typescript
await kms.revokeRole(projectId, userId, Role.ADMIN);
```

## 审计日志

### 获取审计日志

```typescript
const { logs, total, page, limit } = await kms.getAuditLogs(
  projectId,
  {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    action: AuditAction.READ_KEY,
    resourceType: ResourceType.KEY,
    userId: 'user-123',
    severity: AuditSeverity.INFO,
    success: true,
    page: 1,
    limit: 50
  }
);
```

**返回值：** `{ logs: AuditLog[], total: number, page: number, limit: number }`

### 获取最近的日志

```typescript
const logs = await kms.getRecentLogs(projectId, 100);
```

**返回值：** `AuditLog[]`

## 类型定义

### KeyType

```typescript
enum KeyType {
  MONGODB = 'mongodb',
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  REDIS = 'redis',
  CUSTOM = 'custom'
}
```

### KeyStatus

```typescript
enum KeyStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
  DELETED = 'deleted'
}
```

### Role

```typescript
enum Role {
  ADMIN = 'admin',           // 项目管理员
  OPERATOR = 'operator',     // 运维人员
  DEVELOPER = 'developer',   // 开发人员
  READONLY = 'readonly',     // 只读访问
  AUDITOR = 'auditor'        // 审计员
}
```

### AuditAction

```typescript
enum AuditAction {
  CREATE_PROJECT = 'CREATE_PROJECT',
  UPDATE_PROJECT = 'UPDATE_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',
  CREATE_KEY = 'CREATE_KEY',
  READ_KEY = 'READ_KEY',
  UPDATE_KEY = 'UPDATE_KEY',
  DELETE_KEY = 'DELETE_KEY',
  LIST_KEYS = 'LIST_KEYS',
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}
```

## 错误处理

所有KMS方法都可能抛出以下错误：

- `KMSError` - 基础错误类
- `ProjectNotFoundError` - 项目不存在
- `KeyNotFoundError` - 密钥不存在
- `UserNotFoundError` - 用户不存在
- `AuthenticationError` - 认证失败
- `ForbiddenError` - 权限不足
- `ValidationError` - 数据验证失败
- `CryptoError` - 加密操作失败

**错误处理示例：**

```typescript
try {
  const key = await kms.getKey(projectId, masterPassword, keyId);
} catch (error) {
  if (error instanceof KeyNotFoundError) {
    console.error('Key not found');
  } else if (error instanceof ForbiddenError) {
    console.error('Permission denied');
  } else {
    console.error('Error:', error.message);
  }
}
```

# KMS 密码存储和使用说明

## 概述

KMS系统采用**不存储主密码**的安全设计。主密码只存在于用户的记忆中，每次使用时都需要提供。

## 核心概念

### 1. 主密码 (Master Password)
- 用户在创建项目时设置的密码
- **永不存储在数据库中**
- 用于派生项目主密钥
- 示例：`"very-strong-password-123!"`

### 2. 项目主密钥 (Project Master Key)
- 从主密码派生的256位密钥
- 使用PBKDF2算法（100,000次迭代）
- 用于加密/解密该项目的所有数据密钥
- **也不直接存储**，只存储其哈希值用于验证

### 3. 数据密钥 (Data Key)
- 每个密钥（连接字符串）用项目主密钥加密后存储
- 存储在数据库中
- 格式：`{ encryptedValue, iv, authTag }`

## 密码流程详解

### 创建项目时

```
用户输入: "very-strong-password-123!"
    ↓
生成随机盐值: salt = randomBytes(16)
    ↓
使用PBKDF2派生主密钥:
  masterKey = PBKDF2(password, salt, 100000 iterations, 32 bytes)
    ↓
计算主密钥哈希:
  masterKeyHash = SHA256(masterKey)
    ↓
存储到数据库:
  {
    projectId: "proj_xxx",
    masterKeyHash: "abc123...",  // 哈希值
    salt: "def456...",           // 盐值
    // 注意：主密钥本身不存储！
  }
    ↓
丢弃主密钥和密码（从内存中清除）
```

**代码实现：**

```typescript
// src/core/key-derivation.ts
export async function deriveProjectMasterKey(
  masterPassword: string,
  salt: string
): Promise<Buffer> {
  // 使用PBKDF2从密码派生密钥
  return deriveKeyFromPassword(masterPassword, salt);
}

// src/services/project.service.ts
async createProject(options: CreateProjectOptions) {
  // 1. 生成盐值
  const salt = generateSalt();

  // 2. 派生主密钥
  const masterKey = await this.cryptoService.deriveMasterKey(
    options.masterPassword,
    salt
  );

  // 3. 计算主密钥哈希
  const masterKeyHash = await this.cryptoService.hashMasterKey(masterKey);

  // 4. 只存储哈希和盐值，不存储主密钥
  const project = {
    masterKeyHash,
    salt,
    // masterKey 不存储！
  };
}
```

### 存储密钥时

```
用户提供: masterPassword = "very-strong-password-123!"
数据密钥: mongodb://user:pass@localhost:27017/mydb
    ↓
从数据库获取项目信息:
  {
    masterKeyHash: "abc123...",
    salt: "def456..."
  }
    ↓
重新派生主密钥:
  masterKey = PBKDF2(masterPassword, salt, 100000 iterations)
    ↓
验证主密钥:
  verify(SHA256(masterKey) === masterKeyHash) ✓
    ↓
使用主密钥加密数据密钥:
  encrypted = AES-256-GCM.encrypt(plaintext, masterKey)
  {
    encryptedValue: "xyz789...",
    iv: "aaa111...",
    authTag: "bbb222..."
  }
    ↓
存储加密后的密钥到数据库
    ↓
丢弃主密钥（从内存中清除）
```

**代码实现：**

```typescript
// src/services/key.service.ts
async createKey(projectId, userId, masterPassword, keyData) {
  // 1. 获取项目信息
  const project = await this.projectRepo.findByProjectId(projectId);

  // 2. 用主密码重新派生主密钥
  const masterKey = await this.cryptoService.deriveMasterKey(
    masterPassword,
    project.salt
  );

  // 3. 验证主密码是否正确
  const isValid = await this.cryptoService.verifyMasterKey(
    masterKey,
    project.masterKeyHash
  );

  if (!isValid) {
    throw new AuthenticationError('Invalid master password');
  }

  // 4. 使用主密钥加密数据密钥
  const encryptedData = await this.cryptoService.encryptKey(
    keyData.value,
    masterKey
  );

  // 5. 存储加密后的密钥
  const key = createKey(projectId, keyData, encryptedData, userId);
  await this.keyRepo.insertOne(key);
}
```

### 读取密钥时

```
用户提供: masterPassword = "very-strong-password-123!"
密钥ID: "key_xxx"
    ↓
从数据库获取项目信息和密钥:
  project: { masterKeyHash: "abc123...", salt: "def456..." }
  key: {
    encryptedValue: "xyz789...",
    iv: "aaa111...",
    authTag: "bbb222..."
  }
    ↓
重新派生主密钥:
  masterKey = PBKDF2(masterPassword, salt, 100000 iterations)
    ↓
验证主密钥:
  verify(SHA256(masterKey) === masterKeyHash) ✓
    ↓
使用主密钥解密数据密钥:
  plaintext = AES-256-GCM.decrypt(encryptedValue, iv, authTag, masterKey)
    ↓
返回明文密钥值
    ↓
丢弃主密钥（从内存中清除）
```

## 实际使用场景

### 场景1：应用启动时获取数据库连接

```typescript
import { KMSClient, KeyType } from '@pzdemons/kms';

// 1. 初始化KMS客户端
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms'
});

await kms.connect();

// 2. 从环境变量或配置获取主密码
// 主密码可以存储在：
// - 环境变量
// - 密钥管理服务（AWS KMS, Azure Key Vault, HashiCorp Vault）
// - 配置文件（加密）
const MASTER_PASSWORD = process.env.APP_MASTER_PASSWORD;

// 3. 获取数据库连接字符串
const keyValue = await kms.getKey(
  'project-123',
  MASTER_PASSWORD,  // 每次都需要提供主密码
  'mongodb-primary'
);

// 4. 使用连接字符串连接数据库
const MongoClient = require('mongodb').MongoClient;
const client = new MongoClient(keyValue.value);
await client.connect();

// 5. 主密码在使用后立即从内存清除（KMS内部处理）
```

### 场景2：在应用配置中管理主密码

**方案A：环境变量（推荐用于开发/测试）**

```bash
# .env 文件（不要提交到git）
KMS_MASTER_PASSWORD=your-very-strong-password-123
APP_PROJECT_ID=proj_abc123
```

```typescript
// config.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  kms: {
    masterPassword: process.env.KMS_MASTER_PASSWORD!,
    projectId: process.env.APP_PROJECT_ID!
  }
};

// app.ts
import { KMSClient } from '@pzdemons/kms';
import { config } from './config';

const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms'
});

await kms.connect();

// 使用配置的主密码
const dbKey = await kms.getKey(
  config.kms.projectId,
  config.kms.masterPassword,
  'mongodb-primary'
);
```

**方案B：密钥管理服务（推荐用于生产）**

```typescript
// 从AWS KMS获取主密码
import { KMSClient as AWSKMS } from '@aws-sdk/client-kms';

async function getMasterPasswordFromKMS(): Promise<string> {
  const awsKms = new AWSKMS({ region: 'us-east-1' });

  const response = await awsKms.decrypt({
    CiphertextBlob: Buffer.from(process.env.ENCRYPTED_MASTER_PASSWORD, 'base64')
  });

  return response.Plaintext.toString();
}

// 使用
const masterPassword = await getMasterPasswordFromKMS();
const dbKey = await kms.getKey(projectId, masterPassword, keyId);
```

**方案C：HashiCorp Vault**

```typescript
import { Vault } from 'node-vault';

async function getMasterPasswordFromVault(): Promise<string> {
  const vault = new Vault({
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN
  });

  const result = await vault.read(`secret/data/${projectId}/master`);
  return result.data.data.value;
}
```

### 场景3：多环境部署

```typescript
// config/environments.ts
export const environments = {
  development: {
    kmsConnectionString: 'mongodb://localhost:27017',
    masterPasswordSource: 'env', // 从环境变量读取
  },
  staging: {
    kmsConnectionString: process.env.STAGING_KMS_URI,
    masterPasswordSource: 'vault', // 从Vault读取
  },
  production: {
    kmsConnectionString: process.env.PROD_KMS_URI,
    masterPasswordSource: 'aws-kms', // 从AWS KMS读取
  }
};

// kms-manager.ts
class KMSManager {
  private masterPasswordCache: Map<string, string> = new Map();

  async getMasterPassword(projectId: string, env: string): Promise<string> {
    // 检查缓存
    if (this.masterPasswordCache.has(projectId)) {
      return this.masterPasswordCache.get(projectId)!;
    }

    // 从配置的来源获取
    const config = environments[env as keyof typeof environments];
    let masterPassword: string;

    switch (config.masterPasswordSource) {
      case 'env':
        masterPassword = process.env[`${env.toUpperCase()}_MASTER_PASSWORD`]!;
        break;
      case 'vault':
        masterPassword = await this.getFromVault(projectId);
        break;
      case 'aws-kms':
        masterPassword = await this.getFromAWSKMS(projectId);
        break;
      default:
        throw new Error('Unknown master password source');
    }

    // 缓存（可选，注意安全性）
    this.masterPasswordCache.set(projectId, masterPassword);

    return masterPassword;
  }
}
```

## 安全最佳实践

### 1. 主密码管理

✅ **推荐做法：**

```typescript
// 从安全的密钥管理服务获取
const masterPassword = await getFromSecureStore();

// 使用后立即清除
const keyValue = await kms.getKey(projectId, masterPassword, keyId);
// KMS内部会在使用后清除masterKey
```

❌ **避免做法：**

```typescript
// 不要硬编码
const masterPassword = "hardcoded-password-123";

// 不要提交到git
// 不要在日志中记录
// 不要通过不安全的通道传输
```

### 2. 主密码强度要求

```typescript
// 密码必须满足：
- 最少 12 个字符
- 包含大写字母
- 包含小写字母
- 包含数字
- 包含特殊字符

示例：
"VeryStr0ng!Pass@word#2024"
```

### 3. 主密码轮换

```typescript
// 定期轮换主密码（建议每180天）
async function rotateMasterPassword(
  projectId: string,
  oldPassword: string,
  newPassword: string
) {
  // 1. 使用旧密码解密所有密钥
  const { keys } = await kms.listKeys(projectId);
  const decryptedKeys = [];

  for (const key of keys) {
    const keyValue = await kms.getKey(projectId, oldPassword, key.keyId);
    decryptedKeys.push({
      keyId: key.keyId,
      value: keyValue.value,
      keyType: key.keyType,
      tags: key.tags,
      description: key.description
    });
  }

  // 2. 更新项目主密码（需要实现此方法）
  // await kms.updateProjectMasterPassword(projectId, oldPassword, newPassword);

  // 3. 使用新密码重新加密所有密钥
  for (const keyData of decryptedKeys) {
    await kms.createKey(projectId, newPassword, keyData);
    await kms.deleteKey(projectId, key.keyId);
  }
}
```

## 常见问题

### Q1: 忘记主密码怎么办？

**A:** 无法恢复。主密码不存储在系统中，忘记后无法找回。需要：
1. 删除所有加密的密钥
2. 创建新项目并设置新主密码
3. 重新添加所有密钥

### Q2: 可以在应用启动后缓存主密钥吗？

**A:** 可以，但需要谨慎：

```typescript
class KMSCacheManager {
  private masterKeyCache: Map<string, Buffer> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5分钟

  async getCachedMasterKey(
    projectId: string,
    masterPassword: string
  ): Promise<Buffer> {
    // 检查缓存
    if (this.masterKeyCache.has(projectId)) {
      return this.masterKeyCache.get(projectId)!;
    }

    // 派生主密钥
    const masterKey = await deriveProjectMasterKey(projectId, masterPassword);

    // 缓存并设置超时
    this.masterKeyCache.set(projectId, masterKey);
    setTimeout(() => {
      this.masterKeyCache.delete(projectId);
    }, this.cacheTimeout);

    return masterKey;
  }
}
```

### Q3: 不同项目可以共享主密码吗？

**A:** 不推荐。每个项目应该有独立的主密码。即使密码相同，由于盐值不同，派生的主密钥也不同。

### Q4: 主密码可以改吗？

**A:** 可以，但需要：
1. 使用旧主密码解密所有密钥
2. 更新项目的主密码哈希和盐值
3. 使用新主密码重新加密所有密钥

这个功能需要额外实现。

## 总结

| 项目 | 说明 |
|------|------|
| 主密码 | 用户设置，永不存储 |
| 主密钥 | 从主密码派生，只存储哈希值 |
| 数据密钥 | 用主密钥加密后存储在数据库 |
| 使用时 | 每次都需要提供主密码来派生主密钥 |

这种设计确保了即使数据库泄露，攻击者也无法获取密钥的明文值，因为他们没有主密码。

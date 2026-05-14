# 加密连接字符串使用指南

## 概述

KMS 支持使用 RSA-4096 非对称加密来保护 MongoDB 连接字符串。

### 特点

- **非对称加密**: 使用公钥加密，私钥解密
- **无法逆向**: 即使加密数据泄露，没有私钥也无法解密
- **私钥保护**: 私钥可以使用密码保护
- **密钥轮换**: 支持密钥 ID，便于密钥轮换

---

## 快速开始

### 1. 生成密钥对

使用工具生成 RSA 密钥对（推荐设置密码保护）：

```bash
# 安装 TypeScript 和依赖
npm install

# 生成带密码保护的密钥对
npx ts-node tools/encrypt-connection.ts generate-key-pair "your-strong-password-123"
```

生成的文件：
```
keys/
├── public_key.pem   # 公钥（可以安全分享）
└── private_key.pem  # 私钥（请妥善保管！）
```

### 2. 加密连接字符串

```bash
npx ts-node tools/encrypt-connection.ts encrypt \
  "mongodb://localhost:27017/kms" \
  keys/public_key.pem
```

生成的加密配置：
```json
{
  "encryptedConnectionString": "{\"encrypted\":\"...\",\"iv\":\"...\",\"authTag\":\"...\",\"algorithm\":\"RSA-OAEP-4096\",\"keyId\":\"key_...\"}",
  "algorithm": "RSA-OAEP-4096",
  "keyId": "key_...",
  "createdAt": "2026-05-13T..."
}
```

### 3. 在代码中使用

#### 方式一：直接使用加密配置

```typescript
import { KMSClient } from '@pzdemons/kms';
import * as fs from 'fs';

// 读取加密配置和私钥
const encryptedConfig = JSON.parse(fs.readFileSync('config/encrypted-db.json', 'utf-8'));
const privateKey = fs.readFileSync('keys/private_key.pem', 'utf-8');

// 创建客户端
const kms = new KMSClient({
  encryptedConnectionString: encryptedConfig.encryptedConnectionString,
  databaseName: 'kms',
  privateKey: privateKey,
  // privateKeyPassphrase: 'your-password' // 如果私钥有密码保护
});

await kms.connect();
```

#### 方式二：使用环境变量（推荐）

```bash
# .env 文件
KMS_PRIVATE_KEY="-----BEGIN ENCRYPTED PRIVATE KEY-----\n..."
KMS_PRIVATE_KEY_PASSPHRASE="your-password"
```

```typescript
import { KMSClient } from '@pzdemons/kms';
import * as fs from 'fs';

const encryptedConfig = JSON.parse(fs.readFileSync('config/encrypted-db.json', 'utf-8'));

const kms = new KMSClient({
  encryptedConnectionString: encryptedConfig.encryptedConnectionString,
  databaseName: 'kms',
  // privateKey 和 privateKeyPassphrase 会自动从环境变量读取
});

await kms.connect();
```

#### 方式三：使用配置加载工具

```typescript
import { KMSClient } from '@pzdemons/kms';
import { loadEncryptedConfig } from '@pzdemons/kms/utils';

// 自动从配置文件和环境变量加载
const config = loadEncryptedConfig('config/encrypted-db.json');

const kms = new KMSClient(config);
await kms.connect();
```

---

## 安全最佳实践

### 1. 密钥存储

| 类型 | 存储位置 | 是否可以提交到代码库 |
|------|---------|---------------------|
| 公钥 (`public_key.pem`) | 代码库 | ✅ 可以 |
| 私钥 (`private_key.pem`) | 密钥管理服务 / 环境变量 | ❌ 不可以 |
| 私钥密码 | 环境变量 / 密钥管理服务 | ❌ 不可以 |
| 加密配置文件 | 代码库 | ✅ 可以 |

### 2. 生产环境建议

```bash
# 使用环境变量或密钥管理服务
export KMS_PRIVATE_KEY="$(cat /path/to/private_key.pem)"
export KMS_PRIVATE_KEY_PASSPHRASE="your-production-password"
```

### 3. 密钥轮换

```bash
# 1. 生成新的密钥对
npx ts-node tools/encrypt-connection.ts generate-key-pair "new-password"

# 2. 使用新公钥重新加密连接字符串
npx ts-node tools/encrypt-connection.ts encrypt \
  "mongodb://localhost:27017/kms" \
  keys/public_key_new.pem

# 3. 更新部署中的私钥
export KMS_PRIVATE_KEY="$(cat keys/private_key_new.pem)"
export KMS_PRIVATE_KEY_PASSPHRASE="new-password"
```

---

## 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `KMS_PRIVATE_KEY` | PEM 格式的私钥 | 使用加密配置时必需 |
| `KMS_PRIVATE_KEY_PASSPHRASE` | 私钥密码 | 如果私钥有密码保护 |
| `KMS_ENCRYPTED_CONFIG_PATH` | 加密配置文件路径 | 可选 |

---

## 工具命令参考

```bash
# 生成密钥对
npx ts-node tools/encrypt-connection.ts generate-key-pair [passphrase]

# 加密连接字符串
npx ts-node tools/encrypt-connection.ts encrypt <connection-string> <public-key-file>

# 解密（测试用）
npx ts-node tools/encrypt-connection.ts decrypt <encrypted-config-file> <private-key-file> [passphrase]
```

---

## 故障排除

### 私钥密码错误

```
Error: Failed to decrypt connection string: bad decrypt
```

**解决方案**: 检查 `KMS_PRIVATE_KEY_PASSPHRASE` 环境变量或传入的密码是否正确。

### 私钥格式错误

```
Error: Private key is required for encrypted connection string
```

**解决方案**: 确保 `KMS_PRIVATE_KEY` 环境变量已设置，或传入正确的私钥。

### 配置文件不存在

```
Error: ENOENT: no such file or directory, open 'config/encrypted-db.json'
```

**解决方案**: 确保已使用工具生成加密配置文件。

---

## 安全原理

1. **RSA-4096**: 使用 4096 位 RSA 密钥，安全性极高
2. **OAEP 填充**: 使用最优非对称加密填充方案
3. **SHA-256**: OAEP 哈希算法
4. **私钥加密**: 私钥可以使用 AES-256-CBC 加密存储

即使攻击者获得了：
- 加密的连接字符串
- 公钥
- 源代码

他们仍然无法解密连接字符串，因为缺少私钥。

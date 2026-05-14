# TLS/SSL 配置完整流程

## 什么是 TLS/SSL？

**TLS** (Transport Layer Security) 和 **SSL** (Secure Sockets Layer) 是加密协议，用于在网络传输中保护数据安全。

**作用**：
- ✅ 加密数据传输（防止窃听）
- ✅ 验证服务器身份（防止中间人攻击）
- ✅ 确保数据完整性（防止篡改）

---

## 配置流程概览

```
1. 准备证书 → 2. 配置 MongoDB → 3. 配置 KMS → 4. 测试连接 → 5. 部署使用
```

---

## 场景 1: MongoDB Atlas（最简单）⭐ 推荐

### 流程图

```
┌─────────────┐
│ 1. 创建     │
│ Atlas 账户  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 2. 创建集群  │
│ 选择版本    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 3. 获取     │
│ 连接字符串  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 4. 使用     │
│ mongodb+srv│
│ 协议连接   │
└─────────────┘

自动启用 TLS ✅
```

### 详细步骤

#### 步骤 1: 创建 MongoDB Atlas 账户

1. 访问 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. 注册并创建免费账户
3. 验证邮箱

#### 步骤 2: 创建集群

1. 点击 "Build a Cluster"
2. 选择 "FREE" 版本（512MB 存储）
3. 选择云服务商和区域
4. 集群名称（如：`kms-cluster`）
5. 点击 "Create Cluster"

#### 步骤 3: 创建数据库用户

1. 在 "Database Access" 中点击 "Add New Database User"
2. 输入用户名和密码（请保存密码）
3. 用户权限选择 "Read and write to any database"
4. 点击 "Add User"

#### 步骤 4: 网络白名单

1. 在 "Network Access" 中点击 "Add IP Address"
2. 选择 "Allow Access from Anywhere"（仅开发环境）
3. 或添加具体 IP 地址（生产环境）
4. 点击 "Confirm"

#### 步骤 5: 获取连接字符串

1. 点击 "Connect"
2. 选择 "Connect your application"
3. 选择 "Node.js" 版本
4. 复制连接字符串，格式如：
   ```
   mongodb+srv://<username>:<password>@kms-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

#### 步骤 6: 在 KMS 中使用

```javascript
const { KMSClient } = require('@pengzi/kms');

const kms = new KMSClient({
  connectionString: 'mongodb+srv://user:pass@kms-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority',
  databaseName: 'kms'
});

await kms.connect();
// ✅ TLS 自动启用，无需额外配置
```

---

## 场景 2: 自建 MongoDB + TLS（生产环境）

### 流程图

```
┌─────────────┐
│ 1. 生成     │
│ CA 密钥对   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 2. 生成     │
│ 服务器证书  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 3. 配置     │
│ MongoDB    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 4. 启动     │
│ MongoDB    │
│ (TLS 模式)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 5. 配置     │
│ KMS 客户端  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 6. 测试     │
│ 连接       │
└─────────────┘
```

### 详细步骤

#### 步骤 1: 生成 CA 私钥和证书

```bash
# 创建证书目录
mkdir -p mongodb-certificates
cd mongodb-certificates

# 生成 CA 私钥（2048 位）
openssl genrsa -out ca-key.pem -aes256 4096

# 生成 CA 证书
openssl req -new -x509 -days 3650 -key ca-key.pem -out ca-cert.pem \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=MyCompany/OU=IT/CN=MyCA"

# 查看生成的证书
openssl x509 -in ca-cert.pem -text -noout
```

#### 步骤 2: 生成服务器证书

```bash
# 创建证书签名请求（CSR）
openssl req -newkey rsa:4096 -nodes -keyout server-key.pem -out server-csr.pem \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=MyCompany/OU=IT/CN=localhost"

# 配置扩展文件（可选但推荐）
cat > server.cnf <<EOF
alt_names = subject_alt_names
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = mongodb.example.com
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# 使用 CA 签署服务器证书
openssl x509 -req -in server-csr.pem -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -days 3650 \
  -extfile server.cnf

# 查看生成的证书
openssl x509 -in server-cert.pem -text -noout
```

#### 步骤 3: 合并证书文件（可选）

```bash
# 创建 PEM 文件（包含证书和私钥）
cat server-cert.pem server-key.pem > server.pem

# 验证 PEM 文件
openssl x509 -in server.pem -text -noout
```

#### 步骤 4: 配置 MongoDB

**方式 A: 使用配置文件**

创建 `/etc/mongod.conf`：

```yaml
# 网络配置
net:
  port: 27017
  bindIp: 0.0.0.0
  
# TLS 配置
security:
  enableEncryption: true
  encryptionKeyFile: /path/to/certificates/server-key.pem
  certificateKeyFile: /path/to/certificates/server.pem
  CAFile: /path/to/certificates/ca-cert.pem
  
# 认证配置
authorization:
  enabled: true

# 存储配置
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
```

**方式 B: 使用命令行参数**

```bash
mongod \
  --dbpath /var/lib/mongodb \
  --port 27017 \
  --bind_ip 0.0.0.0 \
  --tlsMode requireTLS \
  --tlsCertificateKeyFile /path/to/certificates/server.pem \
  --tlsCAFile /path/to/certificates/ca-cert.pem \
  --auth \
  --setParameter authenticationMechanisms=SCRAM-SHA-256
```

#### 步骤 5: 启动 MongoDB

```bash
# 启动 MongoDB（使用配置文件）
mongod --config /etc/mongod.conf

# 或使用命令行参数
mongod \
  --dbpath /var/lib/mongodb \
  --tlsMode requireTLS \
  --tlsCertificateKeyFile /path/to/certificates/server.pem \
  --tlsCAFile /path/to/certificates/ca-cert.pem
```

#### 步骤 6: 验证 MongoDB TLS

```bash
# 使用 mongo shell 连接测试
mongo --tls \
  --tlsCAFile /path/to/certificates/ca-cert.pem \
  --host localhost \
  --port 27017

# 或使用 mongodb connection string URI
mongo "mongodb://localhost:27017/?tls=true&tlsCAFile=/path/to/certificates/ca-cert.pem"
```

#### 步骤 7: 在 KMS 中配置

```javascript
const { KMSClient } = require('@pengzi/kms');

const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017/kms',
  databaseName: 'kms',
  connectionOptions: {
    tls: true,
    tlsCAFile: '/path/to/certificates/ca-cert.pem',
    tlsCertificateKeyFile: '/path/to/certificates/server.pem',
    // 以下选项仅开发环境使用：
    // tlsAllowInvalidCertificates: false,
    // tlsAllowInvalidHostnames: false
  }
});

await kms.connect();
console.log('✅ TLS 连接成功！');
```

---

## 场景 3: 开发环境（自签名证书）

### 流程图

```
┌─────────────┐
│ 1. 生成     │
│ 自签名证书 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 2. 配置     │
│ MongoDB    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 3. 配置 KMS │
│ (允许无效   │
│  证书)      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 4. 测试     │
│ 连接       │
└─────────────┘
```

### 快速配置

#### 步骤 1: 生成自签名证书

```bash
# 快速生成自签名证书
openssl req -newkey rsa:2048 -nodes -keyout server-key.pem \
  -out server-cert.pem -x509 -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

#### 步骤 2: 启动 MongoDB

```bash
mongod \
  --dbpath /data/db \
  --port 27017 \
  --tlsMode requireTLS \
  --tlsCertificateKeyFile server-cert.pem \
  --tlsCAFile server-cert.pem
```

#### 步骤 3: 配置 KMS（开发模式）

```javascript
const { KMSClient } = require('@pengzi/kms');

const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017/kms',
  databaseName: 'kms',
  connectionOptions: {
    tls: true,
    tlsAllowInvalidCertificates: true,  // 允许自签名证书
    tlsAllowInvalidHostnames: true       // 允许主机名不匹配
  }
});

await kms.connect();
```

---

## 配置文件组织

### 推荐的目录结构

```
project-root/
├── config/
│   ├── certificates/
│   │   ├── ca-cert.pem          # CA 证书
│   │   ├── server-cert.pem      # 服务器证书
│   │   └── server-key.pem       # 服务器私钥（保密）
│   └── mongodb.conf             # MongoDB 配置
├── src/
│   └── app.js
└── .env                         # 环境变量（不提交）
```

### 环境变量配置

```bash
# MongoDB 配置
MONGODB_URI=mongodb://localhost:27017/kms
MONGODB_TLS=true
MONGODB_CA_FILE=/path/to/ca-cert.pem

# 开发环境
NODE_ENV=development
```

---

## 测试验证

### 1. 测试 MongoDB TLS

```bash
# 测试 TLS 连接
mongosh --tls \
  --tlsCAFile /path/to/ca-cert.pem \
  "mongodb://localhost:27017/?tls=true"

# 应该成功连接
```

### 2. 测试 KMS 连接

```javascript
// test-connection.js
const { KMSClient } = require('@pengzi/kms');

async function testConnection() {
  const kms = new KMSClient({
    connectionString: 'mongodb://localhost:27017/kms',
    databaseName: 'kms',
    connectionOptions: {
      tls: true,
      tlsCAFile: '/path/to/ca-cert.pem'
    }
  });

  try {
    await kms.connect();
    console.log('✅ TLS 连接成功！');
    
    // 测试基本操作
    const projects = await kms.listProjects();
    console.log(`✅ 找到 ${projects.length} 个项目`);
    
    await kms.disconnect();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
  }
}

testConnection();
```

### 3. 验证证书信息

```bash
# 检查证书详细信息
openssl x509 -in server-cert.pem -text -noout

# 验证证书和私钥是否匹配
openssl x509 -noout -modulus -in server-cert.pem | openssl md5
openssl rsa -noout -modulus -in server-key.pem | openssl md5

# 两个输出应该相同
```

---

## 常见问题和解决方案

### 问题 1: "unable to verify the first certificate"

**原因**: CA 证书路径不正确

**解决方案**:
```bash
# 检查 CA 证书文件
ls -la /path/to/ca-cert.pem

# 验证证书文件
openssl x509 -in /path/to/ca-cert.pem -text -noout

# 确认路径正确
kms.connectionOptions.tlsCAFile = '/absolute/path/to/ca-cert.pem'
```

### 问题 2: "Hostname verification failed"

**原因**: 证书中的主机名与连接主机名不匹配

**解决方案**:
```javascript
// 开发环境：允许无效主机名
connectionOptions: {
  tls: true,
  tlsAllowInvalidHostnames: true
}

// 生产环境：重新生成包含正确主机名的证书
```

### 问题 3: "Certificate verify failed"

**原因**: 证书已过期或无效

**解决方案**:
```bash
# 检查证书有效期
openssl x509 -in server-cert.pem -noout -dates

# 重新生成证书
openssl x509 -req -in server-csr.pem -CA ca-cert.pem \
  -CAkey ca-key.pem -CAcreateserial \
  -out server-cert.pem -days 3650
```

### 问题 4: "Permission denied"

**原因**: 证书文件权限不正确

**解决方案**:
```bash
# 设置正确的文件权限
chmod 600 server-key.pem  # 私钥只有所有者可读
chmod 644 server-cert.pem # 证书和 CA 证书可读

# 确保用户有读取权限
ls -la /path/to/certificates/
```

---

## 生产环境检查清单

部署前确认：

- [ ] 已使用正规 CA 签发的证书（非自签名）
- [ ] 证书未过期
- [ ] 私钥文件权限设置为 600
- [ ] 已启用 TLS 验证（allowInvalidCertificates: false）
- [ ] 已启用主机名验证
- [ ] MongoDB 配置了 requireTLS
- [ ] 应用程序使用 TLS 连接
- [ ] 防火墙已配置正确
- [ ] 已设置证书过期监控
- [ ] 有证书更新流程

---

## 安全最佳实践

### ✅ 生产环境

1. **使用正规 CA 证书**
   - Let's Encrypt（免费）
   - 商业 CA（企业级）
   
2. **定期更新证书**
   - 设置过期提醒
   - 自动化更新流程
   
3. **保护私钥**
   - 严格的文件权限（600）
   - 存储在安全位置
   - 不要提交到代码仓库

4. **启用完整验证**
   ```javascript
   connectionOptions: {
     tls: true,
     tlsCAFile: '/path/to/ca.pem',
     tlsAllowInvalidCertificates: false,  // 必须为 false
     tlsAllowInvalidHostnames: false        // 必须为 false
   }
   ```

### ❌ 开发环境

可以接受：
- 自签名证书
- allowInvalidCertificates: true
- allowInvalidHostnames: true

---

## 工具和资源

### 生成工具

- [OpenSSL](https://www.openssl.org/) - 证书生成工具
- [Let's Encrypt](https://letsencrypt.org/) - 免费 CA
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - 托管 MongoDB

### 相关文档

- [MongoDB TLS/SSL 配置](https://www.mongodb.com/docs/manual/tutorial/configure-ssl/)
- [Node.js TLS 配置](https://nodejs.org/api/tls.html)
- [OpenSSL 快速参考](https://www.openssl.org/docs/)

---

**记住**：生产环境必须使用 TLS！🔒

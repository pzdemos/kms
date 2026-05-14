# MongoDB TLS/SSL 安全连接指南

## 为什么需要 TLS/SSL？

生产环境中，**必须**使用 TLS/SSL 加密连接来保护数据传输安全。

- ❌ **明文连接**：数据以明文传输，可被中间人攻击
- ✅ **TLS 连接**：所有数据加密传输，防止窃听和篡改

---

## 快速开始

### 1. MongoDB Atlas（云服务）

MongoDB Atlas **默认启用 TLS**，只需在连接字符串中添加 `tls=true`：

```javascript
const kms = new KMSClient({
  connectionString: 'mongodb+srv://user:pass@cluster.mongodb.net/kms?tls=true',
  databaseName: 'kms'
});
```

### 2. 自建 MongoDB + TLS

如果你的 MongoDB 已配置 TLS，可以这样连接：

```javascript
const kms = new KMSClient({
  connectionString: 'mongodb://user:pass@localhost:27017/kms',
  databaseName: 'kms',
  connectionOptions: {
    tls: true,
    tlsCAFile: '/path/to/ca.pem',  // CA 证书文件
    tlsCertificateKeyFile: '/path/to/client.pem'  // 客户端证书
  }
});
```

---

## 配置选项

### connectionOptions 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tls` | boolean | false | 启用 TLS/SSL |
| `tlsCAFile` | string | undefined | CA 证书文件路径 |
| `tlsCertificateKeyFile` | string | undefined | 客户端证书文件路径 |
| `tlsAllowInvalidCertificates` | boolean | false | 允许无效证书（⚠️ 仅开发环境） |
| `tlsAllowInvalidHostnames` | boolean | false | 允许无效主机名（⚠️ 仅开发环境） |

---

## 使用场景

### 场景 1: MongoDB Atlas（推荐）

MongoDB Atlas 自动处理 TLS 证书：

```javascript
const kms = new KMSClient({
  connectionString: 'mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/kms?retryWrites=true&w=majority',
  databaseName: 'kms'
});

await kms.connect();
```

**注意**：`mongodb+srv://` 协议会自动启用 TLS，无需额外配置。

---

### 场景 2: 开发环境（自签名证书）

在开发环境中，可以使用自签名证书：

```javascript
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017/kms',
  databaseName: 'kms',
  connectionOptions: {
    tls: true,
    tlsAllowInvalidCertificates: true,  // 允许自签名证书
    tlsAllowInvalidHostnames: true
  }
});
```

⚠️ **警告**：这些选项仅用于开发环境，不要在生产环境使用！

---

### 场景 3: 生产环境（正规 CA 证书）

在生产环境中，使用正规的 CA 签发的证书：

```javascript
const kms = new KMSClient({
  connectionString: 'mongodb://prod-server:27017/kms',
  databaseName: 'kms',
  connectionOptions: {
    tls: true,
    tlsCAFile: '/etc/ssl/mongodb/ca.pem',
    tlsCertificateKeyFile: '/etc/ssl/mongodb/client.pem'
  }
});
```

---

## MongoDB TLS 配置

### 生成自签名证书（开发环境）

```bash
# 1. 生成 CA 私钥和证书
openssl req -newkey rsa:4096 -new -x509 -days 3650 -nodes -sha256 \
  -keyout ca-key.pem -out ca-cert.pem -subj "/CN=MyCA"

# 2. 生成服务器私钥和证书签名请求
openssl req -newkey rsa:4096 -new -nodes -sha256 \
  -keyout server-key.pem -out server-csr.pem \
  -subj "/CN=localhost"

# 3. 使用 CA 签署服务器证书
openssl x509 -req -in server-csr.pem -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -days 3650 -sha256

# 4. 启动 MongoDB（指定证书）
mongod --dbpath /data/db \
  --tlsMode requireTLS \
  --tlsCertificateKeyFile server-cert.pem \
  --tlsCAFile ca-cert.pem
```

---

### MongoDB 配置文件示例

```yaml
# /etc/mongod.conf
net:
  port: 27017
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/server.pem
    CAFile: /etc/ssl/mongodb/ca.pem
security:
  authorization: enabled
```

---

## KMS 配置示例

### 环境变量配置

```bash
# .env
KMS_MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kms
KMS_DATABASE_NAME=kms
```

```javascript
const kms = new KMSClient({
  connectionString: process.env.KMS_MONGODB_URI,
  databaseName: process.env.KMS_DATABASE_NAME
});
```

---

### 加密连接字符串（最高安全级别）

使用 RSA 非对称加密存储连接字符串：

```bash
# 1. 生成 RSA 密钥对
kms-cli  # 选择"系统设置" → "生成加密密钥对"

# 2. 使用公钥加密连接字符串
# 3. 将加密后的连接字符串存储在配置文件中
```

详细说明请参考：[加密配置指南](./ENCRYPTION.md)

---

## 最佳实践

### ✅ 生产环境

1. **使用 TLS 连接**
   ```javascript
   connectionOptions: { tls: true }
   ```

2. **使用正规的 CA 证书**
   - 不要使用自签名证书
   - 定期更新证书

3. **限制网络访问**
   - 使用防火墙
   - 配置 IP 白名单
   - 使用 VPN

4. **定期审计**
   - 监控连接日志
   - 检查异常访问
   - 定期轮换证书

### ❌ 避免的做法

1. ❌ 在生产环境使用明文连接
2. ❌ 使用 `tlsAllowInvalidCertificates: true`
3. ❌ 将连接字符串硬编码在代码中
4. ❌ 在 URL 中包含敏感信息（使用加密连接字符串）

---

## 故障排查

### 问题 1: TLS 握手失败

**错误信息**：
```
MongoServerError: Connection failure
```

**解决方案**：
- 检查服务器 TLS 配置
- 确认证书文件路径正确
- 验证证书未过期

---

### 问题 2: 主机名验证失败

**错误信息**：
```
MongoServerError: Hostname verification failed
```

**解决方案**：
- 确保证书中的 CN 与主机名匹配
- 或设置 `tlsAllowInvalidHostnames: true`（仅开发环境）

---

### 问题 3: 证书验证失败

**错误信息**：
```
MongoServerError: Unable to verify the first certificate
```

**解决方案**：
- 确认 CA 证书正确配置
- 检查证书链是否完整
- 或设置 `tlsAllowInvalidCertificates: true`（仅开发环境）

---

## 示例代码

### 完整的生产环境配置

```javascript
const { KMSClient, KeyType } = require('@pengzi/kms');

async function secureKMS() {
  // 生产环境配置
  const kms = new KMSClient({
    connectionString: 'mongodb://prod-db.internal:27017',
    databaseName: 'kms',
    connectionOptions: {
      tls: true,
      tlsCAFile: '/etc/ssl/mongodb/ca.pem',
      tlsCertificateKeyFile: '/etc/ssl/mongodb/client.pem',
      maxPoolSize: 50,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000
    }
  });

  await kms.connect();

  // 使用 KMS...
  const project = await kms.createProject('my-app', masterPassword);

  await kms.disconnect();
}
```

---

## 安全检查清单

在部署到生产环境前，请确认：

- [ ] 已启用 TLS/SSL 连接
- [ ] 使用正规 CA 签发的证书
- [ ] 证书未过期
- [ ] 网络访问已限制
- [ ] 连接字符串已加密或存储在安全位置
- [ ] 已配置 IP 白名单
- [ ] 已启用审计日志
- [ ] 已设置监控告警

---

## 相关文档

- [MongoDB TLS/SSL 配置](https://www.mongodb.com/docs/manual/tutorial/configure-ssl/)
- [加密配置指南](./ENCRYPTION.md)
- [安全最佳实践](./SECURITY.md)

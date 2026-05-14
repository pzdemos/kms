# KMS TLS/SSL 安全连接更新

## 更新概述

本次更新添加了 **TLS/SSL 加密连接支持**，解决了明文连接的安全隐患。

## 问题

❌ **之前的版本**
- MongoDB 连接默认使用明文传输
- 生产环境中存在数据泄露风险
- 无法配置 TLS 证书

## 解决方案

✅ **新版本特性**
- 完整的 TLS/SSL 支持
- 灵活的证书配置
- MongoDB Atlas 自动 TLS
- 开发/生产环境适配

## 更新内容

### 1. 类型定义更新

**文件**: `src/types/client.types.ts`

```typescript
export interface KMSClientOptions {
  connectionString: string;
  databaseName: string;
  connectionOptions?: {
    // ... 现有选项
    tls?: boolean;                              // ✅ 新增
    tlsCAFile?: string;                         // ✅ 新增
    tlsCertificateKeyFile?: string;            // ✅ 新增
    tlsAllowInvalidCertificates?: boolean;     // ✅ 新增
    tlsAllowInvalidHostnames?: boolean;        // ✅ 新增
  };
}
```

### 2. 客户端实现

**文件**: `src/client.ts`

```typescript
// 添加 TLS 配置支持
const opts = this.options.connectionOptions as any;
if (opts?.tls) {
  clientOptions.tls = true;
  if (opts.tlsCAFile) clientOptions.tlsCAFile = opts.tlsCAFile;
  // ... 其他 TLS 选项
}
```

### 3. 新增文档

- ✅ `docs/TLS_GUIDE.md` - 完整的 TLS 配置指南
- ✅ `examples/tls-example.js` - TLS 连接示例代码
- ✅ 更新 `README.md` - 添加 TLS 最佳实践

## 使用方式

### MongoDB Atlas（最简单）

```javascript
const kms = new KMSClient({
  connectionString: 'mongodb+srv://user:pass@cluster.mongodb.net/kms',
  databaseName: 'kms'
});
```

**自动启用 TLS**，无需额外配置。

### 自建 MongoDB + TLS

```javascript
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017/kms',
  databaseName: 'kms',
  connectionOptions: {
    tls: true,
    tlsCAFile: '/path/to/ca.pem',
    tlsCertificateKeyFile: '/path/to/client.pem'
  }
});
```

### 开发环境（自签名证书）

```javascript
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017/kms',
  databaseName: 'kms',
  connectionOptions: {
    tls: true,
    tlsAllowInvalidCertificates: true,  // ⚠️ 仅开发环境
    tlsAllowInvalidHostnames: true
  }
});
```

## 安全影响

### 之前（明文连接）

```
客户端 ⚪⚪⚪⚪⚪⚪⚪⚪⚪ MongoDB
      明文数据传输
```

**风险**：
- ❌ 数据可被窃听
- ❌ 连接可被劫持
- ❌ 密钥可被截获

### 现在（TLS 加密）

```
客户端 🔒🔒🔒🔒🔒🔒🔒🔒🔒 MongoDB
      加密数据传输
```

**保护**：
- ✅ 数据加密传输
- ✅ 服务器身份验证
- ✅ 防止中间人攻击

## 兼容性

- ✅ **向后兼容**：现有代码无需修改
- ✅ **默认行为不变**：明文连接仍然可用
- ✅ **可选增强**：可选择启用 TLS

## 发布计划

### 版本号
- **当前版本**: v1.1.1
- **新版本**: v1.2.0（minor 更新，新增功能）

### 发布步骤

```bash
# 1. 更新版本号
npm version minor

# 2. 构建
npm run build
npm run build:cli

# 3. 提交
git add .
git commit -m "feat: 添加 TLS/SSL 加密连接支持

- 添加 TLS/SSL 连接配置选项
- 支持 MongoDB Atlas 自动 TLS
- 支持自建 MongoDB TLS 配置
- 添加开发环境自签名证书支持
- 更新文档和示例代码

安全性提升:
- 解决明文连接安全隐患
- 支持生产级 TLS 配置
- 完整的安全连接指南"

# 4. 发布
npm publish --access public
```

## 测试验证

在发布前需要验证：

- [ ] MongoDB Atlas 连接测试
- [ ] 自建 MongoDB + TLS 测试
- [ ] 开发环境自签名证书测试
- [ ] 向后兼容性测试（现有代码）
- [ ] 文档完整性检查

## 用户迁移指南

### 现有用户（无需强制更改）

现有代码继续工作，但强烈建议升级：

```javascript
// 之前（仍然可用）
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017/kms',
  databaseName: 'kms'
});
```

### 推荐升级（生产环境）

```javascript
// 升级后（更安全）
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017/kms',
  databaseName: 'kms',
  connectionOptions: {
    tls: true,
    tlsCAFile: '/path/to/ca.pem'
  }
});
```

## 文档更新

### 更新的文档

1. **README.md**
   - 添加 TLS 安全最佳实践
   - 更新安全检查清单

2. **TLS_GUIDE.md**（新文档）
   - 完整的 TLS 配置指南
   - MongoDB TLS 配置示例
   - 故障排查指南
   - 安全检查清单

3. **examples/tls-example.js**（新示例）
   - 各种 TLS 配置场景
   - 完整的代码示例

### 相关文档

- [MongoDB TLS/SSL 配置](https://www.mongodb.com/docs/manual/tutorial/configure-ssl/)
- [MongoDB Node.js Driver TLS](https://mongodb.github.io/node-mongodb-native/3.6/reference/connecting/connection-settings/)

## 总结

本次更新解决了 KMS 的明文连接安全问题，提供了完整的 TLS/SSL 支持：

- ✅ **安全性提升**：从明文连接到 TLS 加密
- ✅ **灵活配置**：支持多种 TLS 场景
- ✅ **向后兼容**：不影响现有用户
- ✅ **完整文档**：详细的配置指南和示例

**建议所有生产环境用户启用 TLS 连接！** 🔒

---

**更新时间**: 2025-05-15
**版本**: v1.2.0
**状态**: 待发布

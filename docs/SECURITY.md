# KMS 安全最佳实践

## 目录

- [概述](#概述)
- [密钥安全](#密钥安全)
- [访问控制](#访问控制)
- [网络安全](#网络安全)
- [数据保护](#数据保护)
- [监控与审计](#监控与审计)
- [合规性建议](#合规性建议)

## 概述

本KMS系统采用多层安全架构，确保密钥的安全存储和访问。本文档描述了安全特性和最佳实践建议。

## 核心安全特性

### 1. 加密存储

所有密钥使用以下加密方案：

- **算法**：AES-256-GCM（认证加密）
- **密钥派生**：PBKDF2（100,000次迭代，SHA-256）
- **分层加密**：
  - 每个项目独立的主密钥
  - 每个数据密钥用项目主密钥加密
  - 每次加密使用新的IV和AuthTag

### 2. 访问控制

基于角色的访问控制（RBAC）：

| 角色 | 权限 |
|------|------|
| Admin | 所有权限 |
| Operator | 读取、更新密钥，查看审计日志 |
| Developer | 读取密钥 |
| Readonly | 列出密钥 |
| Auditor | 查看审计日志 |

### 3. 审计日志

完整记录所有操作：
- 密钥的创建、读取、更新、删除
- 用户登录/登出
- 权限变更
- 失败的访问尝试

## 密钥安全

### 主密码管理

**✅ 推荐做法：**

```typescript
// 使用强密码
const masterPassword = generateStrongPassword(32); // 至少32字符

// 使用环境变量存储
const masterPassword = process.env.KMS_MASTER_PASSWORD;

// 使用密钥管理服务（如AWS KMS、Azure Key Vault）
const masterPassword = await getFromKeyVault('kms-master-key');
```

**❌ 避免做法：**

```typescript
// 不要硬编码密码
const masterPassword = 'password123';

// 不要在代码中存储密码
// 不要将密码提交到版本控制
```

### 密钥轮换

定期轮换密钥和主密码：

```typescript
// 轮换密钥值
async function rotateKey(kms, projectId, keyId, masterPassword) {
  const newKeyValue = generateNewConnectionString();
  await kms.updateKey(projectId, masterPassword, keyId, {
    value: newKeyValue
  });
}

// 建议轮换周期：
// - 生产环境密钥：每90天
// - 主密码：每180天
// - API密钥：每30天
```

### 密钥过期

为密钥设置过期时间：

```typescript
await kms.createKey(projectId, masterPassword, {
  keyName: 'temp-key',
  keyType: KeyType.CUSTOM,
  value: 'secret',
  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90天后
});
```

## 访问控制

### 最小权限原则

只授予用户必需的权限：

```typescript
// ✅ 好：授予特定权限
const user = await kms.createUser(projectId, {
  username: 'app-user',
  password: 'SecurePassword123!',
  roles: [Role.DEVELOPER] // 只能读取密钥
});

// ❌ 不好：授予过多权限
const user = await kms.createUser(projectId, {
  username: 'app-user',
  password: 'SecurePassword123!',
  roles: [Role.ADMIN] // 不必要的管理员权限
});
```

### 用户管理

```typescript
// 1. 定期审查用户权限
async function auditUserAccess(kms, projectId) {
  const users = await kms.listUsers(projectId);

  for (const user of users) {
    const logs = await kms.getAuditLogs(projectId, {
      userId: user.userId,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    });

    // 检查30天内未活跃的用户
    if (user.lastLoginAt && logs.total === 0) {
      console.log(`Inactive user: ${user.username}`);
      // 考虑撤销权限或禁用账户
    }
  }
}

// 2. 为不同环境使用不同的用户
const prodUser = 'app-prod-user';
const devUser = 'app-dev-user';
```

## 网络安全

### TLS/SSL

始终使用TLS连接MongoDB：

```typescript
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  // 生产环境使用TLS
  // connectionString: 'mongodb://localhost:27017/?tls=true',
  databaseName: 'kms'
});
```

### IP白名单

限制KMS的访问来源：

```typescript
// 在应用层实现IP白名单中间件
const ipWhitelist = ['192.168.1.100', '10.0.0.50'];

function ipWhitelistMiddleware(req, res, next) {
  const clientIp = req.ip;
  if (!ipWhitelist.includes(clientIp)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}
```

### API速率限制

防止暴力破解攻击：

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100次请求
  message: 'Too many requests'
});

app.use('/api/', limiter);
```

## 数据保护

### 备份加密

加密数据库备份：

```bash
# 使用mongodump时启用加密
mongodump --uri="mongodb://localhost:27017/kms" \
  --archive=kms-backup.gz \
  --gzip
```

### 环境变量

使用环境变量存储敏感配置：

```typescript
// .env文件（不要提交到版本控制）
KMS_MONGODB_URI=mongodb://localhost:27017
KMS_DATABASE_NAME=kms
KMS_MASTER_PASSWORD=your-master-password

// 在代码中使用
const kms = new KMSClient({
  connectionString: process.env.KMS_MONGODB_URI,
  databaseName: process.env.KMS_DATABASE_NAME
});
```

### .gitignore

确保敏感文件不被提交：

```gitignore
# 环境变量
.env
.env.local
.env.*.local

# 密钥文件
*.key
*.pem
secrets/

# 备份文件
*.backup
*.bak
```

## 监控与审计

### 实时监控

监控异常活动：

```typescript
// 监控失败的登录尝试
async function monitorFailedLogins(kms, projectId) {
  const since = new Date(Date.now() - 60 * 60 * 1000); // 1小时前
  const failedCount = await kms.auditService.countFailedLogins(projectId, null, since);

  if (failedCount > 10) {
    // 发送告警
    alertSecurityTeam(`High number of failed logins: ${failedCount}`);
  }
}

// 定期执行监控
setInterval(() => monitorFailedLogins(kms, projectId), 5 * 60 * 1000); // 每5分钟
```

### 审计日志分析

定期分析审计日志：

```typescript
async function analyzeAuditLogs(kms, projectId) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 查找可疑活动
  const suspiciousLogs = await kms.getAuditLogs(projectId, {
    startDate: yesterday,
    success: false,
    action: AuditAction.PERMISSION_DENIED
  });

  if (suspiciousLogs.total > 0) {
    console.log('Suspicious activities detected:');
    suspiciousLogs.logs.forEach(log => {
      console.log(`- ${log.action} by ${log.userId} at ${log.timestamp}`);
    });
  }
}
```

### 告警设置

设置关键操作的告警：

- 密钥删除操作
- 多次认证失败
- 异常访问模式
- 权限变更

## 合规性建议

### SOC 2 / ISO 27001

1. **访问控制**：实施严格的身份认证和授权
2. **加密**：所有敏感数据加密存储和传输
3. **审计**：维护完整的审计日志
4. **监控**：实时监控安全事件
5. **备份**：定期备份并测试恢复

### GDPR 数据保护

1. **数据最小化**：只收集必要的数据
2. **访问控制**：限制个人数据访问
3. **数据保留**：设置合理的数据保留期限
4. **数据删除**：实现被遗忘权
5. **数据保护影响评估**：定期评估风险

### PCI DSS（如果处理支付数据）

1. **加密传输**：使用TLS 1.2或更高版本
2. **加密存储**：使用强加密算法
3. **访问控制**：基于角色的访问控制
4. **日志记录**：记录所有访问密钥的操作
5. **定期测试**：定期进行安全测试

## 安全检查清单

### 部署前检查

- [ ] 所有密钥使用AES-256-GCM加密
- [ ] 主密码满足复杂度要求（至少12字符，包含大小写字母、数字、特殊字符）
- [ ] 启用MongoDB TLS/SSL
- [ ] 配置IP白名单（如适用）
- [ ] 设置速率限制
- [ ] 配置审计日志
- [ ] 设置监控和告警

### 运行时检查

- [ ] 定期轮换密钥（建议每90天）
- [ ] 定期轮换主密码（建议每180天）
- [ ] 审查用户权限（每月）
- [ ] 监控异常登录尝试
- [ ] 检查密钥过期状态
- [ ] 备份数据库并加密备份
- [ ] 测试灾难恢复流程

### 开发环境检查

- [ ] 使用不同的数据库实例
- [ ] 使用测试密钥和凭证
- [ ] 不要将真实密钥提交到版本控制
- [ ] 使用环境变量管理配置
- [ ] 实施代码审查流程

## 安全事件响应

如果发现安全漏洞：

1. **立即响应**
   - 撤销受影响的密钥
   - 禁用可疑账户
   - 保留审计日志

2. **评估影响**
   - 确定泄露范围
   - 识别受影响的数据
   - 评估潜在损失

3. **通知相关方**
   - 通知安全团队
   - 通知管理层
   - 如需，通知监管机构和受影响用户

4. **修复漏洞**
   - 轮换所有密钥
   - 更新访问控制
   - 加强监控

5. **事后分析**
   - 根因分析
   - 改进安全措施
   - 更新安全策略

## 联系方式

如发现安全漏洞或有问题，请联系：
- 安全团队邮箱：security@yourcompany.com
- 紧急联系电话：+1-xxx-xxx-xxxx

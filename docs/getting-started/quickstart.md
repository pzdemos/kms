# KMS 快速入门指南

这是一个 5 分钟快速入门指南，帮助你快速上手 KMS 密钥管理系统。

## 安装

```bash
# 全局安装
npm install -g @pengzi/kms

# 或者本地安装
npm install @pengzi/kms
```

## 启动

```bash
kms
```

## 第一步：创建项目

1. 启动后会看到主菜单，输入 `1` 选择"项目管理"
2. 输入 `1` 选择"创建新项目"
3. 按提示输入：
   - 项目名称：`my-first-project`
   - 主密码：`MySecurePassword123!`（请妥善保管，至少8个字符）
   - 确认创建：输入 `y`

## 第二步：创建密钥

1. 输入 `0` 返回主菜单，然后输入 `2` 选择"密钥管理"
2. 输入 `1` 选择"创建密钥"
3. 按提示输入：
   - 选择项目：`1`（选择刚创建的项目）
   - 密钥名称：`my-database`
   - 密钥类型：`1`（选择 mongodb）
   - 密钥值：`mongodb://user:password@localhost:27017/mydb`
   - 描述：`我的主数据库`
   - 标签：`production,database`（可选）
   - 主密码：`MySecurePassword123!`
   - 确认创建：输入 `y`

## 第三步：查看密钥列表

1. 输入 `2` 选择"查看所有密钥"
2. 选择项目：`1`
3. 查看密钥列表（不包括密钥值）

## 第四步：获取密钥值

1. 输入 `3` 选择"获取密钥值"
2. 选择项目：`1`
3. 选择密钥：`1`（选择刚创建的密钥）
4. 输入主密码：`MySecurePassword123!`
5. 查看解密后的密钥值

## 恭喜！

你已经成功创建了第一个项目和密钥。现在可以：

- **创建更多密钥**：在同一个项目下创建多个密钥
- **创建用户**：为团队成员创建账户和分配权限
- **查看审计日志**：监控所有密钥操作

## 下一步

- 📖 阅读完整文档：[CLI 使用指南](./docs/CLI_GUIDE.md)
- 🔐 了解安全最佳实践：[安全指南](./docs/SECURITY.md)
- 💻 查看 Node.js SDK 使用示例：[API 文档](./docs/API.md)

## 常见问题

### 忘记主密码怎么办？

主密码用于加密项目的所有密钥，如果忘记：
- **无法恢复**加密的密钥
- 需要重新创建项目
- 建议将主密码存储在安全的密码管理器中

### 如何在代码中使用？

```typescript
import { KMSClient, KeyType } from '@pengzi/kms';

const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms'
});

await kms.connect();
kms.setCurrentUser('your-user-id');

// 获取密钥
const keyValue = await kms.getKey(
  'project-id',
  'master-password',
  'key-id'
);

console.log('密钥值:', keyValue.value);
```

### 数据存储在哪里？

所有数据存储在 MongoDB 数据库中，包括：
- 项目信息
- 加密的密钥值
- 用户信息
- 审计日志

默认数据库名称：`kms`

### 如何备份？

定期备份 MongoDB 数据库：

```bash
# 备份
mongodump --db kms --out /backup/kms-$(date +%Y%m%d)

# 恢复
mongorestore --db kms /backup/kms-20231201/kms
```

## 安全提示

⚠️ **重要安全提醒**：

1. **主密码安全**
   - 使用强密码（至少12个字符）
   - 不要与他人共享
   - 定期更换（建议每180天）

2. **密钥值安全**
   - 密钥值会在终端显示，请确保周围没有他人
   - 不要在日志中记录密钥值
   - 定期轮换密钥（建议每90天）

3. **访问控制**
   - 为不同用户分配适当的角色
   - 定期审查用户权限
   - 监控审计日志

## 获取帮助

- 📚 [完整文档](./docs)
- 🐛 [问题反馈](https://github.com/pengzi/kms/issues)
- 💬 [讨论区](https://github.com/pengzi/kms/discussions)

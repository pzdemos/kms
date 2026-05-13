/**
 * 基础使用示例
 */

import { KMSClient, KeyType, Role } from '../src';

async function basicUsageExample() {
  // 1. 初始化客户端
  const kms = new KMSClient({
    connectionString: 'mongodb://localhost:27017',
    databaseName: 'kms',
  });

  // 连接到数据库
  await kms.connect();

  try {
    // 2. 设置当前用户（假设已登录）
    kms.setCurrentUser('admin_user_id');

    // 3. 创建项目
    const project = await kms.createProject(
      'my-application',
      'very-strong-master-password-123!',
      {
        environment: 'production',
        department: 'engineering',
      }
    );

    console.log('Project created:', project.projectId);

    // 4. 创建数据库连接密钥
    const mongodbKey = await kms.createKey(
      project.projectId,
      'very-strong-master-password-123!',
      {
        keyName: 'mongodb-primary',
        keyType: KeyType.MONGODB,
        value: 'mongodb://user:password@localhost:27017/mydb',
        tags: ['production', 'database', 'mongodb'],
        description: 'Primary MongoDB database connection',
      }
    );

    console.log('Key created:', mongodbKey.keyId);

    // 5. 创建Redis连接密钥
    const redisKey = await kms.createKey(
      project.projectId,
      'very-strong-master-password-123!',
      {
        keyName: 'redis-cache',
        keyType: KeyType.REDIS,
        value: 'redis://localhost:6379',
        tags: ['production', 'cache'],
        description: 'Redis cache server',
      }
    );

    console.log('Redis key created:', redisKey.keyId);

    // 6. 列出所有密钥
    const { keys, total } = await kms.listKeys(project.projectId);
    console.log(`Total keys: ${total}`);
    keys.forEach((key) => {
      console.log(`- ${key.keyName} (${key.keyType})`);
    });

    // 7. 获取特定密钥（自动解密）
    const retrievedKey = await kms.getKey(
      project.projectId,
      'very-strong-master-password-123!',
      mongodbKey.keyId
    );

    console.log('Retrieved key value:', retrievedKey.value);

    // 8. 按标签过滤密钥
    const prodKeys = await kms.listKeys(project.projectId, {
      tags: ['production'],
    });
    console.log(`Production keys: ${prodKeys.total}`);

    // 9. 更新密钥
    await kms.updateKey(
      project.projectId,
      'very-strong-master-password-123!',
      mongodbKey.keyId,
      {
        description: 'Updated description',
        tags: ['production', 'database', 'mongodb', 'updated'],
      }
    );

    // 10. 查看审计日志
    const auditLogs = await kms.getAuditLogs(project.projectId, {
      page: 1,
      limit: 10,
    });
    console.log(`Audit logs: ${auditLogs.total}`);

    // 11. 删除密钥
    // await kms.deleteKey(project.projectId, redisKey.keyId);

    // 12. 删除项目
    // await kms.deleteProject(project.projectId);

  } finally {
    // 断开连接
    await kms.disconnect();
  }
}

// 运行示例
basicUsageExample().catch(console.error);

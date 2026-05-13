/**
 * 数据库连接管理示例
 * 展示如何使用KMS管理多个数据库连接
 */

import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { KMSClient, KeyType } from '../src';

class DatabaseManager {
  private kms: KMSClient;
  private connections: Map<string, any> = new Map();

  constructor(kms: KMSClient) {
    this.kms = kms;
  }

  /**
   * 获取MongoDB连接
   */
  async getMongoConnection(projectId: string, masterPassword: string, keyName: string): Promise<MongoClient> {
    const cacheKey = `${projectId}:${keyName}`;

    // 检查缓存
    if (this.connections.has(cacheKey)) {
      return this.connections.get(cacheKey);
    }

    // 从KMS获取连接字符串
    const key = await this.kms.getKey(projectId, masterPassword, keyName);

    // 创建连接
    const client = new MongoClient(key.value);
    await client.connect();

    // 缓存连接
    this.connections.set(cacheKey, client);

    return client;
  }

  /**
   * 获取Redis连接
   */
  async getRedisConnection(projectId: string, masterPassword: string, keyName: string): Promise<any> {
    const cacheKey = `${projectId}:${keyName}`;

    // 检查缓存
    if (this.connections.has(cacheKey)) {
      return this.connections.get(cacheKey);
    }

    // 从KMS获取连接字符串
    const key = await this.kms.getKey(projectId, masterPassword, keyName);

    // 创建连接
    const client = createClient({ url: key.value });
    await client.connect();

    // 缓存连接
    this.connections.set(cacheKey, client);

    return client;
  }

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    for (const [key, connection] of this.connections.entries()) {
      try {
        await connection.close();
        this.connections.delete(key);
      } catch (error) {
        console.error(`Error closing connection ${key}:`, error);
      }
    }
  }
}

// 使用示例
async function example() {
  const kms = new KMSClient({
    connectionString: 'mongodb://localhost:27017',
    databaseName: 'kms',
  });

  await kms.connect();
  kms.setCurrentUser('admin_user_id');

  const dbManager = new DatabaseManager(kms);

  try {
    const projectId = 'my_project_id';
    const masterPassword = 'my-master-password';

    // 使用MongoDB
    const mongoClient = await dbManager.getMongoConnection(
      projectId,
      masterPassword,
      'mongodb-primary'
    );

    const db = mongoClient.db('mydb');
    const collection = db.collection('users');
    const users = await collection.find({}).toArray();
    console.log('Users:', users);

    // 使用Redis
    const redisClient = await dbManager.getRedisConnection(
      projectId,
      masterPassword,
      'redis-cache'
    );

    await redisClient.set('key', 'value');
    const value = await redisClient.get('key');
    console.log('Redis value:', value);

  } finally {
    await dbManager.closeAll();
    await kms.disconnect();
  }
}

export { DatabaseManager };

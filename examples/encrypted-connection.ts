/**
 * 使用加密连接字符串的示例
 */

import { KMSClient, KeyType } from '../src';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 方式一：直接使用加密配置
 */
async function example1_DirectConfig() {
  console.log('\n=== 方式一：直接使用加密配置 ===\n');

  // 读取加密配置
  const configPath = path.join(__dirname, '..', 'config', 'encrypted-db.json');
  const encryptedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // 读取私钥（在实际应用中，应该从安全的位置获取）
  const privateKeyPath = path.join(__dirname, '..', 'keys', 'private_key.pem');
  const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

  // 创建客户端
  const kms = new KMSClient({
    encryptedConnectionString: encryptedConfig.encryptedConnectionString,
    databaseName: encryptedConfig.databaseName || 'kms',
    privateKey: privateKey,
    // privateKeyPassphrase: 'your-password', // 如果私钥有密码保护
  });

  // 连接
  await kms.connect();
  console.log('✅ 连接成功！\n');

  // 断开连接
  await kms.disconnect();
}

/**
 * 方式二：使用环境变量（推荐）
 */
async function example2_EnvironmentVariables() {
  console.log('\n=== 方式二：使用环境变量（推荐）===\n');

  // 在实际应用中，这些环境变量应该通过 .env 文件或部署配置设置
  process.env.KMS_PRIVATE_KEY = fs.readFileSync(
    path.join(__dirname, '..', 'keys', 'private_key.pem'),
    'utf-8'
  );
  // process.env.KMS_PRIVATE_KEY_PASSPHRASE = 'your-password';

  // 读取加密配置
  const configPath = path.join(__dirname, '..', 'config', 'encrypted-db.json');
  const encryptedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // 创建客户端（私钥会自动从环境变量读取）
  const kms = new KMSClient({
    encryptedConnectionString: encryptedConfig.encryptedConnectionString,
    databaseName: encryptedConfig.databaseName || 'kms',
  });

  // 连接
  await kms.connect();
  console.log('✅ 连接成功！\n');

  // 断开连接
  await kms.disconnect();
}

/**
 * 方式三：使用配置加载工具
 */
async function example3_ConfigLoader() {
  console.log('\n=== 方式三：使用配置加载工具 ===\n');

  // 设置环境变量
  process.env.KMS_PRIVATE_KEY = fs.readFileSync(
    path.join(__dirname, '..', 'keys', 'private_key.pem'),
    'utf-8'
  );

  // 使用配置加载工具
  const { loadEncryptedConfig } = await import('../src/utils/config-loader');
  const config = loadEncryptedConfig(
    path.join(__dirname, '..', 'config', 'encrypted-db.json')
  );

  // 创建客户端
  const kms = new KMSClient(config);

  // 连接
  await kms.connect();
  console.log('✅ 连接成功！\n');

  // 断开连接
  await kms.disconnect();
}

/**
 * 方式四：完整的业务流程
 */
async function example4_CompleteWorkflow() {
  console.log('\n=== 方式四：完整的业务流程 ===\n');

  // 设置环境变量
  process.env.KMS_PRIVATE_KEY = fs.readFileSync(
    path.join(__dirname, '..', 'keys', 'private_key.pem'),
    'utf-8'
  );

  // 加载配置
  const { loadEncryptedConfig } = await import('../src/utils/config-loader');
  const config = loadEncryptedConfig(
    path.join(__dirname, '..', 'config', 'encrypted-db.json')
  );

  // 创建并连接客户端
  const kms = new KMSClient(config);
  await kms.connect();
  console.log('✅ 数据库连接成功！\n');

  try {
    // 设置当前用户
    kms.setCurrentUser('admin_user_id');

    // 创建项目
    const project = await kms.createProject(
      'demo-app',
      'master-password-123',
      { environment: 'development' }
    );
    console.log('✅ 项目创建成功:', project.projectId);

    // 创建密钥
    const key = await kms.createKey(
      project.projectId,
      'master-password-123',
      {
        keyName: 'redis-cache',
        keyType: KeyType.REDIS,
        value: 'redis://localhost:6379',
        tags: ['dev', 'cache'],
        description: 'Development Redis cache'
      }
    );
    console.log('✅ 密钥创建成功:', key.keyId);

    // 获取密钥
    const keyValue = await kms.getKey(
      project.projectId,
      'master-password-123',
      key.keyId
    );
    console.log('✅ 密钥获取成功:', keyValue.value);

  } finally {
    // 断开连接
    await kms.disconnect();
    console.log('\n✅ 连接已关闭');
  }
}

// 运行示例
async function main() {
  // 检查必要的文件是否存在
  const configPath = path.join(__dirname, '..', 'config', 'encrypted-db.json');
  const privateKeyPath = path.join(__dirname, '..', 'keys', 'private_key.pem');

  if (!fs.existsSync(configPath)) {
    console.error('❌ 错误: 加密配置文件不存在');
    console.log('\n请先运行以下命令生成配置:');
    console.log('1. npx ts-node tools/encrypt-connection.ts generate-key-pair [password]');
    console.log('2. npx ts-node tools/encrypt-connection.ts encrypt "mongodb://localhost:27017/kms" keys/public_key.pem');
    return;
  }

  if (!fs.existsSync(privateKeyPath)) {
    console.error('❌ 错误: 私钥文件不存在');
    console.log('\n请先运行: npx ts-node tools/encrypt-connection.ts generate-key-pair [password]');
    return;
  }

  try {
    // 取消注释想要运行的示例
    // await example1_DirectConfig();
    // await example2_EnvironmentVariables();
    // await example3_ConfigLoader();
    await example4_CompleteWorkflow();
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : error);
  }
}

main();

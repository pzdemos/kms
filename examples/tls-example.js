/**
 * KMS TLS/SSL 连接示例
 * 演示如何使用加密连接
 */

const { KMSClient, KeyType } = require('@pengzi/kms');

// 示例 1: MongoDB Atlas（自动启用 TLS）
async function atlasExample() {
  console.log('=== MongoDB Atlas 示例 ===\n');

  const kms = new KMSClient({
    // mongodb+srv:// 协议会自动启用 TLS
    connectionString: 'mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/kms?retryWrites=true&w=majority',
    databaseName: 'kms'
  });

  await kms.connect();
  console.log('✅ 已安全连接（TLS 自动启用）');
  await kms.disconnect();
}

// 示例 2: 自建 MongoDB + TLS
async function selfManagedTLSExample() {
  console.log('\n=== 自建 MongoDB + TLS 示例 ===\n');

  const kms = new KMSClient({
    connectionString: 'mongodb://localhost:27017/kms',
    databaseName: 'kms',
    connectionOptions: {
      tls: true,
      tlsCAFile: '/path/to/ca.pem',  // CA 证书
      tlsCertificateKeyFile: '/path/to/client.pem'  // 客户端证书
    }
  });

  await kms.connect();
  console.log('✅ 已安全连接（TLS 手动配置）');
  await kms.disconnect();
}

// 示例 3: 开发环境（自签名证书）
async function devExample() {
  console.log('\n=== 开发环境示例（自签名证书） ===\n');

  const kms = new KMSClient({
    connectionString: 'mongodb://localhost:27017/kms',
    databaseName: 'kms',
    connectionOptions: {
      tls: true,
      tlsAllowInvalidCertificates: true,  // 允许自签名证书
      tlsAllowInvalidHostnames: true
    }
  });

  await kms.connect();
  console.log('✅ 已连接（开发环境，允许自签名证书）');
  await kms.disconnect();
}

// 示例 4: 完整的生产配置
async function productionExample() {
  console.log('\n=== 生产环境完整配置 ===\n');

  const kms = new KMSClient({
    connectionString: 'mongodb://prod-db.internal:27017/kms',
    databaseName: 'kms',
    connectionOptions: {
      // TLS 配置
      tls: true,
      tlsCAFile: '/etc/ssl/mongodb/ca.pem',
      tlsCertificateKeyFile: '/etc/ssl/mongodb/client.pem',

      // 连接池配置
      maxPoolSize: 50,
      minPoolSize: 10,

      // 超时配置
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 5000
    }
  });

  await kms.connect();
  console.log('✅ 生产环境安全连接已建立');

  // 使用 KMS...
  const project = await kms.createProject('production-app', 'Strong-Master-Password-123!');
  console.log('✅ 项目创建成功');

  await kms.disconnect();
  console.log('✅ 已安全断开连接');
}

// 运行示例（根据你的环境选择）
async function main() {
  try {
    // 取消注释你想运行的示例：

    // await atlasExample();  // MongoDB Atlas
    // await selfManagedTLSExample();  // 自建 MongoDB + TLS
    // await devExample();  // 开发环境
    // await productionExample();  // 生产环境

    console.log('\n⚠️ 请根据你的环境取消注释相应的示例');
    console.log('💡 提示：确保你的 MongoDB 已配置 TLS');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('\n💡 故障排查：');
    console.error('1. 确认 MongoDB 已启用 TLS');
    console.error('2. 检查证书文件路径是否正确');
    console.error('3. 验证连接字符串格式');
    console.error('4. 查看详细文档：docs/TLS_GUIDE.md');
  }
}

main();

/*
 * 安全检查清单：
 *
 * 生产环境部署前确认：
 * ☐ 已启用 TLS/SSL
 * ☐ 使用正规 CA 证书
 * ☐ 证书未过期
 * ☐ 连接字符串已加密
 * ☐ 网络访问已限制
 * ☐ IP 白名单已配置
 * ☐ 审计日志已启用
 *
 * 更多信息请查看：docs/TLS_GUIDE.md
 */

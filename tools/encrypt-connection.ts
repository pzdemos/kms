#!/usr/bin/env node
/**
 * 连接字符串加密工具
 * 用于生成密钥对并加密数据库连接字符串
 *
 * 使用方法：
 * node tools/encrypt-connection.ts encrypt "mongodb://localhost:27017" public_key.pem
 * node tools/encrypt-connection.ts generate-key-pair [passphrase]
 * node tools/encrypt-connection.ts decrypt encrypted_config.json private_key.pem [passphrase]
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  generateRSAKeyPair,
  encryptConnectionString,
  decryptConnectionString,
  isValidPEMKey,
  generateKeyId,
  type EncryptedConnectionString
} from '../src/core/asymmetric-crypto';

interface CLIArgs {
  command: string;
  args: string[];
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }
  return {
    command: args[0],
    args: args.slice(1)
  };
}

function printUsage(): void {
  console.log(`
KMS 连接字符串加密工具

使用方法：
  1. 生成密钥对（推荐设置密码保护）:
     node tools/encrypt-connection.ts generate-key-pair [passphrase]

  2. 加密连接字符串:
     node tools/encrypt-connection.ts encrypt <connection-string> <public-key-file>

  3. 解密连接字符串（用于测试）:
     node tools/encrypt-connection.ts decrypt <encrypted-config-file> <private-key-file> [passphrase]

示例：
  # 生成带密码保护的密钥对
  node tools/encrypt-connection.ts generate-key-pair "my-strong-password-123"

  # 加密 MongoDB 连接字符串
  node tools/encrypt-connection.ts encrypt "mongodb://localhost:27017/kms" keys/public_key.pem

  # 解密配置文件
  node tools/encrypt-connection.ts decrypt config/encrypted-db.json keys/private_key.pem "my-strong-password-123"

环境变量：
  KMS_PRIVATE_KEY_PASSPHRASE  - 私钥密码（可选）
`);
}

function writeFileSafe(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, { mode: 0o600 });
}

function readFileSafe(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    console.error(`错误: 文件不存在: ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 生成 RSA 密钥对
 */
function generateKeyPair(args: string[]): void {
  const passphrase = args[0];
  const outputDir = 'keys';

  console.log('🔐 生成 RSA-4096 密钥对...\n');

  const keyPair = generateRSAKeyPair(passphrase);

  // 保存公钥
  const publicKeyPath = path.join(outputDir, 'public_key.pem');
  writeFileSafe(publicKeyPath, keyPair.publicKey);
  console.log(`✅ 公钥已保存: ${publicKeyPath}`);
  console.log(`   (可以安全地分享或提交到代码库)\n`);

  // 保存私钥
  const privateKeyPath = path.join(outputDir, 'private_key.pem');
  writeFileSafe(privateKeyPath, keyPair.privateKey);
  console.log(`✅ 私钥已保存: ${privateKeyPath}`);
  console.log(`   (请妥善保管，不要提交到代码库!)\n`);

  if (passphrase) {
    console.log(`✅ 私钥已使用密码保护`);
  }

  console.log('\n⚠️  安全提醒:');
  console.log('   1. 将私钥存储在安全位置（如密钥管理服务）');
  console.log('   2. 不要将私钥提交到版本控制系统');
  console.log('   3. 生产环境建议使用环境变量存储私钥密码');
  console.log('   4. 定期轮换密钥对\n');
}

/**
 * 加密连接字符串
 */
function encrypt(args: string[]): void {
  if (args.length < 2) {
    console.error('错误: 需要提供连接字符串和公钥文件路径');
    console.log('\n用法: node tools/encrypt-connection.ts encrypt <connection-string> <public-key-file>');
    process.exit(1);
  }

  const [connectionString, publicKeyFile] = args;

  console.log('🔒 加密连接字符串...\n');

  // 验证连接字符串
  if (!connectionString.startsWith('mongodb')) {
    console.warn('⚠️  警告: 连接字符串似乎不是有效的 MongoDB 格式');
  }

  // 读取公钥
  const publicKey = readFileSafe(publicKeyFile);

  if (!isValidPEMKey(publicKey)) {
    console.error('错误: 无效的公钥格式');
    process.exit(1);
  }

  // 加密
  const encrypted = encryptConnectionString(connectionString, publicKey);
  encrypted.keyId = generateKeyId();

  // 保存加密配置
  const configDir = 'config';
  const configPath = path.join(configDir, 'encrypted-db.json');
  const config = {
    encryptedConnectionString: JSON.stringify(encrypted),
    algorithm: encrypted.algorithm,
    keyId: encrypted.keyId,
    createdAt: new Date().toISOString()
  };

  writeFileSafe(configPath, JSON.stringify(config, null, 2));

  console.log(`✅ 连接字符串已加密`);
  console.log(`   算法: ${encrypted.algorithm}`);
  console.log(`   密钥 ID: ${encrypted.keyId}`);
  console.log(`\n✅ 配置已保存: ${configPath}`);
  console.log(`\n📝 在代码中使用:`);
  console.log(`   import { readEncryptedConfig } from '@pzdemons/kms/utils';`);
  console.log(`   const config = readEncryptedConfig('${configPath}');`);
  console.log(`   const kms = new KMSClient(config);\n`);
}

/**
 * 解密连接字符串（测试用）
 */
function decrypt(args: string[]): void {
  if (args.length < 2) {
    console.error('错误: 需要提供配置文件和私钥文件路径');
    console.log('\n用法: node tools/encrypt-connection.ts decrypt <encrypted-config-file> <private-key-file> [passphrase]');
    process.exit(1);
  }

  const [configFile, privateKeyFile, passphrase] = args;

  console.log('🔓 解密连接字符串...\n');

  // 读取配置
  const config = JSON.parse(readFileSafe(configFile));
  const encrypted: EncryptedConnectionString = JSON.parse(config.encryptedConnectionString);

  // 读取私钥
  const privateKey = readFileSafe(privateKeyFile);

  if (!isValidPEMKey(privateKey)) {
    console.error('错误: 无效的私钥格式');
    process.exit(1);
  }

  // 尝试从环境变量获取密码
  const envPassphrase = process.env.KMS_PRIVATE_KEY_PASSPHRASE;
  const finalPassphrase = passphrase || envPassphrase;

  try {
    const decrypted = decryptConnectionString(encrypted, privateKey, finalPassphrase);
    console.log(`✅ 解密成功!\n`);
    console.log(`连接字符串:`);
    console.log(`${decrypted}\n`);
    console.log(`⚠️  警告: 请勿在生产环境日志中输出敏感信息\n`);
  } catch (error) {
    console.error(`❌ 解密失败: ${error instanceof Error ? error.message : error}`);
    if (!finalPassphrase && privateKey.includes('ENCRYPTED')) {
      console.error(`\n提示: 私钥已加密，需要提供密码`);
      console.error(`使用方式: node tools/encrypt-connection.ts decrypt ${configFile} ${privateKeyFile} "your-passphrase"`);
    }
    process.exit(1);
  }
}

function main(): void {
  const { command, args } = parseArgs();

  switch (command) {
    case 'generate-key-pair':
      generateKeyPair(args);
      break;
    case 'encrypt':
      encrypt(args);
      break;
    case 'decrypt':
      decrypt(args);
      break;
    case 'help':
    case '--help':
    case '-h':
      printUsage();
      break;
    default:
      console.error(`错误: 未知命令 '${command}'\n`);
      printUsage();
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

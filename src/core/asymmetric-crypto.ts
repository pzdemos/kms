/**
 * 非对称加密服务
 * 使用 RSA-OAEP 加密敏感数据（如数据库连接字符串）
 * 特点：
 * - 公钥加密，私钥解密
 * - 即使加密数据泄露，没有私钥也无法解密
 * - 私钥可以使用密码保护
 */

import { generateKeyPairSync, publicEncrypt, privateDecrypt, constants, randomBytes } from 'crypto';
import { CryptoError } from '../types';

/**
 * RSA 密钥对
 */
export interface RSAKeyPair {
  publicKey: string;  // PEM 格式公钥
  privateKey: string; // PEM 格式私钥（可加密）
}

/**
 * 加密后的连接字符串
 */
export interface EncryptedConnectionString {
  encrypted: string;      // Base64 编码的加密数据
  algorithm: string;      // 加密算法标识
  keyId?: string;         // 密钥标识（可选）
}

/**
 * RSA 加密配置
 */
const RSA_CONFIG = {
  algorithm: 'rsa',
  modulusLength: 4096,              // 4096 位密钥（更安全）
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',          // 私钥加密算法
    passphrase: undefined as string | undefined
  },
  padding: constants.RSA_PKCS1_OAEP_PADDING,
  oaepHash: 'sha256' as const
};

/**
 * 生成 RSA 密钥对
 * @param passphrase 私钥密码（可选，但强烈推荐）
 * @returns RSA 密钥对
 */
export function generateRSAKeyPair(passphrase?: string): RSAKeyPair {
  try {
    const options = {
      ...RSA_CONFIG,
      privateKeyEncoding: {
        ...RSA_CONFIG.privateKeyEncoding,
        passphrase: passphrase
      }
    };

    const { publicKey, privateKey } = generateKeyPairSync(
      'rsa',
      options as any
    );

    return {
      publicKey,
      privateKey
    };
  } catch (error) {
    throw new CryptoError(`Failed to generate RSA key pair: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 使用公钥加密连接字符串
 * @param connectionString 明文连接字符串
 * @param publicKeyPem PEM 格式公钥
 * @returns 加密后的连接字符串
 */
export function encryptConnectionString(
  connectionString: string,
  publicKeyPem: string
): EncryptedConnectionString {
  try {
    // RSA OAEP 加密
    const encrypted = publicEncrypt(
      {
        key: publicKeyPem,
        padding: RSA_CONFIG.padding,
        oaepHash: RSA_CONFIG.oaepHash
      },
      Buffer.from(connectionString, 'utf-8')
    );

    return {
      encrypted: encrypted.toString('base64'),
      algorithm: 'RSA-OAEP-4096',
      keyId: undefined
    };
  } catch (error) {
    throw new CryptoError(`Failed to encrypt connection string: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 使用私钥解密连接字符串
 * @param encryptedData 加密的连接字符串
 * @param privateKeyPem PEM 格式私钥
 * @param passphrase 私钥密码（如果私钥有密码保护）
 * @returns 明文连接字符串
 */
export function decryptConnectionString(
  encryptedData: EncryptedConnectionString,
  privateKeyPem: string,
  passphrase?: string
): string {
  try {
    const encryptedBuffer = Buffer.from(encryptedData.encrypted, 'base64');

    // RSA OAEP 解密
    const decrypted = privateDecrypt(
      {
        key: privateKeyPem,
        passphrase: passphrase,
        padding: RSA_CONFIG.padding,
        oaepHash: RSA_CONFIG.oaepHash
      },
      encryptedBuffer
    );

    return decrypted.toString('utf-8');
  } catch (error) {
    throw new CryptoError(`Failed to decrypt connection string: ${error instanceof Error ? error.message : 'Invalid password or corrupted data'}`);
  }
}

/**
 * 从环境变量安全地获取私钥密码
 * @returns 密码字符串
 */
export function getPrivateKeyPassphrase(): string | undefined {
  const passphrase = process.env.KMS_PRIVATE_KEY_PASSPHRASE;
  return passphrase?.trim() || undefined;
}

/**
 * 验证 PEM 格式的密钥
 * @param pem PEM 格式密钥
 * @returns 是否有效
 */
export function isValidPEMKey(pem: string): boolean {
  try {
    const trimmed = pem.trim();
    return (
      trimmed.includes('-----BEGIN') &&
      trimmed.includes('-----END') &&
      trimmed.includes('KEY-----')
    );
  } catch {
    return false;
  }
}

/**
 * 生成密钥 ID（用于密钥轮换）
 * @returns 密钥 ID
 */
export function generateKeyId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `key_${timestamp}_${random}`;
}

/**
 * 创建加密的连接字符串配置对象
 * @param connectionString 明文连接字符串
 * @param publicKeyPem 公钥
 * @param keyId 密钥标识（可选）
 * @returns 加密配置
 */
export function createEncryptedConnectionStringConfig(
  connectionString: string,
  publicKeyPem: string,
  keyId?: string
): { encryptedConnectionString: string } {
  const encrypted = encryptConnectionString(connectionString, publicKeyPem);
  if (keyId) {
    encrypted.keyId = keyId;
  }
  return {
    encryptedConnectionString: JSON.stringify(encrypted)
  };
}

/**
 * 从加密配置解析连接字符串
 * @param config 配置对象
 * @param privateKeyPem 私钥
 * @param passphrase 私钥密码
 * @returns 明文连接字符串
 */
export function parseEncryptedConnectionStringConfig(
  config: { encryptedConnectionString: string },
  privateKeyPem: string,
  passphrase?: string
): string {
  const encrypted: EncryptedConnectionString = JSON.parse(config.encryptedConnectionString);
  return decryptConnectionString(encrypted, privateKeyPem, passphrase);
}

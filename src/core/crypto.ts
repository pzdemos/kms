/**
 * 加密/解密工具函数
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { EncryptedData, CryptoError } from '../types';
import { SECURITY_CONFIG } from '../utils/constants';

/**
 * 生成随机字节
 */
export function generateRandomBytes(length: number): Buffer {
  return randomBytes(length);
}

/**
 * 生成随机IV
 */
export function generateIV(): Buffer {
  return generateRandomBytes(SECURITY_CONFIG.ENCRYPTION.IV_LENGTH);
}

/**
 * 使用AES-256-GCM加密数据
 */
export function encryptAES256GCM(plaintext: string, key: Buffer): EncryptedData {
  try {
    const iv = generateIV();
    const cipher = createCipheriv(SECURITY_CONFIG.ENCRYPTION.ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    throw new CryptoError(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 使用AES-256-GCM解密数据
 */
export function decryptAES256GCM(
  encryptedData: string,
  iv: string,
  authTag: string,
  key: Buffer
): string {
  try {
    const decipher = createDecipheriv(
      SECURITY_CONFIG.ENCRYPTION.ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new CryptoError(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 比较两个恒定时间字符串（防止时序攻击）
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < aBuffer.length; i++) {
    result |= aBuffer[i] ^ bBuffer[i];
  }

  return result === 0;
}

/**
 * 生成随机密钥
 */
export function generateRandomKey(): Buffer {
  return generateRandomBytes(SECURITY_CONFIG.ENCRYPTION.KEY_LENGTH);
}

/**
 * 从十六进制字符串转换为Buffer
 */
export function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

/**
 * 将Buffer转换为十六进制字符串
 */
export function bufferToHex(buffer: Buffer): string {
  return buffer.toString('hex');
}

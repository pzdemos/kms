/**
 * 密钥派生功能
 * 使用PBKDF2从密码派生密钥
 */

import { pbkdf2, randomBytes } from 'crypto';
import { KeyDerivationConfig, CryptoError } from '../types';
import { SECURITY_CONFIG } from '../utils/constants';

/**
 * 生成随机盐值
 */
export function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

/**
 * 使用PBKDF2从密码派生密钥
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: string,
  iterations?: number,
  keyLength?: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const config = SECURITY_CONFIG.KEY_DERIVATION;

    pbkdf2(
      password,
      salt,
      iterations || config.ITERATIONS,
      keyLength || config.KEY_LENGTH,
      config.DIGEST,
      (err, derivedKey) => {
        if (err) {
          reject(new CryptoError(`Key derivation failed: ${err.message}`));
        } else {
          resolve(derivedKey);
        }
      }
    );
  });
}

/**
 * 派生项目主密钥
 */
export async function deriveProjectMasterKey(
  masterPassword: string,
  salt: string
): Promise<Buffer> {
  return deriveKeyFromPassword(masterPassword, salt);
}

/**
 * 生成主密钥哈希（用于验证密码）
 */
export async function hashMasterKey(masterKey: Buffer): Promise<string> {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(masterKey).digest('hex');
}

/**
 * 验证主密码
 */
export async function verifyMasterPassword(
  masterPassword: string,
  salt: string,
  storedHash: string
): Promise<boolean> {
  try {
    const derivedKey = await deriveProjectMasterKey(masterPassword, salt);
    const derivedHash = await hashMasterKey(derivedKey);
    return derivedHash === storedHash;
  } catch (error) {
    return false;
  }
}

/**
 * 加密服务
 * 负责所有密钥加密和解密操作
 */

import { encryptAES256GCM, decryptAES256GCM } from './crypto';
import { deriveProjectMasterKey, hashMasterKey } from './key-derivation';
import { EncryptedData, CryptoError } from '../types';

/**
 * 加密服务类
 */
export class CryptoService {
  /**
   * 加密密钥值
   */
  async encryptKey(plainValue: string, masterKey: Buffer): Promise<EncryptedData> {
    return encryptAES256GCM(plainValue, masterKey);
  }

  /**
   * 解密密钥值
   */
  async decryptKey(
    encryptedValue: string,
    iv: string,
    authTag: string,
    masterKey: Buffer
  ): Promise<string> {
    return decryptAES256GCM(encryptedValue, iv, authTag, masterKey);
  }

  /**
   * 从主密码派生项目主密钥
   */
  async deriveMasterKey(masterPassword: string, salt: string): Promise<Buffer> {
    return deriveProjectMasterKey(masterPassword, salt);
  }

  /**
   * 生成主密钥哈希
   */
  async hashMasterKey(masterKey: Buffer): Promise<string> {
    return hashMasterKey(masterKey);
  }

  /**
   * 验证主密钥
   */
  async verifyMasterKey(
    masterKey: Buffer,
    storedHash: string
  ): Promise<boolean> {
    const derivedHash = await this.hashMasterKey(masterKey);
    return derivedHash === storedHash;
  }

  /**
   * 使用主密码解锁项目主密钥
   */
  async unlockProjectMasterKey(
    masterPassword: string,
    salt: string,
    masterKeyHash: string
  ): Promise<Buffer> {
    const masterKey = await this.deriveMasterKey(masterPassword, salt);
    const isValid = await this.verifyMasterKey(masterKey, masterKeyHash);

    if (!isValid) {
      throw new CryptoError('Invalid master password');
    }

    return masterKey;
  }
}

/**
 * 简单的依赖注入装饰器（TypeScript版本）
 */
function Injectable() {
  return function decorator<T extends new (...args: any[]) => any>(target: T): T {
    return target;
  };
}

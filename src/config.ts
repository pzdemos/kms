/**
 * 配置管理
 */

import { KMSClientOptions } from './types';
import { SECURITY_CONFIG } from './utils/constants';

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Partial<KMSClientOptions> = {
  databaseName: 'kms',
  connectionOptions: {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 0,
  },
};

/**
 * 合并配置
 */
export function mergeConfig(userConfig: KMSClientOptions): KMSClientOptions {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    connectionOptions: {
      ...DEFAULT_CONFIG.connectionOptions,
      ...userConfig.connectionOptions,
    },
  };
}

/**
 * 验证配置
 */
export function validateConfig(config: KMSClientOptions): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.connectionString) {
    errors.push('Connection string is required');
  }

  if (!config.databaseName) {
    errors.push('Database name is required');
  }

  if (config.connectionString && !config.connectionString.startsWith('mongodb')) {
    errors.push('Invalid connection string format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Infrastructure Layer Barrel Export
 * Provides centralized access to all infrastructure managers
 */

export { ConfigManager, type OktyvConfig } from './config-manager.js';
export { CacheManager, type CacheCategory, type CacheConfig } from './cache-manager.js';
export { RetryManager, type RetryOptions, type RetryConfig } from './retry-manager.js';
export { ProgressManager, type ProgressConfig } from './progress-manager.js';

// Re-export singleton instances for production use
import { ConfigManager } from './config-manager.js';
import { CacheManager } from './cache-manager.js';
import { RetryManager } from './retry-manager.js';
import { ProgressManager } from './progress-manager.js';

// Create global config singleton
export const config = ConfigManager.getInstance();

// Create infrastructure singletons with config
export const cache = new CacheManager({
  enabled: true,
  ttl: {
    jobs: 3600,
    companies: 7200,
    sessions: 1800,
    other: 3600,
  },
  maxSize: 500,
});

export const retry = new RetryManager({
  enabled: true,
  maxAttempts: 3,
  minTimeout: 1000,
  maxTimeout: 10000,
});

export const progress = new ProgressManager({
  spinners: true,
  bars: true,
});

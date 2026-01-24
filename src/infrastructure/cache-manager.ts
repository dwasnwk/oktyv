/**
 * Cache Manager
 * Wraps lru-cache with Oktyv-specific caching logic
 * Provides TTL-based caching for jobs, companies, and sessions
 */

import { LRUCache } from 'lru-cache';
import { config } from './config-manager.js';
import { logger } from '../utils/logger.js';

export type CacheCategory = 'jobs' | 'companies' | 'sessions' | 'other';

/**
 * Cache Manager
 * Manages LRU cache with category-specific TTLs
 */
export class CacheManager {
  private cache: LRUCache<string, any>;
  private enabled: boolean;

  constructor() {
    const cacheConfig = config.getCacheConfig();
    this.enabled = cacheConfig.enabled;

    this.cache = new LRUCache({
      max: cacheConfig.maxSize,
      ttl: 3600 * 1000, // Default 1 hour in milliseconds
      updateAgeOnGet: true, // Reset TTL on access
      updateAgeOnHas: false,
    });

    logger.info('CacheManager initialized', {
      enabled: this.enabled,
      maxSize: cacheConfig.maxSize,
    });
  }

  /**
   * Get value from cache
   */
  public async get<T>(key: string): Promise<T | undefined> {
    if (!this.enabled) return undefined;

    const value = this.cache.get(key);
    if (value !== undefined) {
      logger.debug('Cache hit', { key });
      return value as T;
    }

    logger.debug('Cache miss', { key });
    return undefined;
  }

  /**
   * Set value in cache with optional TTL
   * If no TTL provided, uses category-specific default
   */
  public async set<T>(
    key: string,
    value: T,
    category: CacheCategory = 'other',
    ttlSeconds?: number
  ): Promise<void> {
    if (!this.enabled) return;

    const cacheConfig = config.getCacheConfig();
    const ttl = ttlSeconds
      ? ttlSeconds * 1000
      : category === 'jobs'
      ? cacheConfig.ttl.jobs * 1000
      : category === 'companies'
      ? cacheConfig.ttl.companies * 1000
      : category === 'sessions'
      ? cacheConfig.ttl.sessions * 1000
      : 3600 * 1000; // Default 1 hour

    this.cache.set(key, value, { ttl });
    logger.debug('Cache set', { key, category, ttlSeconds: ttl / 1000 });
  }

  /**
   * Check if key exists in cache
   */
  public async has(key: string): Promise<boolean> {
    if (!this.enabled) return false;
    return this.cache.has(key);
  }

  /**
   * Delete specific key from cache
   */
  public async delete(key: string): Promise<boolean> {
    if (!this.enabled) return false;

    const existed = this.cache.has(key);
    this.cache.delete(key);
    logger.debug('Cache delete', { key, existed });
    return existed;
  }

  /**
   * Invalidate all keys matching pattern (prefix)
   * Returns number of keys invalidated
   */
  public async invalidate(pattern: string): Promise<number> {
    if (!this.enabled) return 0;

    let count = 0;
    const keysToDelete: string[] = [];

    // Collect keys matching pattern
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }

    // Delete collected keys
    for (const key of keysToDelete) {
      this.cache.delete(key);
      count++;
    }

    logger.info('Cache invalidated', { pattern, count });
    return count;
  }

  /**
   * Clear entire cache
   */
  public async clear(): Promise<void> {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      enabled: this.enabled,
    };
  }

  /**
   * Enable caching
   */
  public enable(): void {
    this.enabled = true;
    logger.info('Cache enabled');
  }

  /**
   * Disable caching
   */
  public disable(): void {
    this.enabled = false;
    logger.info('Cache disabled');
  }
}

// Export singleton instance
export const cache = new CacheManager();

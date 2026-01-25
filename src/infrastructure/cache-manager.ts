/**
 * Cache Manager
 * Wraps lru-cache with Oktyv-specific caching logic
 * Provides TTL-based caching for jobs, companies, and sessions
 */

import { LRUCache } from 'lru-cache';

export type CacheCategory = 'jobs' | 'companies' | 'sessions' | 'other';

export interface CacheConfig {
  enabled: boolean;
  ttl: {
    jobs: number;
    companies: number;
    sessions: number;
    other: number;
  };
  maxSize: number;
}

/**
 * Cache Manager
 * Manages LRU cache with category-specific TTLs
 */
export class CacheManager {
  private cache: LRUCache<string, any>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;

    this.cache = new LRUCache({
      max: config.maxSize,
      ttl: config.ttl.other * 1000, // Default TTL in milliseconds
      updateAgeOnGet: true, // Reset TTL on access for LRU behavior
      updateAgeOnHas: false,
    });
  }

  /**
   * Get TTL for a category
   * @private
   */
  private getTTL(category: CacheCategory = 'other', customTTL?: number): number {
    if (customTTL !== undefined) {
      return customTTL;
    }

    switch (category) {
      case 'jobs':
        return this.config.ttl.jobs;
      case 'companies':
        return this.config.ttl.companies;
      case 'sessions':
        return this.config.ttl.sessions;
      case 'other':
      default:
        return this.config.ttl.other;
    }
  }

  /**
   * Get value from cache
   */
  public async get<T>(key: string): Promise<T | undefined> {
    if (!this.config.enabled) return undefined;

    const value = this.cache.get(key);
    return value as T | undefined;
  }

  /**
   * Set value in cache with optional TTL
   * If no TTL provided, uses category-specific default
   */
  public async set<T>(
    key: string,
    value: T,
    category: CacheCategory = 'other',
    customTTL?: number
  ): Promise<void> {
    if (!this.config.enabled) return;

    const ttlSeconds = this.getTTL(category, customTTL);
    const ttlMs = ttlSeconds * 1000;

    this.cache.set(key, value, { ttl: ttlMs });
  }

  /**
   * Check if key exists in cache (synchronous)
   */
  public has(key: string): boolean {
    if (!this.config.enabled) return false;
    return this.cache.has(key);
  }

  /**
   * Delete specific key from cache
   */
  public async delete(key: string): Promise<void> {
    if (!this.config.enabled) return;
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching pattern
   * Supports wildcards: "jobs:*", "prefix:*:suffix", or exact match
   * Returns number of keys invalidated
   */
  public async invalidate(pattern: string): Promise<number> {
    if (!this.config.enabled) return 0;

    let count = 0;
    const keysToDelete: string[] = [];

    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
      .replace(/\*/g, '.*'); // Convert * to .*
    const regex = new RegExp(`^${regexPattern}$`);

    // Collect keys matching pattern
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    // Delete collected keys
    for (const key of keysToDelete) {
      this.cache.delete(key);
      count++;
    }

    return count;
  }

  /**
   * Clear entire cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      enabled: this.config.enabled,
    };
  }

  /**
   * Enable caching
   */
  public enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable caching
   */
  public disable(): void {
    this.config.enabled = false;
  }
}

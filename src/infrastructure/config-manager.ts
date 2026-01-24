/**
 * Configuration Manager
 * Loads and validates Oktyv configuration from .oktyvrc files
 * Uses cosmiconfig to search for config in standard locations
 */

import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';
import { Platform } from '../types/job.js';

// Configuration schema with validation
const ConfigSchema = z.object({
  browser: z.object({
    headless: z.boolean().default(true),
    timeout: z.number().min(1000).max(120000).default(30000),
    viewport: z.object({
      width: z.number().min(800).max(3840).default(1920),
      height: z.number().min(600).max(2160).default(1080),
    }).default({ width: 1920, height: 1080 }),
  }).default({}),
  
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.object({
      jobs: z.number().min(60).max(86400).default(3600),        // 1 min to 24 hours
      companies: z.number().min(60).max(86400).default(7200),   // 1 min to 24 hours
      sessions: z.number().min(300).max(86400).default(1800),   // 5 min to 24 hours
    }).default({}),
    maxSize: z.number().min(10).max(10000).default(500),        // 10 to 10k items
  }).default({}),
  
  retry: z.object({
    enabled: z.boolean().default(true),
    maxAttempts: z.number().min(1).max(10).default(3),
    minTimeout: z.number().min(100).max(10000).default(1000),
    maxTimeout: z.number().min(1000).max(60000).default(10000),
  }).default({}),
  
  rateLimits: z.record(
    z.nativeEnum(Platform),
    z.object({
      requestsPerMinute: z.number().min(1).max(100).default(10),
    })
  ).default({
    LINKEDIN: { requestsPerMinute: 10 },
    INDEED: { requestsPerMinute: 20 },
    WELLFOUND: { requestsPerMinute: 15 },
    GENERIC: { requestsPerMinute: 30 },
  }),
  
  progress: z.object({
    spinners: z.boolean().default(true),
    bars: z.boolean().default(true),
  }).default({}),
});

export type OktyvConfig = z.infer<typeof ConfigSchema>;

/**
 * Configuration Manager
 * Singleton that loads and caches configuration
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: OktyvConfig;
  private loaded: boolean = false;

  private constructor() {
    // Default configuration
    this.config = ConfigSchema.parse({});
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from file system
   * Searches for .oktyvrc, .oktyvrc.json, .oktyvrc.yaml, oktyv.config.js
   */
  public async load(searchFrom?: string): Promise<void> {
    if (this.loaded) return; // Only load once

    try {
      const explorer = cosmiconfig('oktyv');
      const result = await explorer.search(searchFrom);

      if (result && result.config) {
        // Merge loaded config with defaults
        const merged = {
          browser: { ...this.config.browser, ...result.config.browser },
          cache: {
            ...this.config.cache,
            ...result.config.cache,
            ttl: { ...this.config.cache.ttl, ...result.config.cache?.ttl },
          },
          retry: { ...this.config.retry, ...result.config.retry },
          rateLimits: { ...this.config.rateLimits, ...result.config.rateLimits },
          progress: { ...this.config.progress, ...result.config.progress },
        };

        // Validate merged config
        this.config = ConfigSchema.parse(merged);
        this.loaded = true;
      } else {
        // No config file found, use defaults
        this.loaded = true;
      }
    } catch (error) {
      // If config load fails, log warning and use defaults
      console.warn('Failed to load config, using defaults:', error);
      this.loaded = true;
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): OktyvConfig {
    return this.config;
  }

  /**
   * Get browser configuration
   */
  public getBrowserConfig() {
    return this.config.browser;
  }

  /**
   * Get cache configuration
   */
  public getCacheConfig() {
    return this.config.cache;
  }

  /**
   * Get retry configuration
   */
  public getRetryConfig() {
    return this.config.retry;
  }

  /**
   * Get rate limit for platform
   */
  public getRateLimit(platform: Platform): number {
    return this.config.rateLimits[platform]?.requestsPerMinute || 10;
  }

  /**
   * Get progress configuration
   */
  public getProgressConfig() {
    return this.config.progress;
  }

  /**
   * Reset configuration (for testing)
   */
  public reset(): void {
    this.config = ConfigSchema.parse({});
    this.loaded = false;
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();

/**
 * Rate Limiter
 * 
 * Token bucket implementation for rate limiting per platform.
 * Prevents API blocking and respects platform policies.
 * Uses caching for token persistence across sessions.
 */

import { createLogger } from '../utils/logger.js';
import { cache, config } from '../infrastructure/index.js';
import { Platform } from '../types/job.js';

const logger = createLogger('rate-limiter');

/**
 * Rate limit configuration for a platform
 */
export interface RateLimitConfig {
  /** Platform identifier */
  platform: Platform;
  
  /** Maximum requests per window */
  maxRequests: number;
  
  /** Time window in milliseconds */
  windowMs: number;
  
  /** Tokens refill rate (tokens per second) */
  refillRate?: number;
}

/**
 * Token bucket for rate limiting
 */
interface TokenBucket {
  /** Available tokens */
  tokens: number;
  
  /** Maximum tokens (bucket capacity) */
  maxTokens: number;
  
  /** Last refill timestamp */
  lastRefill: number;
  
  /** Tokens refilled per second */
  refillRate: number;
}

/**
 * Get default rate limit configurations from ConfigManager
 */
function getDefaultRateLimits(): Record<Platform, RateLimitConfig> {
  return {
    [Platform.LINKEDIN]: {
      platform: Platform.LINKEDIN,
      maxRequests: config.getRateLimit(Platform.LINKEDIN),
      windowMs: 60000,
      refillRate: config.getRateLimit(Platform.LINKEDIN) / 60,
    },
    [Platform.INDEED]: {
      platform: Platform.INDEED,
      maxRequests: config.getRateLimit(Platform.INDEED),
      windowMs: 60000,
      refillRate: config.getRateLimit(Platform.INDEED) / 60,
    },
    [Platform.WELLFOUND]: {
      platform: Platform.WELLFOUND,
      maxRequests: config.getRateLimit(Platform.WELLFOUND),
      windowMs: 60000,
      refillRate: config.getRateLimit(Platform.WELLFOUND) / 60,
    },
    [Platform.GENERIC]: {
      platform: Platform.GENERIC,
      maxRequests: config.getRateLimit(Platform.GENERIC),
      windowMs: 60000,
      refillRate: config.getRateLimit(Platform.GENERIC) / 60,
    },
  } as Record<Platform, RateLimitConfig>;
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private buckets: Map<Platform, TokenBucket>;
  private configs: Map<Platform, RateLimitConfig>;

  constructor() {
    this.buckets = new Map();
    this.configs = new Map();
    
    // Initialize with default configs from ConfigManager
    Object.values(getDefaultRateLimits()).forEach(config => {
      this.setConfig(config);
    });
    
    logger.info('RateLimiter initialized with configs from ConfigManager');
  }

  /**
   * Set rate limit configuration for a platform
   */
  setConfig(config: RateLimitConfig): void {
    const refillRate = config.refillRate || config.maxRequests / (config.windowMs / 1000);
    
    this.configs.set(config.platform, { ...config, refillRate });
    
    // Try to load cached bucket state
    this.loadBucketFromCache(config.platform, {
      tokens: config.maxRequests,
      maxTokens: config.maxRequests,
      lastRefill: Date.now(),
      refillRate,
    });
    
    logger.debug('Rate limit config set', { 
      platform: config.platform,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      refillRate,
    });
  }

  /**
   * Load bucket state from cache or use default
   */
  private async loadBucketFromCache(platform: Platform, defaultBucket: TokenBucket): Promise<void> {
    const cacheKey = `ratelimit:${platform}`;
    const cached = await cache.get<TokenBucket>(cacheKey);
    
    if (cached) {
      // Validate cached data
      if (cached.maxTokens === defaultBucket.maxTokens && cached.refillRate === defaultBucket.refillRate) {
        this.buckets.set(platform, cached);
        logger.debug('Loaded rate limit from cache', { platform, tokens: cached.tokens.toFixed(2) });
        return;
      }
    }
    
    // Use default bucket
    this.buckets.set(platform, defaultBucket);
  }

  /**
   * Save bucket state to cache
   */
  private async saveBucketToCache(platform: Platform): Promise<void> {
    const bucket = this.buckets.get(platform);
    if (!bucket) return;
    
    const cacheKey = `ratelimit:${platform}`;
    await cache.set(cacheKey, bucket, 'other', 300); // Cache for 5 minutes
  }

  /**
   * Get current rate limit config for a platform
   */
  getConfig(platform: Platform): RateLimitConfig | undefined {
    return this.configs.get(platform);
  }

  /**
   * Check if a request is allowed and consume a token
   */
  async checkLimit(platform: Platform): Promise<boolean> {
    const bucket = this.buckets.get(platform);
    
    if (!bucket) {
      logger.warn('No rate limit config for platform, allowing request', { platform });
      return true;
    }

    // Refill tokens based on elapsed time
    this.refillBucket(platform, bucket);

    // Check if we have tokens available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      logger.debug('Request allowed', { 
        platform, 
        tokensRemaining: bucket.tokens.toFixed(2),
      });
      // Save updated bucket state to cache
      await this.saveBucketToCache(platform);
      return true;
    }

    // Rate limit exceeded
    logger.warn('Rate limit exceeded', { 
      platform,
      tokensRemaining: bucket.tokens.toFixed(2),
      nextAvailable: this.getTimeUntilNextToken(platform),
    });
    return false;
  }

  /**
   * Wait until a token is available, then consume it
   */
  async waitForToken(platform: Platform): Promise<void> {
    const bucket = this.buckets.get(platform);
    
    if (!bucket) {
      logger.debug('No rate limit for platform, proceeding immediately', { platform });
      return;
    }

    // Refill first
    this.refillBucket(platform, bucket);

    // If we have tokens, consume and return
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      logger.debug('Token consumed immediately', { platform, tokensRemaining: bucket.tokens.toFixed(2) });
      await this.saveBucketToCache(platform);
      return;
    }

    // Calculate wait time
    const waitMs = this.getTimeUntilNextToken(platform);
    
    logger.info('Waiting for rate limit', { platform, waitMs: waitMs.toFixed(0) });
    
    // Wait for token to be available
    await new Promise(resolve => setTimeout(resolve, waitMs));
    
    // Refill and consume
    this.refillBucket(platform, bucket);
    bucket.tokens -= 1;
    
    logger.debug('Token consumed after wait', { platform, tokensRemaining: bucket.tokens.toFixed(2) });
    await this.saveBucketToCache(platform);
  }

  /**
   * Refill tokens in bucket based on elapsed time
   */
  private refillBucket(platform: Platform, bucket: TokenBucket): void {
    const now = Date.now();
    const elapsedMs = now - bucket.lastRefill;
    const elapsedSec = elapsedMs / 1000;
    
    // Calculate tokens to add
    const tokensToAdd = elapsedSec * bucket.refillRate;
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
      
      logger.debug('Bucket refilled', {
        platform,
        tokensAdded: tokensToAdd.toFixed(2),
        tokensNow: bucket.tokens.toFixed(2),
        elapsedMs: elapsedMs.toFixed(0),
      });
    }
  }

  /**
   * Get time in milliseconds until next token is available
   */
  getTimeUntilNextToken(platform: Platform): number {
    const bucket = this.buckets.get(platform);
    
    if (!bucket) {
      return 0;
    }

    // If we have tokens, no wait needed
    if (bucket.tokens >= 1) {
      return 0;
    }

    // Calculate time to get 1 token
    const tokensNeeded = 1 - bucket.tokens;
    const timeMs = (tokensNeeded / bucket.refillRate) * 1000;
    
    return Math.ceil(timeMs);
  }

  /**
   * Get current token count for a platform
   */
  getAvailableTokens(platform: Platform): number {
    const bucket = this.buckets.get(platform);
    
    if (!bucket) {
      return Infinity;
    }

    // Refill first to get current state
    this.refillBucket(platform, bucket);
    
    return bucket.tokens;
  }

  /**
   * Reset rate limiter for a platform (sets tokens to max)
   */
  reset(platform: Platform): void {
    const bucket = this.buckets.get(platform);
    
    if (bucket) {
      bucket.tokens = bucket.maxTokens;
      bucket.lastRefill = Date.now();
      logger.info('Rate limiter reset', { platform, tokens: bucket.maxTokens });
    }
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    logger.info('Resetting all rate limiters');
    
    for (const platform of this.buckets.keys()) {
      this.reset(platform);
    }
  }

  /**
   * Get statistics for all platforms
   */
  getStats(): Record<string, { availableTokens: number; maxTokens: number; timeUntilNext: number }> {
    const stats: Record<string, any> = {};
    
    for (const [platform, bucket] of this.buckets.entries()) {
      this.refillBucket(platform, bucket);
      
      stats[platform] = {
        availableTokens: parseFloat(bucket.tokens.toFixed(2)),
        maxTokens: bucket.maxTokens,
        timeUntilNext: this.getTimeUntilNextToken(platform),
      };
    }
    
    return stats;
  }
}

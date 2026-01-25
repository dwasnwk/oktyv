import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager } from '../config-manager.js';

describe('ConfigManager', () => {
  let config: ConfigManager;

  beforeEach(() => {
    config = new ConfigManager();
  });

  describe('Default Configuration', () => {
    it('should have default browser settings', () => {
      const defaults = config.get();
      
      expect(defaults.browser.headless).toBe(true);
      expect(defaults.browser.timeout).toBe(30000);
      expect(defaults.browser.viewport.width).toBe(1280);
      expect(defaults.browser.viewport.height).toBe(720);
    });

    it('should have default cache settings', () => {
      const defaults = config.get();
      
      expect(defaults.cache.enabled).toBe(true);
      expect(defaults.cache.maxSize).toBe(500);
      expect(defaults.cache.ttl.jobs).toBe(3600);
      expect(defaults.cache.ttl.companies).toBe(7200);
      expect(defaults.cache.ttl.sessions).toBe(1800);
    });

    it('should have default retry settings', () => {
      const defaults = config.get();
      
      expect(defaults.retry.enabled).toBe(true);
      expect(defaults.retry.maxAttempts).toBe(3);
      expect(defaults.retry.minTimeout).toBe(1000);
      expect(defaults.retry.maxTimeout).toBe(10000);
    });

    it('should have default rate limits', () => {
      const defaults = config.get();
      
      expect(defaults.rateLimits.LINKEDIN.requestsPerMinute).toBe(10);
      expect(defaults.rateLimits.INDEED.requestsPerMinute).toBe(20);
      expect(defaults.rateLimits.WELLFOUND.requestsPerMinute).toBe(15);
      expect(defaults.rateLimits.GENERIC.requestsPerMinute).toBe(30);
    });

    it('should have default progress settings', () => {
      const defaults = config.get();
      
      expect(defaults.progress.spinners).toBe(true);
      expect(defaults.progress.bars).toBe(true);
    });
  });

  describe('Configuration Override', () => {
    it('should override browser settings', () => {
      config = new ConfigManager({
        browser: {
          headless: false,
          timeout: 60000,
        },
      });
      
      const settings = config.get();
      expect(settings.browser.headless).toBe(false);
      expect(settings.browser.timeout).toBe(60000);
      // Should preserve defaults for non-overridden values
      expect(settings.browser.viewport.width).toBe(1280);
    });

    it('should override cache settings', () => {
      config = new ConfigManager({
        cache: {
          enabled: false,
          maxSize: 1000,
        },
      });
      
      const settings = config.get();
      expect(settings.cache.enabled).toBe(false);
      expect(settings.cache.maxSize).toBe(1000);
      // Preserve defaults
      expect(settings.cache.ttl.jobs).toBe(3600);
    });

    it('should override nested TTL values', () => {
      config = new ConfigManager({
        cache: {
          ttl: {
            jobs: 7200,
          },
        },
      });
      
      const settings = config.get();
      expect(settings.cache.ttl.jobs).toBe(7200);
      // Other TTLs should remain default
      expect(settings.cache.ttl.companies).toBe(7200);
      expect(settings.cache.ttl.sessions).toBe(1800);
    });

    it('should override rate limits per platform', () => {
      config = new ConfigManager({
        rateLimits: {
          LINKEDIN: { requestsPerMinute: 5 },
        },
      });
      
      const settings = config.get();
      expect(settings.rateLimits.LINKEDIN.requestsPerMinute).toBe(5);
      // Others should remain default
      expect(settings.rateLimits.INDEED.requestsPerMinute).toBe(20);
    });

    it('should override progress settings', () => {
      config = new ConfigManager({
        progress: {
          spinners: false,
          bars: false,
        },
      });
      
      const settings = config.get();
      expect(settings.progress.spinners).toBe(false);
      expect(settings.progress.bars).toBe(false);
    });
  });

  describe('Partial Configuration', () => {
    it('should handle partial browser config', () => {
      config = new ConfigManager({
        browser: {
          headless: false,
          // timeout not provided
        },
      });
      
      const settings = config.get();
      expect(settings.browser.headless).toBe(false);
      expect(settings.browser.timeout).toBe(30000); // Default
    });

    it('should handle partial viewport config', () => {
      config = new ConfigManager({
        browser: {
          viewport: {
            width: 1920,
            // height not provided
          },
        },
      });
      
      const settings = config.get();
      expect(settings.browser.viewport.width).toBe(1920);
      expect(settings.browser.viewport.height).toBe(720); // Default
    });

    it('should handle empty config object', () => {
      config = new ConfigManager({});
      
      const settings = config.get();
      // Should all be defaults
      expect(settings.browser.headless).toBe(true);
      expect(settings.cache.enabled).toBe(true);
      expect(settings.retry.enabled).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate browser timeout is positive', () => {
      expect(() => {
        new ConfigManager({
          browser: { timeout: -1000 },
        });
      }).toThrow();
    });

    it('should validate viewport dimensions are positive', () => {
      expect(() => {
        new ConfigManager({
          browser: { viewport: { width: -100, height: 720 } },
        });
      }).toThrow();
      
      expect(() => {
        new ConfigManager({
          browser: { viewport: { width: 1280, height: 0 } },
        });
      }).toThrow();
    });

    it('should validate cache maxSize is positive', () => {
      expect(() => {
        new ConfigManager({
          cache: { maxSize: -10 },
        });
      }).toThrow();
    });

    it('should validate TTL values are positive', () => {
      expect(() => {
        new ConfigManager({
          cache: { ttl: { jobs: -100 } },
        });
      }).toThrow();
    });

    it('should validate retry maxAttempts is positive', () => {
      expect(() => {
        new ConfigManager({
          retry: { maxAttempts: 0 },
        });
      }).toThrow();
    });

    it('should validate retry timeouts are positive', () => {
      expect(() => {
        new ConfigManager({
          retry: { minTimeout: -500 },
        });
      }).toThrow();
    });

    it('should validate rate limits are positive', () => {
      expect(() => {
        new ConfigManager({
          rateLimits: {
            LINKEDIN: { requestsPerMinute: -5 },
          },
        });
      }).toThrow();
    });
  });

  describe('Individual Getters', () => {
    beforeEach(() => {
      config = new ConfigManager({
        browser: { headless: false },
        cache: { maxSize: 1000 },
        retry: { maxAttempts: 5 },
      });
    });

    it('should get browser config', () => {
      const browser = config.getBrowser();
      expect(browser.headless).toBe(false);
      expect(browser.timeout).toBe(30000);
    });

    it('should get cache config', () => {
      const cache = config.getCache();
      expect(cache.maxSize).toBe(1000);
      expect(cache.enabled).toBe(true);
    });

    it('should get retry config', () => {
      const retry = config.getRetry();
      expect(retry.maxAttempts).toBe(5);
      expect(retry.enabled).toBe(true);
    });

    it('should get rate limits', () => {
      const rateLimits = config.getRateLimits();
      expect(rateLimits.LINKEDIN.requestsPerMinute).toBe(10);
    });

    it('should get progress config', () => {
      const progress = config.getProgress();
      expect(progress.spinners).toBe(true);
      expect(progress.bars).toBe(true);
    });
  });

  describe('Immutability', () => {
    it('should return a copy of config, not reference', () => {
      const config1 = config.get();
      const config2 = config.get();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });

    it('should not allow modification of returned config', () => {
      const settings = config.get();
      settings.browser.headless = false;
      
      // Original should be unchanged
      const newSettings = config.get();
      expect(newSettings.browser.headless).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined partial config', () => {
      config = new ConfigManager(undefined);
      expect(config.get()).toBeDefined();
    });

    it('should handle null values gracefully', () => {
      // Zod should reject null where objects expected
      expect(() => {
        new ConfigManager(null as any);
      }).toThrow();
    });

    it('should handle extra unknown properties', () => {
      // Zod should strip unknown properties
      config = new ConfigManager({
        unknownField: 'test',
        browser: { headless: true },
      } as any);
      
      const settings = config.get();
      expect((settings as any).unknownField).toBeUndefined();
    });
  });
});

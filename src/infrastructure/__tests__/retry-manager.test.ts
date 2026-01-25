import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetryManager } from '../retry-manager.js';

describe('RetryManager', () => {
  let retry: RetryManager;

  beforeEach(() => {
    retry = new RetryManager({
      enabled: true,
      maxAttempts: 3,
      minTimeout: 100,
      maxTimeout: 1000,
    });
    vi.clearAllMocks();
  });

  describe('Successful Operations', () => {
    it('should execute and return result on success', async () => {
      const operation = vi.fn(async () => 'success');
      
      const result = await retry.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry successful operations', async () => {
      const operation = vi.fn(async () => ({ data: 'test' }));
      
      await retry.execute(operation);
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const operation = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Temporary failure');
          (error as any).retryable = true;
          throw error;
        }
        return 'success';
      });
      
      const result = await retry.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect maxAttempts', async () => {
      const operation = vi.fn(async () => {
        const error = new Error('Always fails');
        (error as any).retryable = true;
        throw error;
      });
      
      await expect(retry.execute(operation)).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(3); // maxAttempts
    });

    it('should use exponential backoff', async () => {
      vi.useFakeTimers();
      
      let attempts = 0;
      const timestamps: number[] = [];
      const operation = vi.fn(async () => {
        timestamps.push(Date.now());
        attempts++;
        if (attempts < 3) {
          const error = new Error('Retry me');
          (error as any).retryable = true;
          throw error;
        }
        return 'success';
      });
      
      const promise = retry.execute(operation);
      
      // Manually advance timers for each retry
      await vi.runAllTimersAsync();
      await promise;
      
      // Verify increasing delays (exponential backoff)
      expect(timestamps.length).toBe(3);
      const delay1 = timestamps[1] - timestamps[0];
      const delay2 = timestamps[2] - timestamps[1];
      
      // Second delay should be roughly 2x first delay (factor of 2)
      // Allow some variance due to jitter
      expect(delay2).toBeGreaterThan(delay1 * 1.5);
      
      vi.useRealTimers();
    });
  });

  describe('Non-Retryable Errors', () => {
    it('should not retry errors without retryable flag', async () => {
      const operation = vi.fn(async () => {
        throw new Error('Non-retryable error');
      });
      
      await expect(retry.execute(operation)).rejects.toThrow('Non-retryable error');
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry errors with retryable=false', async () => {
      const operation = vi.fn(async () => {
        const error = new Error('Explicitly non-retryable');
        (error as any).retryable = false;
        throw error;
      });
      
      await expect(retry.execute(operation)).rejects.toThrow('Explicitly non-retryable');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Failure Handlers', () => {
    it('should call onFailedAttempt handler', async () => {
      const onFailedAttempt = vi.fn();
      let attempts = 0;
      
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Temporary');
          (error as any).retryable = true;
          throw error;
        }
        return 'success';
      });
      
      await retry.execute(operation, { onFailedAttempt });
      
      // Should be called twice (for the 2 failed attempts)
      expect(onFailedAttempt).toHaveBeenCalledTimes(2);
      expect(onFailedAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptNumber: expect.any(Number),
          retriesLeft: expect.any(Number),
        })
      );
    });

    it('should provide correct attempt info to handler', async () => {
      const calls: any[] = [];
      const onFailedAttempt = (error: any) => calls.push(error);
      
      const operation = vi.fn(async () => {
        const error = new Error('Always fails');
        (error as any).retryable = true;
        throw error;
      });
      
      await expect(retry.execute(operation, { onFailedAttempt })).rejects.toThrow();
      
      expect(calls.length).toBe(3);
      expect(calls[0].attemptNumber).toBe(1);
      expect(calls[1].attemptNumber).toBe(2);
      expect(calls[2].attemptNumber).toBe(3);
      
      expect(calls[0].retriesLeft).toBe(2);
      expect(calls[1].retriesLeft).toBe(1);
      expect(calls[2].retriesLeft).toBe(0);
    });
  });

  describe('Custom Options', () => {
    it('should use custom retries count', async () => {
      const operation = vi.fn(async () => {
        const error = new Error('Fail');
        (error as any).retryable = true;
        throw error;
      });
      
      await expect(retry.execute(operation, { retries: 5 })).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(5);
    });

    it('should use custom timeout values', async () => {
      vi.useFakeTimers();
      
      let attempts = 0;
      const operation = vi.fn(async () => {
        attempts++;
        if (attempts < 2) {
          const error = new Error('Retry');
          (error as any).retryable = true;
          throw error;
        }
        return 'success';
      });
      
      await retry.execute(operation, {
        retries: 2,
        minTimeout: 500,
        maxTimeout: 2000,
      });
      
      vi.useRealTimers();
    });
  });

  describe('Enable/Disable', () => {
    it('should not retry when disabled', async () => {
      retry = new RetryManager({ enabled: false });
      
      const operation = vi.fn(async () => {
        const error = new Error('Fail');
        (error as any).retryable = true;
        throw error;
      });
      
      await expect(retry.execute(operation)).rejects.toThrow('Fail');
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should execute operation once when disabled', async () => {
      retry = new RetryManager({ enabled: false });
      
      const operation = vi.fn(async () => 'success');
      const result = await retry.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle synchronous errors', async () => {
      const operation = vi.fn(() => {
        throw new Error('Sync error');
      });
      
      await expect(retry.execute(operation as any)).rejects.toThrow('Sync error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle operations that throw non-Error objects', async () => {
      const operation = vi.fn(async () => {
        throw 'string error';
      });
      
      await expect(retry.execute(operation)).rejects.toBe('string error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle operations that return promises', async () => {
      const operation = vi.fn(() => Promise.resolve('result'));
      
      const result = await retry.execute(operation);
      expect(result).toBe('result');
    });

    it('should handle maximum retries of 1', async () => {
      retry = new RetryManager({ maxAttempts: 1 });
      
      const operation = vi.fn(async () => {
        const error = new Error('Fail');
        (error as any).retryable = true;
        throw error;
      });
      
      await expect(retry.execute(operation)).rejects.toThrow('Fail');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Propagation', () => {
    it('should preserve error properties', async () => {
      const operation = vi.fn(async () => {
        const error = new Error('Custom error');
        (error as any).code = 'CUSTOM_CODE';
        (error as any).statusCode = 500;
        throw error;
      });
      
      try {
        await retry.execute(operation);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe('Custom error');
        expect(error.code).toBe('CUSTOM_CODE');
        expect(error.statusCode).toBe(500);
      }
    });

    it('should preserve stack traces', async () => {
      const operation = vi.fn(async () => {
        throw new Error('Test error');
      });
      
      try {
        await retry.execute(operation);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.stack).toBeDefined();
        expect(error.stack).toContain('Test error');
      }
    });
  });
});

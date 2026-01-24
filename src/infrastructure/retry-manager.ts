/**
 * Retry Manager
 * Wraps p-retry with Oktyv-specific retry logic
 * Provides exponential backoff for failed browser operations
 */

import pRetry, { AbortError } from 'p-retry';
import { config } from './config-manager.js';
import { logger } from '../utils/logger.js';

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  onFailedAttempt?: (error: Error, attempt: number) => void;
}

/**
 * Retry Manager
 * Executes async operations with automatic retry on failure
 */
export class RetryManager {
  private enabled: boolean;
  private defaultOptions: RetryOptions;

  constructor() {
    const retryConfig = config.getRetryConfig();
    this.enabled = retryConfig.enabled;
    this.defaultOptions = {
      retries: retryConfig.maxAttempts,
      minTimeout: retryConfig.minTimeout,
      maxTimeout: retryConfig.maxTimeout,
    };

    logger.info('RetryManager initialized', {
      enabled: this.enabled,
      defaultRetries: this.defaultOptions.retries,
    });
  }

  /**
   * Execute async operation with retry logic
   */
  public async execute<T>(
    operation: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    // If retries disabled, execute once
    if (!this.enabled) {
      return operation();
    }

    const mergedOptions = { ...this.defaultOptions, ...options };

    return pRetry(
      async (attemptNumber) => {
        try {
          logger.debug('Retry attempt', { attempt: attemptNumber });
          return await operation();
        } catch (error) {
          // Check if error has retryable property (duck typing)
          const hasRetryable = error && typeof error === 'object' && 'retryable' in error;
          if (hasRetryable && !(error as any).retryable) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('Non-retryable error, aborting', {
              attempt: attemptNumber,
              error: errorMessage,
            });
            throw new AbortError(errorMessage);
          }

          // Call custom handler if provided
          if (mergedOptions.onFailedAttempt) {
            mergedOptions.onFailedAttempt(error as Error, attemptNumber);
          }

          logger.warn('Retry failed attempt', {
            attempt: attemptNumber,
            error: error instanceof Error ? error.message : String(error),
          });

          throw error;
        }
      },
      {
        retries: mergedOptions.retries,
        minTimeout: mergedOptions.minTimeout,
        maxTimeout: mergedOptions.maxTimeout,
        factor: 2, // Exponential backoff factor
        onFailedAttempt: (error) => {
          logger.debug('p-retry failed attempt', {
            attemptNumber: error.attemptNumber,
            retriesLeft: error.retriesLeft,
          });
        },
      }
    );
  }

  /**
   * Enable retry logic
   */
  public enable(): void {
    this.enabled = true;
    logger.info('Retry enabled');
  }

  /**
   * Disable retry logic
   */
  public disable(): void {
    this.enabled = false;
    logger.info('Retry disabled');
  }

  /**
   * Check if retry is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const retry = new RetryManager();

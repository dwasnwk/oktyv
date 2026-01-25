/**
 * Retry Manager
 * Wraps p-retry with Oktyv-specific retry logic
 * Provides exponential backoff for failed browser operations
 */

import pRetry, { AbortError, FailedAttemptError } from 'p-retry';

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  minTimeout: number;
  maxTimeout: number;
}

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  onFailedAttempt?: (error: FailedAttemptError) => void;
}

/**
 * Retry Manager
 * Executes async operations with automatic retry on failure
 */
export class RetryManager {
  private config: RetryConfig;

  constructor(config: RetryConfig) {
    this.config = config;
  }

  /**
   * Execute async operation with retry logic
   */
  public async execute<T>(
    operation: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    // If retries disabled, execute once
    if (!this.config.enabled) {
      return operation();
    }

    // Convert maxAttempts to retries (p-retry counts retries AFTER initial attempt)
    // So maxAttempts: 3 means 1 initial + 2 retries
    const maxRetries = (options?.retries ?? this.config.maxAttempts) - 1;

    const mergedOptions = {
      retries: Math.max(0, maxRetries), // Ensure non-negative
      minTimeout: options?.minTimeout ?? this.config.minTimeout,
      maxTimeout: options?.maxTimeout ?? this.config.maxTimeout,
      onFailedAttempt: options?.onFailedAttempt,
    };

    return pRetry(
      async () => {
        try {
          return await operation();
        } catch (error) {
          // Check if error has retryable property (duck typing)
          const hasRetryable = error && typeof error === 'object' && 'retryable' in error;
          if (hasRetryable && !(error as any).retryable) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new AbortError(errorMessage);
          }

          throw error;
        }
      },
      {
        retries: mergedOptions.retries,
        minTimeout: mergedOptions.minTimeout,
        maxTimeout: mergedOptions.maxTimeout,
        factor: 2, // Exponential backoff factor
        onFailedAttempt: mergedOptions.onFailedAttempt 
          ? (error: FailedAttemptError) => {
              // Call custom handler with the FailedAttemptError which includes
              // attemptNumber, retriesLeft, etc.
              mergedOptions.onFailedAttempt!(error);
            }
          : undefined,
      }
    );
  }

  /**
   * Enable retry logic
   */
  public enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable retry logic
   */
  public disable(): void {
    this.config.enabled = false;
  }

  /**
   * Check if retry is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }
}

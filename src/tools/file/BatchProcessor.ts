import { createLogger } from '../../utils/logger.js';

const logger = createLogger('batch-processor');

export type BatchOperation = 'copy' | 'move' | 'delete';

export interface BatchItem {
  source: string;
  destination?: string; // Not used for delete
}

export interface BatchOptions {
  operation: BatchOperation;
  items: BatchItem[];
  concurrency?: number;
  continueOnError?: boolean;
}

export interface BatchResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ item: BatchItem; error: string }>;
}

/**
 * Batch file operation processor
 */
export class BatchProcessor {
  /**
   * Initialize batch processor
   */
  constructor() {
    logger.info('Batch processor initialized');
  }
  
  /**
   * Execute batch operation
   * 
   * @param options - Batch options
   * @param executor - Function to execute for each item
   * @returns Batch result
   */
  async execute(
    options: BatchOptions,
    executor: (item: BatchItem) => Promise<void>
  ): Promise<BatchResult> {
    const { operation, items, concurrency = 5, continueOnError = true } = options;
    
    logger.info('Starting batch operation', {
      operation,
      total: items.length,
      concurrency,
      continueOnError,
    });
    
    const result: BatchResult = {
      total: items.length,
      successful: 0,
      failed: 0,
      errors: [],
    };
    
    // Process items with concurrency control
    const chunks = this.chunkArray(items, concurrency);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (item) => {
        try {
          await executor(item);
          result.successful++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            item,
            error: (error as Error).message,
          });
          
          if (!continueOnError) {
            throw error;
          }
        }
      });
      
      if (continueOnError) {
        // Wait for all in chunk to complete (ignore errors)
        await Promise.allSettled(promises);
      } else {
        // Stop on first error
        await Promise.all(promises);
      }
    }
    
    logger.info('Batch operation complete', {
      operation,
      successful: result.successful,
      failed: result.failed,
    });
    
    return result;
  }
  
  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

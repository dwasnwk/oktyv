/**
 * Database Engine - Transaction Manager
 * 
 * Handles database transactions with retry logic for deadlocks.
 * 
 * Features:
 * - SQL transactions (via Prisma)
 * - MongoDB multi-document transactions
 * - Automatic retry on deadlock
 * - Isolation level configuration
 * - Timeout handling
 */

import { PrismaClient } from '@prisma/client';
import { MongoClient, ClientSession } from 'mongodb';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('transaction-manager');

/**
 * Transaction operation type
 */
export enum TransactionOperationType {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  QUERY = 'query',
}

/**
 * Transaction operation
 */
export interface TransactionOperation {
  type: TransactionOperationType;
  table: string;
  data?: Record<string, any>;
  where?: Record<string, any>;
  select?: string[];
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  maxRetries?: number;
  timeout?: number;  // ms
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}

/**
 * Transaction result
 */
export interface TransactionResult {
  success: boolean;
  results: any[];
  error?: string;
  retries: number;
}

/**
 * Transaction Manager
 * 
 * Manages database transactions with automatic retry.
 */
export class TransactionManager {
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  
  constructor() {
    logger.info('Transaction manager initialized');
  }
  
  /**
   * Execute Prisma transaction
   * 
   * @param prisma - Prisma client
   * @param operations - Operations to execute
   * @param options - Transaction options
   * @returns Transaction result
   */
  async executePrisma(
    prisma: PrismaClient,
    operations: TransactionOperation[],
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const timeout = options.timeout ?? this.DEFAULT_TIMEOUT;
    
    let retries = 0;
    let lastError: Error | undefined;
    
    while (retries <= maxRetries) {
      try {
        const results: any[] = [];
        
        // Execute all operations in a transaction
        await prisma.$transaction(
          async (tx) => {
            for (const operation of operations) {
              const result = await this.executeOperation(tx, operation);
              results.push(result);
            }
          },
          {
            timeout,
            maxWait: 5000, // Max time to wait for transaction slot
          }
        );
        
        logger.info('Transaction committed', {
          operations: operations.length,
          retries,
        });
        
        return {
          success: true,
          results,
          retries,
        };
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable (deadlock)
        if (this.isDeadlock(error) && retries < maxRetries) {
          retries++;
          const delay = Math.pow(2, retries) * 100; // Exponential backoff
          
          logger.warn('Transaction deadlock, retrying', {
            retries,
            delay,
            error: error.message,
          });
          
          await this.sleep(delay);
          continue;
        }
        
        logger.error('Transaction failed', {
          operations: operations.length,
          retries,
          error: error.message,
        });
        
        return {
          success: false,
          results: [],
          error: error.message,
          retries,
        };
      }
    }
    
    return {
      success: false,
      results: [],
      error: lastError?.message || 'Transaction failed after retries',
      retries,
    };
  }
  
  /**
   * Execute MongoDB transaction
   * 
   * @param client - MongoDB client
   * @param operations - Operations to execute
   * @param options - Transaction options
   * @returns Transaction result
   */
  async executeMongo(
    client: MongoClient,
    operations: TransactionOperation[],
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    
    let retries = 0;
    let lastError: Error | undefined;
    
    while (retries <= maxRetries) {
      const session = client.startSession();
      
      try {
        const results: any[] = [];
        
        await session.withTransaction(async () => {
          for (const operation of operations) {
            const result = await this.executeMongoOperation(client, session, operation);
            results.push(result);
          }
        });
        
        logger.info('MongoDB transaction committed', {
          operations: operations.length,
          retries,
        });
        
        return {
          success: true,
          results,
          retries,
        };
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable
        if (this.isDeadlock(error) && retries < maxRetries) {
          retries++;
          const delay = Math.pow(2, retries) * 100;
          
          logger.warn('MongoDB transaction conflict, retrying', {
            retries,
            delay,
            error: error.message,
          });
          
          await this.sleep(delay);
          continue;
        }
        
        logger.error('MongoDB transaction failed', {
          operations: operations.length,
          retries,
          error: error.message,
        });
        
        return {
          success: false,
          results: [],
          error: error.message,
          retries,
        };
      } finally {
        await session.endSession();
      }
    }
    
    return {
      success: false,
      results: [],
      error: lastError?.message || 'Transaction failed after retries',
      retries,
    };
  }
  
  /**
   * Execute single operation within Prisma transaction
   */
  private async executeOperation(tx: any, operation: TransactionOperation): Promise<any> {
    const { type, table, data, where, select, orderBy, limit } = operation;
    
    switch (type) {
      case TransactionOperationType.INSERT: {
        if (!data) {
          throw new Error('Data required for insert operation');
        }
        
        // Build INSERT query
        const columns = Object.keys(data);
        const sql = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`;
        const params = columns.map(col => data[col]);
        
        const results = await tx.$queryRawUnsafe(sql, ...params);
        return (results as any[])[0];
      }
      
      case TransactionOperationType.UPDATE: {
        if (!data || !where) {
          throw new Error('Data and where required for update operation');
        }
        
        const setColumns = Object.keys(data);
        const whereColumns = Object.keys(where);
        
        let sql = `UPDATE "${table}" SET `;
        sql += setColumns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
        sql += ` WHERE `;
        sql += whereColumns.map((col, i) => `"${col}" = $${setColumns.length + i + 1}`).join(' AND ');
        
        const params = [...setColumns.map(col => data[col]), ...whereColumns.map(col => where[col])];
        
        return await tx.$executeRawUnsafe(sql, ...params);
      }
      
      case TransactionOperationType.DELETE: {
        if (!where) {
          throw new Error('Where required for delete operation');
        }
        
        const whereColumns = Object.keys(where);
        let sql = `DELETE FROM "${table}" WHERE `;
        sql += whereColumns.map((col, i) => `"${col}" = $${i + 1}`).join(' AND ');
        
        const params = whereColumns.map(col => where[col]);
        
        return await tx.$executeRawUnsafe(sql, ...params);
      }
      
      case TransactionOperationType.QUERY: {
        let sql = `SELECT `;
        
        if (select && select.length > 0) {
          sql += select.map(c => `"${c}"`).join(', ');
        } else {
          sql += '*';
        }
        
        sql += ` FROM "${table}"`;
        
        const params: any[] = [];
        if (where && Object.keys(where).length > 0) {
          const conditions = Object.entries(where).map(([key, value], index) => {
            params.push(value);
            return `"${key}" = $${index + 1}`;
          });
          sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        if (orderBy && Object.keys(orderBy).length > 0) {
          const orderClauses = Object.entries(orderBy).map(([key, direction]) => {
            return `"${key}" ${direction.toUpperCase()}`;
          });
          sql += ` ORDER BY ${orderClauses.join(', ')}`;
        }
        
        if (limit) {
          sql += ` LIMIT ${limit}`;
        }
        
        return await tx.$queryRawUnsafe(sql, ...params);
      }
      
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }
  
  /**
   * Execute single operation within MongoDB transaction
   */
  private async executeMongoOperation(
    client: MongoClient,
    session: ClientSession,
    operation: TransactionOperation
  ): Promise<any> {
    const { type, table, data, where } = operation;
    const db = client.db();
    const collection = db.collection(table);
    
    switch (type) {
      case TransactionOperationType.INSERT: {
        if (!data) {
          throw new Error('Data required for insert operation');
        }
        
        const result = await collection.insertOne(data, { session });
        return result.insertedId;
      }
      
      case TransactionOperationType.UPDATE: {
        if (!data || !where) {
          throw new Error('Data and where required for update operation');
        }
        
        const result = await collection.updateMany(where, { $set: data }, { session });
        return result.modifiedCount;
      }
      
      case TransactionOperationType.DELETE: {
        if (!where) {
          throw new Error('Where required for delete operation');
        }
        
        const result = await collection.deleteMany(where, { session });
        return result.deletedCount;
      }
      
      case TransactionOperationType.QUERY: {
        const results = await collection.find(where || {}, { session }).toArray();
        return results;
      }
      
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }
  
  /**
   * Check if error is a deadlock
   */
  private isDeadlock(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    
    // PostgreSQL deadlock
    if (error.code === '40P01' || message.includes('deadlock')) {
      return true;
    }
    
    // MySQL deadlock
    if (error.code === 'ER_LOCK_DEADLOCK' || message.includes('deadlock')) {
      return true;
    }
    
    // MongoDB write conflict
    if (error.code === 112 || message.includes('writeconflict')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

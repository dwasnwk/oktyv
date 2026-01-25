/**
 * Database Engine - Main Orchestrator
 * 
 * Integrates all database components for unified database access.
 * 
 * Features:
 * - SQL databases (PostgreSQL, MySQL, SQLite) via Prisma
 * - NoSQL databases (MongoDB) via native driver
 * - Connection pooling with Vault integration
 * - Transaction support with automatic retry
 * - Type-safe queries
 */

import { ConnectionPool, ConnectionConfig, DatabaseType } from './ConnectionPool.js';
import { PrismaManager, QueryOptions, InsertOptions, UpdateOptions, DeleteOptions } from './PrismaManager.js';
import { MongoManager, MongoQueryOptions, MongoInsertOptions, MongoUpdateOptions, MongoDeleteOptions } from './MongoManager.js';
import { TransactionManager, TransactionOperation, TransactionOptions } from './TransactionManager.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('database-engine');

/**
 * Database Engine
 * 
 * Main orchestrator for database operations.
 */
export class DatabaseEngine {
  private connectionPool: ConnectionPool;
  private prismaManager: PrismaManager;
  private mongoManager: MongoManager;
  private transactionManager: TransactionManager;
  
  constructor(getVault: (vault: string, key: string) => Promise<string>) {
    this.connectionPool = new ConnectionPool(getVault);
    this.prismaManager = new PrismaManager(this.connectionPool);
    this.mongoManager = new MongoManager(this.connectionPool);
    this.transactionManager = new TransactionManager();
    
    logger.info('Database engine initialized');
  }
  
  /**
   * Connect to a database
   * 
   * @param config - Connection configuration
   */
  async connect(config: ConnectionConfig): Promise<void> {
    logger.info('Connecting to database', {
      connectionId: config.connectionId,
      type: config.type,
    });
    
    try {
      if (config.type === DatabaseType.MONGODB) {
        await this.mongoManager.connect(config);
      } else {
        await this.prismaManager.connect(config);
      }
      
      logger.info('Database connected successfully', {
        connectionId: config.connectionId,
      });
    } catch (error: any) {
      logger.error('Database connection failed', {
        connectionId: config.connectionId,
        error: error.message,
      });
      throw error;
    }
  }
  
  /**
   * Query records
   * 
   * @param connectionId - Connection identifier
   * @param table - Table/collection name
   * @param options - Query options
   * @returns Query results
   */
  async query(
    connectionId: string,
    table: string,
    options: QueryOptions | MongoQueryOptions = {}
  ): Promise<any[]> {
    const connection = this.connectionPool.get(connectionId);
    
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    if (connection.type === DatabaseType.MONGODB) {
      return await this.mongoManager.query(connectionId, table, options as MongoQueryOptions);
    } else {
      return await this.prismaManager.query(connectionId, table, options as QueryOptions);
    }
  }
  
  /**
   * Insert records
   * 
   * @param connectionId - Connection identifier
   * @param table - Table/collection name
   * @param options - Insert options
   * @returns Insert result
   */
  async insert(
    connectionId: string,
    table: string,
    options: InsertOptions | MongoInsertOptions
  ): Promise<any> {
    const connection = this.connectionPool.get(connectionId);
    
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    if (connection.type === DatabaseType.MONGODB) {
      return await this.mongoManager.insert(connectionId, table, options as MongoInsertOptions);
    } else {
      return await this.prismaManager.insert(connectionId, table, options as InsertOptions);
    }
  }
  
  /**
   * Update records
   * 
   * @param connectionId - Connection identifier
   * @param table - Table/collection name
   * @param options - Update options
   * @returns Number of updated records
   */
  async update(
    connectionId: string,
    table: string,
    options: UpdateOptions | MongoUpdateOptions
  ): Promise<number> {
    const connection = this.connectionPool.get(connectionId);
    
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    if (connection.type === DatabaseType.MONGODB) {
      return await this.mongoManager.update(connectionId, table, options as MongoUpdateOptions);
    } else {
      return await this.prismaManager.update(connectionId, table, options as UpdateOptions);
    }
  }
  
  /**
   * Delete records
   * 
   * @param connectionId - Connection identifier
   * @param table - Table/collection name
   * @param options - Delete options
   * @returns Number of deleted records
   */
  async delete(
    connectionId: string,
    table: string,
    options: DeleteOptions | MongoDeleteOptions
  ): Promise<number> {
    const connection = this.connectionPool.get(connectionId);
    
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    if (connection.type === DatabaseType.MONGODB) {
      return await this.mongoManager.delete(connectionId, table, options as MongoDeleteOptions);
    } else {
      return await this.prismaManager.delete(connectionId, table, options as DeleteOptions);
    }
  }
  
  /**
   * Execute transaction
   * 
   * @param connectionId - Connection identifier
   * @param operations - Operations to execute
   * @param options - Transaction options
   * @returns Transaction result
   */
  async transaction(
    connectionId: string,
    operations: TransactionOperation[],
    options: TransactionOptions = {}
  ): Promise<any> {
    const connection = this.connectionPool.get(connectionId);
    
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    logger.info('Starting transaction', {
      connectionId,
      operations: operations.length,
    });
    
    if (connection.type === DatabaseType.MONGODB) {
      const client = this.mongoManager.getClient(connectionId);
      return await this.transactionManager.executeMongo(client, operations, options);
    } else {
      const prisma = this.prismaManager.getClient(connectionId);
      return await this.transactionManager.executePrisma(prisma, operations, options);
    }
  }
  
  /**
   * Execute raw SQL query
   * 
   * @param connectionId - Connection identifier
   * @param query - SQL query
   * @param params - Query parameters
   * @returns Query results
   */
  async rawQuery(
    connectionId: string,
    query: string,
    params: any[] = []
  ): Promise<any> {
    const connection = this.connectionPool.get(connectionId);
    
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    if (connection.type === DatabaseType.MONGODB) {
      throw new Error('Raw query not supported for MongoDB');
    }
    
    return await this.prismaManager.rawQuery(connectionId, query, params);
  }
  
  /**
   * Execute MongoDB aggregation
   * 
   * @param connectionId - Connection identifier
   * @param collection - Collection name
   * @param pipeline - Aggregation pipeline
   * @returns Aggregation results
   */
  async aggregate(
    connectionId: string,
    collection: string,
    pipeline: any[]
  ): Promise<any[]> {
    const connection = this.connectionPool.get(connectionId);
    
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    if (connection.type !== DatabaseType.MONGODB) {
      throw new Error('Aggregation only supported for MongoDB');
    }
    
    return await this.mongoManager.aggregate(connectionId, collection, pipeline);
  }
  
  /**
   * Disconnect from database
   * 
   * @param connectionId - Connection identifier
   */
  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connectionPool.get(connectionId);
    
    if (!connection) {
      logger.warn('Connection not found for disconnect', { connectionId });
      return;
    }
    
    logger.info('Disconnecting from database', { connectionId });
    
    if (connection.type === DatabaseType.MONGODB) {
      await this.mongoManager.disconnect(connectionId);
    } else {
      await this.prismaManager.disconnect(connectionId);
    }
    
    logger.info('Database disconnected', { connectionId });
  }
  
  /**
   * Get connection pool
   */
  getConnectionPool(): ConnectionPool {
    return this.connectionPool;
  }
  
  /**
   * Get Prisma manager
   */
  getPrismaManager(): PrismaManager {
    return this.prismaManager;
  }
  
  /**
   * Get MongoDB manager
   */
  getMongoManager(): MongoManager {
    return this.mongoManager;
  }
  
  /**
   * Get transaction manager
   */
  getTransactionManager(): TransactionManager {
    return this.transactionManager;
  }
  
  /**
   * List all connections
   */
  listConnections(): string[] {
    return this.connectionPool.list();
  }
  
  /**
   * Get connection metadata
   */
  getConnectionMetadata(connectionId: string): any {
    return this.connectionPool.getMetadata(connectionId);
  }
  
  /**
   * Health check for all connections
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    return await this.connectionPool.healthCheck();
  }
  
  /**
   * Get statistics
   */
  getStats(): any {
    return this.connectionPool.getStats();
  }
  
  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all database connections');
    await this.connectionPool.closeAll();
  }
}

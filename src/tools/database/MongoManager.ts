/**
 * Database Engine - MongoDB Manager
 * 
 * Manages MongoDB connections and operations.
 * 
 * Features:
 * - Native MongoDB driver integration
 * - Connection pooling
 * - CRUD operations
 * - Aggregation pipelines
 * - Index management
 * - Transaction support (4.0+)
 */

import { MongoClient, Db, Collection, Document, Filter, UpdateFilter, FindOptions } from 'mongodb';
import { ConnectionPool, ConnectionConfig, DatabaseType, DatabaseConnection } from './ConnectionPool.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('mongo-manager');

/**
 * MongoDB query options
 */
export interface MongoQueryOptions {
  filter?: Filter<Document>;
  projection?: Record<string, 0 | 1>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

/**
 * MongoDB insert options
 */
export interface MongoInsertOptions {
  documents: Document | Document[];
}

/**
 * MongoDB update options
 */
export interface MongoUpdateOptions {
  filter: Filter<Document>;
  update: UpdateFilter<Document>;
  upsert?: boolean;
}

/**
 * MongoDB delete options
 */
export interface MongoDeleteOptions {
  filter: Filter<Document>;
}

/**
 * MongoDB Manager
 * 
 * Manages MongoDB connections and operations.
 */
export class MongoManager {
  private connectionPool: ConnectionPool;
  
  constructor(connectionPool: ConnectionPool) {
    this.connectionPool = connectionPool;
    logger.info('MongoDB manager initialized');
  }
  
  /**
   * Connect to MongoDB
   * 
   * @param config - Connection configuration
   * @returns MongoDB client
   */
  async connect(config: ConnectionConfig): Promise<MongoClient> {
    // Validate database type
    if (config.type !== DatabaseType.MONGODB) {
      throw new Error(`Invalid database type for MongoDB: ${config.type}`);
    }
    
    // Check if already connected
    if (this.connectionPool.has(config.connectionId)) {
      const existing = this.connectionPool.get<MongoClient>(config.connectionId);
      if (existing) {
        logger.info('Reusing existing MongoDB connection', { connectionId: config.connectionId });
        this.connectionPool.updateLastUsed(config.connectionId);
        return existing.client;
      }
    }
    
    // Get connection string
    const connectionString = await this.connectionPool.getConnectionString(config);
    
    // Create MongoDB client
    const client = new MongoClient(connectionString, {
      maxPoolSize: config.poolSize || 10,
      minPoolSize: 2,
      maxIdleTimeMS: config.idleTimeout || 30000,
      connectTimeoutMS: config.connectionTimeout || 10000,
    });
    
    // Connect
    try {
      await client.connect();
      
      // Test connection
      await client.db().admin().ping();
      
      logger.info('MongoDB client connected', {
        connectionId: config.connectionId,
      });
    } catch (error: any) {
      logger.error('MongoDB connection failed', {
        connectionId: config.connectionId,
        error: error.message,
      });
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // Store in connection pool
    const connection: DatabaseConnection<MongoClient> = {
      connectionId: config.connectionId,
      type: config.type,
      client,
      config,
      metadata: {
        connectionId: config.connectionId,
        type: config.type,
        connected: true,
        createdAt: new Date(),
        lastUsed: new Date(),
        poolSize: config.poolSize || 10,
        activeConnections: 1,
      },
    };
    
    this.connectionPool.set(connection);
    
    return client;
  }
  
  /**
   * Get MongoDB client
   * 
   * @param connectionId - Connection identifier
   * @returns MongoDB client
   */
  getClient(connectionId: string): MongoClient {
    const connection = this.connectionPool.get<MongoClient>(connectionId);
    
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    if (!connection.metadata.connected) {
      throw new Error(`Connection ${connectionId} is not connected`);
    }
    
    this.connectionPool.updateLastUsed(connectionId);
    
    return connection.client;
  }
  
  /**
   * Get database
   * 
   * @param connectionId - Connection identifier
   * @param databaseName - Database name (optional, uses default from connection string)
   * @returns MongoDB database
   */
  getDatabase(connectionId: string, databaseName?: string): Db {
    const client = this.getClient(connectionId);
    return databaseName ? client.db(databaseName) : client.db();
  }
  
  /**
   * Get collection
   * 
   * @param connectionId - Connection identifier
   * @param collectionName - Collection name
   * @param databaseName - Database name (optional)
   * @returns MongoDB collection
   */
  getCollection(
    connectionId: string,
    collectionName: string,
    databaseName?: string
  ): Collection<Document> {
    const db = this.getDatabase(connectionId, databaseName);
    return db.collection(collectionName);
  }
  
  /**
   * Query documents
   * 
   * @param connectionId - Connection identifier
   * @param collection - Collection name
   * @param options - Query options
   * @returns Matching documents
   */
  async query(
    connectionId: string,
    collection: string,
    options: MongoQueryOptions = {}
  ): Promise<Document[]> {
    const coll = this.getCollection(connectionId, collection);
    
    const { filter = {}, projection, sort, limit, skip } = options;
    
    const findOptions: FindOptions = {};
    
    if (projection) {
      findOptions.projection = projection;
    }
    
    if (sort) {
      findOptions.sort = sort;
    }
    
    if (limit) {
      findOptions.limit = limit;
    }
    
    if (skip) {
      findOptions.skip = skip;
    }
    
    logger.debug('Executing MongoDB query', {
      connectionId,
      collection,
      filter,
      options: findOptions,
    });
    
    try {
      const results = await coll.find(filter, findOptions).toArray();
      return results;
    } catch (error: any) {
      logger.error('MongoDB query failed', {
        connectionId,
        collection,
        error: error.message,
      });
      throw new Error(`Query failed: ${error.message}`);
    }
  }
  
  /**
   * Insert documents
   * 
   * @param connectionId - Connection identifier
   * @param collection - Collection name
   * @param options - Insert options
   * @returns Inserted document IDs
   */
  async insert(
    connectionId: string,
    collection: string,
    options: MongoInsertOptions
  ): Promise<any> {
    const coll = this.getCollection(connectionId, collection);
    const { documents } = options;
    
    logger.debug('Executing MongoDB insert', {
      connectionId,
      collection,
      count: Array.isArray(documents) ? documents.length : 1,
    });
    
    try {
      if (Array.isArray(documents)) {
        const result = await coll.insertMany(documents);
        return {
          insertedCount: result.insertedCount,
          insertedIds: Object.values(result.insertedIds),
        };
      } else {
        const result = await coll.insertOne(documents);
        return {
          insertedId: result.insertedId,
        };
      }
    } catch (error: any) {
      logger.error('MongoDB insert failed', {
        connectionId,
        collection,
        error: error.message,
      });
      throw new Error(`Insert failed: ${error.message}`);
    }
  }
  
  /**
   * Update documents
   * 
   * @param connectionId - Connection identifier
   * @param collection - Collection name
   * @param options - Update options
   * @returns Number of modified documents
   */
  async update(
    connectionId: string,
    collection: string,
    options: MongoUpdateOptions
  ): Promise<number> {
    const coll = this.getCollection(connectionId, collection);
    const { filter, update, upsert = false } = options;
    
    logger.debug('Executing MongoDB update', {
      connectionId,
      collection,
      filter,
      upsert,
    });
    
    try {
      const result = await coll.updateMany(filter, update, { upsert });
      return result.modifiedCount;
    } catch (error: any) {
      logger.error('MongoDB update failed', {
        connectionId,
        collection,
        error: error.message,
      });
      throw new Error(`Update failed: ${error.message}`);
    }
  }
  
  /**
   * Delete documents
   * 
   * @param connectionId - Connection identifier
   * @param collection - Collection name
   * @param options - Delete options
   * @returns Number of deleted documents
   */
  async delete(
    connectionId: string,
    collection: string,
    options: MongoDeleteOptions
  ): Promise<number> {
    const coll = this.getCollection(connectionId, collection);
    const { filter } = options;
    
    if (Object.keys(filter).length === 0) {
      throw new Error('Filter required for delete (use {} to delete all)');
    }
    
    logger.debug('Executing MongoDB delete', {
      connectionId,
      collection,
      filter,
    });
    
    try {
      const result = await coll.deleteMany(filter);
      return result.deletedCount;
    } catch (error: any) {
      logger.error('MongoDB delete failed', {
        connectionId,
        collection,
        error: error.message,
      });
      throw new Error(`Delete failed: ${error.message}`);
    }
  }
  
  /**
   * Execute aggregation pipeline
   * 
   * @param connectionId - Connection identifier
   * @param collection - Collection name
   * @param pipeline - Aggregation pipeline stages
   * @returns Aggregation results
   */
  async aggregate(
    connectionId: string,
    collection: string,
    pipeline: Document[]
  ): Promise<Document[]> {
    const coll = this.getCollection(connectionId, collection);
    
    logger.debug('Executing MongoDB aggregation', {
      connectionId,
      collection,
      stages: pipeline.length,
    });
    
    try {
      const results = await coll.aggregate(pipeline).toArray();
      return results;
    } catch (error: any) {
      logger.error('MongoDB aggregation failed', {
        connectionId,
        collection,
        error: error.message,
      });
      throw new Error(`Aggregation failed: ${error.message}`);
    }
  }
  
  /**
   * Create index
   * 
   * @param connectionId - Connection identifier
   * @param collection - Collection name
   * @param keys - Index keys
   * @param options - Index options
   */
  async createIndex(
    connectionId: string,
    collection: string,
    keys: Record<string, 1 | -1>,
    options: { unique?: boolean; name?: string } = {}
  ): Promise<string> {
    const coll = this.getCollection(connectionId, collection);
    
    logger.debug('Creating MongoDB index', {
      connectionId,
      collection,
      keys,
      options,
    });
    
    try {
      const indexName = await coll.createIndex(keys, options);
      return indexName;
    } catch (error: any) {
      logger.error('MongoDB index creation failed', {
        connectionId,
        collection,
        error: error.message,
      });
      throw new Error(`Index creation failed: ${error.message}`);
    }
  }
  
  /**
   * Disconnect from MongoDB
   * 
   * @param connectionId - Connection identifier
   */
  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connectionPool.get<MongoClient>(connectionId);
    
    if (!connection) {
      logger.warn('Connection not found for disconnect', { connectionId });
      return;
    }
    
    try {
      await connection.client.close();
      
      connection.metadata.connected = false;
      this.connectionPool.remove(connectionId);
      
      logger.info('MongoDB client disconnected', { connectionId });
    } catch (error: any) {
      logger.error('Disconnect failed', {
        connectionId,
        error: error.message,
      });
      throw new Error(`Disconnect failed: ${error.message}`);
    }
  }
}

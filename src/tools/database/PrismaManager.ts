/**
 * Database Engine - Prisma Manager
 * 
 * Manages Prisma Client instances for SQL databases (PostgreSQL, MySQL, SQLite).
 * 
 * Features:
 * - Dynamic Prisma client creation
 * - Connection lifecycle management
 * - Type-safe queries
 * - Transaction support
 * - Connection pooling
 */

import { PrismaClient } from '@prisma/client';
import { ConnectionPool, ConnectionConfig, DatabaseType, DatabaseConnection } from './ConnectionPool.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('prisma-manager');

/**
 * Query options
 */
export interface QueryOptions {
  where?: Record<string, any>;
  select?: string[] | Record<string, boolean>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
}

/**
 * Insert options
 */
export interface InsertOptions {
  data: Record<string, any> | Record<string, any>[];
}

/**
 * Update options
 */
export interface UpdateOptions {
  where: Record<string, any>;
  data: Record<string, any>;
}

/**
 * Delete options
 */
export interface DeleteOptions {
  where: Record<string, any>;
}

/**
 * Prisma Manager
 * 
 * Manages Prisma clients for SQL databases.
 */
export class PrismaManager {
  private connectionPool: ConnectionPool;
  
  constructor(connectionPool: ConnectionPool) {
    this.connectionPool = connectionPool;
    logger.info('Prisma manager initialized');
  }
  
  /**
   * Connect to a SQL database
   * 
   * @param config - Connection configuration
   * @returns Prisma client
   */
  async connect(config: ConnectionConfig): Promise<PrismaClient> {
    // Validate database type
    if (![DatabaseType.POSTGRESQL, DatabaseType.MYSQL, DatabaseType.SQLITE].includes(config.type)) {
      throw new Error(`Unsupported database type for Prisma: ${config.type}`);
    }
    
    // Check if already connected
    if (this.connectionPool.has(config.connectionId)) {
      const existing = this.connectionPool.get<PrismaClient>(config.connectionId);
      if (existing) {
        logger.info('Reusing existing connection', { connectionId: config.connectionId });
        this.connectionPool.updateLastUsed(config.connectionId);
        return existing.client;
      }
    }
    
    // Get connection string
    const connectionString = await this.connectionPool.getConnectionString(config);
    
    // Create Prisma client with connection string
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
      log: ['warn', 'error'],
    });
    
    // Connect
    try {
      await prisma.$connect();
      
      logger.info('Prisma client connected', {
        connectionId: config.connectionId,
        type: config.type,
      });
    } catch (error: any) {
      logger.error('Prisma connection failed', {
        connectionId: config.connectionId,
        error: error.message,
      });
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // Store in connection pool
    const connection: DatabaseConnection<PrismaClient> = {
      connectionId: config.connectionId,
      type: config.type,
      client: prisma,
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
    
    return prisma;
  }
  
  /**
   * Get Prisma client
   * 
   * @param connectionId - Connection identifier
   * @returns Prisma client
   */
  getClient(connectionId: string): PrismaClient {
    const connection = this.connectionPool.get<PrismaClient>(connectionId);
    
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
   * Execute query
   * 
   * @param connectionId - Connection identifier
   * @param table - Table name
   * @param options - Query options
   * @returns Query results
   */
  async query(
    connectionId: string,
    table: string,
    options: QueryOptions = {}
  ): Promise<any[]> {
    const prisma = this.getClient(connectionId);
    
    // Build query dynamically
    // Note: Prisma requires compile-time knowledge of models
    // For now, use $queryRaw for dynamic queries
    
    const { where, select, orderBy, limit, offset } = options;
    
    // Build SQL query
    let sql = `SELECT `;
    
    if (select && Array.isArray(select)) {
      sql += select.join(', ');
    } else {
      sql += '*';
    }
    
    sql += ` FROM "${table}"`;
    
    // WHERE clause
    const params: any[] = [];
    if (where && Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([key, value], index) => {
        params.push(value);
        return `"${key}" = $${index + 1}`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // ORDER BY
    if (orderBy && Object.keys(orderBy).length > 0) {
      const orderClauses = Object.entries(orderBy).map(([key, direction]) => {
        return `"${key}" ${direction.toUpperCase()}`;
      });
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }
    
    // LIMIT
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    
    // OFFSET
    if (offset) {
      sql += ` OFFSET ${offset}`;
    }
    
    logger.debug('Executing query', { sql, params });
    
    try {
      const results = await prisma.$queryRawUnsafe(sql, ...params);
      return results as any[];
    } catch (error: any) {
      logger.error('Query failed', {
        connectionId,
        table,
        error: error.message,
      });
      throw new Error(`Query failed: ${error.message}`);
    }
  }
  
  /**
   * Insert records
   * 
   * @param connectionId - Connection identifier
   * @param table - Table name
   * @param options - Insert options
   * @returns Inserted record(s)
   */
  async insert(
    connectionId: string,
    table: string,
    options: InsertOptions
  ): Promise<any> {
    const prisma = this.getClient(connectionId);
    const { data } = options;
    
    // Handle single vs multiple inserts
    const isArray = Array.isArray(data);
    const records = isArray ? data : [data];
    
    if (records.length === 0) {
      throw new Error('No data provided for insert');
    }
    
    // Build INSERT query
    const columns = Object.keys(records[0]);
    const sql = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${records.map((_, i) => {
      const placeholders = columns.map((_, j) => `$${i * columns.length + j + 1}`);
      return `(${placeholders.join(', ')})`;
    }).join(', ')} RETURNING *`;
    
    const params = records.flatMap(record => columns.map(col => record[col]));
    
    logger.debug('Executing insert', { sql, params: params.length });
    
    try {
      const results = await prisma.$queryRawUnsafe(sql, ...params);
      return isArray ? results : (results as any[])[0];
    } catch (error: any) {
      logger.error('Insert failed', {
        connectionId,
        table,
        error: error.message,
      });
      throw new Error(`Insert failed: ${error.message}`);
    }
  }
  
  /**
   * Update records
   * 
   * @param connectionId - Connection identifier
   * @param table - Table name
   * @param options - Update options
   * @returns Number of updated records
   */
  async update(
    connectionId: string,
    table: string,
    options: UpdateOptions
  ): Promise<number> {
    const prisma = this.getClient(connectionId);
    const { where, data } = options;
    
    if (Object.keys(data).length === 0) {
      throw new Error('No data provided for update');
    }
    
    // Build UPDATE query
    const setColumns = Object.keys(data);
    const whereColumns = Object.keys(where);
    
    let sql = `UPDATE "${table}" SET `;
    sql += setColumns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
    sql += ` WHERE `;
    sql += whereColumns.map((col, i) => `"${col}" = $${setColumns.length + i + 1}`).join(' AND ');
    
    const params = [...setColumns.map(col => data[col]), ...whereColumns.map(col => where[col])];
    
    logger.debug('Executing update', { sql, params: params.length });
    
    try {
      const result = await prisma.$executeRawUnsafe(sql, ...params);
      return result;
    } catch (error: any) {
      logger.error('Update failed', {
        connectionId,
        table,
        error: error.message,
      });
      throw new Error(`Update failed: ${error.message}`);
    }
  }
  
  /**
   * Delete records
   * 
   * @param connectionId - Connection identifier
   * @param table - Table name
   * @param options - Delete options
   * @returns Number of deleted records
   */
  async delete(
    connectionId: string,
    table: string,
    options: DeleteOptions
  ): Promise<number> {
    const prisma = this.getClient(connectionId);
    const { where } = options;
    
    if (Object.keys(where).length === 0) {
      throw new Error('WHERE clause required for delete');
    }
    
    // Build DELETE query
    const whereColumns = Object.keys(where);
    
    let sql = `DELETE FROM "${table}" WHERE `;
    sql += whereColumns.map((col, i) => `"${col}" = $${i + 1}`).join(' AND ');
    
    const params = whereColumns.map(col => where[col]);
    
    logger.debug('Executing delete', { sql, params: params.length });
    
    try {
      const result = await prisma.$executeRawUnsafe(sql, ...params);
      return result;
    } catch (error: any) {
      logger.error('Delete failed', {
        connectionId,
        table,
        error: error.message,
      });
      throw new Error(`Delete failed: ${error.message}`);
    }
  }
  
  /**
   * Execute raw SQL
   * 
   * @param connectionId - Connection identifier
   * @param sql - SQL query
   * @param params - Query parameters
   * @returns Query results
   */
  async rawQuery(
    connectionId: string,
    sql: string,
    params: any[] = []
  ): Promise<any> {
    const prisma = this.getClient(connectionId);
    
    logger.debug('Executing raw query', { sql, params: params.length });
    
    try {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return await prisma.$queryRawUnsafe(sql, ...params);
      } else {
        return await prisma.$executeRawUnsafe(sql, ...params);
      }
    } catch (error: any) {
      logger.error('Raw query failed', {
        connectionId,
        error: error.message,
      });
      throw new Error(`Raw query failed: ${error.message}`);
    }
  }
  
  /**
   * Disconnect from database
   * 
   * @param connectionId - Connection identifier
   */
  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connectionPool.get<PrismaClient>(connectionId);
    
    if (!connection) {
      logger.warn('Connection not found for disconnect', { connectionId });
      return;
    }
    
    try {
      await connection.client.$disconnect();
      
      connection.metadata.connected = false;
      this.connectionPool.remove(connectionId);
      
      logger.info('Prisma client disconnected', { connectionId });
    } catch (error: any) {
      logger.error('Disconnect failed', {
        connectionId,
        error: error.message,
      });
      throw new Error(`Disconnect failed: ${error.message}`);
    }
  }
}

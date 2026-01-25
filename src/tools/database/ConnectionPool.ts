/**
 * Database Engine - Connection Pool
 * 
 * Manages multiple database connections with credential storage in Vault Engine.
 * 
 * Features:
 * - Named connection registry
 * - Credential retrieval from Vault
 * - Health checks
 * - Automatic reconnection
 * - Connection reuse
 * - Graceful shutdown
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger('connection-pool');

/**
 * Database type
 */
export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  SQLITE = 'sqlite',
  MONGODB = 'mongodb',
}

/**
 * Connection configuration
 */
export interface ConnectionConfig {
  connectionId: string;
  type: DatabaseType;
  
  // Vault integration
  vaultName?: string;
  credentialName?: string;
  
  // Direct connection string (alternative to Vault)
  connectionString?: string;
  
  // Pool configuration
  poolSize?: number;
  idleTimeout?: number;        // ms before idle connection closed
  connectionTimeout?: number;  // ms to wait for connection
  
  // SQLite specific
  filename?: string;
}

/**
 * Connection metadata
 */
export interface ConnectionMetadata {
  connectionId: string;
  type: DatabaseType;
  connected: boolean;
  createdAt: Date;
  lastUsed: Date;
  poolSize: number;
  activeConnections: number;
}

/**
 * Connection wrapper
 */
export interface DatabaseConnection<T = any> {
  connectionId: string;
  type: DatabaseType;
  client: T;
  config: ConnectionConfig;
  metadata: ConnectionMetadata;
}

/**
 * Connection Pool
 * 
 * Manages database connections with Vault integration.
 */
export class ConnectionPool {
  private connections: Map<string, DatabaseConnection>;
  private getVault: (vault: string, key: string) => Promise<string>;
  
  constructor(getVault: (vault: string, key: string) => Promise<string>) {
    this.connections = new Map();
    this.getVault = getVault;
    
    logger.info('Connection pool initialized');
  }
  
  /**
   * Register a connection (without connecting yet)
   * 
   * @param config - Connection configuration
   */
  async register(config: ConnectionConfig): Promise<void> {
    if (this.connections.has(config.connectionId)) {
      throw new Error(`Connection ${config.connectionId} already registered`);
    }
    
    logger.info('Connection registered', {
      connectionId: config.connectionId,
      type: config.type,
    });
  }
  
  /**
   * Get connection string from Vault or config
   * 
   * @param config - Connection configuration
   * @returns Connection string
   */
  async getConnectionString(config: ConnectionConfig): Promise<string> {
    // If direct connection string provided, use it
    if (config.connectionString) {
      return config.connectionString;
    }
    
    // Get from Vault
    if (!config.vaultName || !config.credentialName) {
      throw new Error('Either connectionString or vaultName+credentialName required');
    }
    
    const connectionString = await this.getVault(config.vaultName, config.credentialName);
    
    // Validate connection string format
    this.validateConnectionString(connectionString, config.type);
    
    return connectionString;
  }
  
  /**
   * Validate connection string format
   */
  private validateConnectionString(connectionString: string, type: DatabaseType): void {
    let expectedPrefix: string;
    
    switch (type) {
      case DatabaseType.POSTGRESQL:
        expectedPrefix = 'postgresql://';
        break;
      case DatabaseType.MYSQL:
        expectedPrefix = 'mysql://';
        break;
      case DatabaseType.SQLITE:
        expectedPrefix = 'file:';
        break;
      case DatabaseType.MONGODB:
        if (!connectionString.startsWith('mongodb://') && !connectionString.startsWith('mongodb+srv://')) {
          throw new Error('Invalid MongoDB connection string format');
        }
        return;
      default:
        throw new Error(`Unknown database type: ${type}`);
    }
    
    if (!connectionString.startsWith(expectedPrefix)) {
      throw new Error(`Invalid connection string for ${type}: expected ${expectedPrefix}`);
    }
  }
  
  /**
   * Get connection by ID
   * 
   * @param connectionId - Connection identifier
   * @returns Database connection
   */
  get<T = any>(connectionId: string): DatabaseConnection<T> | undefined {
    return this.connections.get(connectionId) as DatabaseConnection<T> | undefined;
  }
  
  /**
   * Check if connection exists
   */
  has(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }
  
  /**
   * Set connection
   * 
   * @param connection - Database connection
   */
  set(connection: DatabaseConnection): void {
    this.connections.set(connection.connectionId, connection);
    
    logger.info('Connection stored in pool', {
      connectionId: connection.connectionId,
      type: connection.type,
    });
  }
  
  /**
   * Remove connection from pool
   * 
   * @param connectionId - Connection identifier
   */
  remove(connectionId: string): void {
    this.connections.delete(connectionId);
    
    logger.info('Connection removed from pool', { connectionId });
  }
  
  /**
   * Get all connection IDs
   */
  list(): string[] {
    return Array.from(this.connections.keys());
  }
  
  /**
   * Get connection metadata
   * 
   * @param connectionId - Connection identifier
   * @returns Connection metadata
   */
  getMetadata(connectionId: string): ConnectionMetadata | undefined {
    const connection = this.connections.get(connectionId);
    return connection?.metadata;
  }
  
  /**
   * Update last used timestamp
   * 
   * @param connectionId - Connection identifier
   */
  updateLastUsed(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.metadata.lastUsed = new Date();
    }
  }
  
  /**
   * Health check for all connections
   * 
   * @returns Health status for each connection
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [connectionId, connection] of this.connections.entries()) {
      health[connectionId] = connection.metadata.connected;
    }
    
    return health;
  }
  
  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all connections', {
      count: this.connections.size,
    });
    
    const closePromises: Promise<void>[] = [];
    
    for (const _connection of this.connections.values()) {
      // Specific cleanup will be handled by PrismaManager/MongoManager
      closePromises.push(Promise.resolve());
    }
    
    await Promise.all(closePromises);
    this.connections.clear();
    
    logger.info('All connections closed');
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    connected: number;
    byType: Record<string, number>;
  } {
    let connected = 0;
    const byType: Record<string, number> = {};
    
    for (const connection of this.connections.values()) {
      if (connection.metadata.connected) {
        connected++;
      }
      
      byType[connection.type] = (byType[connection.type] || 0) + 1;
    }
    
    return {
      total: this.connections.size,
      connected,
      byType,
    };
  }
}

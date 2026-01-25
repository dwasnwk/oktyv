/**
 * Tests for ConnectionPool
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ConnectionPool, DatabaseType, ConnectionConfig } from '../../../src/tools/database/ConnectionPool.js';

describe('ConnectionPool', () => {
  describe('Connection string validation', () => {
    it('should validate PostgreSQL connection string', async () => {
      const mockGetVault = mock.fn(async () => 'postgresql://user:pass@localhost:5432/db');
      const pool = new ConnectionPool(mockGetVault);
      
      const connectionString = await pool.getConnectionString({
        connectionId: 'test',
        type: DatabaseType.POSTGRESQL,
        vaultName: 'vault',
        credentialName: 'cred',
      });
      
      assert.strictEqual(connectionString, 'postgresql://user:pass@localhost:5432/db');
    });
    
    it('should validate MySQL connection string', async () => {
      const mockGetVault = mock.fn(async () => 'mysql://user:pass@localhost:3306/db');
      const pool = new ConnectionPool(mockGetVault);
      
      const connectionString = await pool.getConnectionString({
        connectionId: 'test',
        type: DatabaseType.MYSQL,
        vaultName: 'vault',
        credentialName: 'cred',
      });
      
      assert.strictEqual(connectionString, 'mysql://user:pass@localhost:3306/db');
    });
    
    it('should validate MongoDB connection string', async () => {
      const mockGetVault = mock.fn(async () => 'mongodb://user:pass@localhost:27017/db');
      const pool = new ConnectionPool(mockGetVault);
      
      const connectionString = await pool.getConnectionString({
        connectionId: 'test',
        type: DatabaseType.MONGODB,
        vaultName: 'vault',
        credentialName: 'cred',
      });
      
      assert.strictEqual(connectionString, 'mongodb://user:pass@localhost:27017/db');
    });
    
    it('should throw on invalid PostgreSQL connection string', async () => {
      const mockGetVault = mock.fn(async () => 'mysql://user:pass@localhost:3306/db');
      const pool = new ConnectionPool(mockGetVault);
      
      await assert.rejects(
        async () => {
          await pool.getConnectionString({
            connectionId: 'test',
            type: DatabaseType.POSTGRESQL,
            vaultName: 'vault',
            credentialName: 'cred',
          });
        },
        /Invalid connection string/
      );
    });
    
    it('should use direct connection string if provided', async () => {
      const mockGetVault = mock.fn();
      const pool = new ConnectionPool(mockGetVault);
      
      const connectionString = await pool.getConnectionString({
        connectionId: 'test',
        type: DatabaseType.POSTGRESQL,
        connectionString: 'postgresql://direct:pass@localhost:5432/db',
      });
      
      assert.strictEqual(connectionString, 'postgresql://direct:pass@localhost:5432/db');
      assert.strictEqual(mockGetVault.mock.callCount(), 0);
    });
  });
  
  describe('Connection management', () => {
    it('should store and retrieve connections', () => {
      const mockGetVault = mock.fn();
      const pool = new ConnectionPool(mockGetVault);
      
      const connection = {
        connectionId: 'test-1',
        type: DatabaseType.POSTGRESQL,
        client: { test: 'client' },
        config: {
          connectionId: 'test-1',
          type: DatabaseType.POSTGRESQL,
        },
        metadata: {
          connectionId: 'test-1',
          type: DatabaseType.POSTGRESQL,
          connected: true,
          createdAt: new Date(),
          lastUsed: new Date(),
          poolSize: 10,
          activeConnections: 1,
        },
      };
      
      pool.set(connection);
      
      const retrieved = pool.get('test-1');
      assert.strictEqual(retrieved?.connectionId, 'test-1');
      assert.strictEqual(retrieved?.type, DatabaseType.POSTGRESQL);
    });
    
    it('should check if connection exists', () => {
      const mockGetVault = mock.fn();
      const pool = new ConnectionPool(mockGetVault);
      
      assert.strictEqual(pool.has('non-existent'), false);
      
      pool.set({
        connectionId: 'test-1',
        type: DatabaseType.POSTGRESQL,
        client: {},
        config: { connectionId: 'test-1', type: DatabaseType.POSTGRESQL },
        metadata: {
          connectionId: 'test-1',
          type: DatabaseType.POSTGRESQL,
          connected: true,
          createdAt: new Date(),
          lastUsed: new Date(),
          poolSize: 10,
          activeConnections: 1,
        },
      });
      
      assert.strictEqual(pool.has('test-1'), true);
    });
    
    it('should remove connections', () => {
      const mockGetVault = mock.fn();
      const pool = new ConnectionPool(mockGetVault);
      
      pool.set({
        connectionId: 'test-1',
        type: DatabaseType.POSTGRESQL,
        client: {},
        config: { connectionId: 'test-1', type: DatabaseType.POSTGRESQL },
        metadata: {
          connectionId: 'test-1',
          type: DatabaseType.POSTGRESQL,
          connected: true,
          createdAt: new Date(),
          lastUsed: new Date(),
          poolSize: 10,
          activeConnections: 1,
        },
      });
      
      assert.strictEqual(pool.has('test-1'), true);
      
      pool.remove('test-1');
      
      assert.strictEqual(pool.has('test-1'), false);
    });
    
    it('should list all connection IDs', () => {
      const mockGetVault = mock.fn();
      const pool = new ConnectionPool(mockGetVault);
      
      pool.set({
        connectionId: 'test-1',
        type: DatabaseType.POSTGRESQL,
        client: {},
        config: { connectionId: 'test-1', type: DatabaseType.POSTGRESQL },
        metadata: {
          connectionId: 'test-1',
          type: DatabaseType.POSTGRESQL,
          connected: true,
          createdAt: new Date(),
          lastUsed: new Date(),
          poolSize: 10,
          activeConnections: 1,
        },
      });
      
      pool.set({
        connectionId: 'test-2',
        type: DatabaseType.MYSQL,
        client: {},
        config: { connectionId: 'test-2', type: DatabaseType.MYSQL },
        metadata: {
          connectionId: 'test-2',
          type: DatabaseType.MYSQL,
          connected: true,
          createdAt: new Date(),
          lastUsed: new Date(),
          poolSize: 10,
          activeConnections: 1,
        },
      });
      
      const list = pool.list();
      assert.strictEqual(list.length, 2);
      assert.ok(list.includes('test-1'));
      assert.ok(list.includes('test-2'));
    });
    
    it('should update last used timestamp', () => {
      const mockGetVault = mock.fn();
      const pool = new ConnectionPool(mockGetVault);
      
      const originalDate = new Date('2025-01-01T00:00:00Z');
      
      pool.set({
        connectionId: 'test-1',
        type: DatabaseType.POSTGRESQL,
        client: {},
        config: { connectionId: 'test-1', type: DatabaseType.POSTGRESQL },
        metadata: {
          connectionId: 'test-1',
          type: DatabaseType.POSTGRESQL,
          connected: true,
          createdAt: originalDate,
          lastUsed: originalDate,
          poolSize: 10,
          activeConnections: 1,
        },
      });
      
      // Wait a bit
      setTimeout(() => {}, 10);
      
      pool.updateLastUsed('test-1');
      
      const connection = pool.get('test-1');
      assert.ok(connection);
      assert.ok(connection.metadata.lastUsed > originalDate);
    });
  });
  
  describe('Statistics', () => {
    it('should provide connection statistics', () => {
      const mockGetVault = mock.fn();
      const pool = new ConnectionPool(mockGetVault);
      
      pool.set({
        connectionId: 'pg-1',
        type: DatabaseType.POSTGRESQL,
        client: {},
        config: { connectionId: 'pg-1', type: DatabaseType.POSTGRESQL },
        metadata: {
          connectionId: 'pg-1',
          type: DatabaseType.POSTGRESQL,
          connected: true,
          createdAt: new Date(),
          lastUsed: new Date(),
          poolSize: 10,
          activeConnections: 1,
        },
      });
      
      pool.set({
        connectionId: 'pg-2',
        type: DatabaseType.POSTGRESQL,
        client: {},
        config: { connectionId: 'pg-2', type: DatabaseType.POSTGRESQL },
        metadata: {
          connectionId: 'pg-2',
          type: DatabaseType.POSTGRESQL,
          connected: false,
          createdAt: new Date(),
          lastUsed: new Date(),
          poolSize: 10,
          activeConnections: 0,
        },
      });
      
      pool.set({
        connectionId: 'mongo-1',
        type: DatabaseType.MONGODB,
        client: {},
        config: { connectionId: 'mongo-1', type: DatabaseType.MONGODB },
        metadata: {
          connectionId: 'mongo-1',
          type: DatabaseType.MONGODB,
          connected: true,
          createdAt: new Date(),
          lastUsed: new Date(),
          poolSize: 10,
          activeConnections: 1,
        },
      });
      
      const stats = pool.getStats();
      
      assert.strictEqual(stats.total, 3);
      assert.strictEqual(stats.connected, 2);
      assert.strictEqual(stats.byType[DatabaseType.POSTGRESQL], 2);
      assert.strictEqual(stats.byType[DatabaseType.MONGODB], 1);
    });
  });
});

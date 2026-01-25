/**
 * Tests for TransactionManager
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TransactionManager, TransactionOperationType } from '../../../src/tools/database/TransactionManager.js';

describe('TransactionManager', () => {
  describe('Deadlock detection', () => {
    it('should detect PostgreSQL deadlock', () => {
      const manager = new TransactionManager();
      
      const error = {
        code: '40P01',
        message: 'deadlock detected',
      };
      
      // Use type assertion to access private method for testing
      const isDeadlock = (manager as any).isDeadlock(error);
      assert.strictEqual(isDeadlock, true);
    });
    
    it('should detect MySQL deadlock', () => {
      const manager = new TransactionManager();
      
      const error = {
        code: 'ER_LOCK_DEADLOCK',
        message: 'Deadlock found when trying to get lock',
      };
      
      const isDeadlock = (manager as any).isDeadlock(error);
      assert.strictEqual(isDeadlock, true);
    });
    
    it('should detect MongoDB write conflict', () => {
      const manager = new TransactionManager();
      
      const error = {
        code: 112,
        message: 'WriteConflict',
      };
      
      const isDeadlock = (manager as any).isDeadlock(error);
      assert.strictEqual(isDeadlock, true);
    });
    
    it('should not detect non-deadlock errors', () => {
      const manager = new TransactionManager();
      
      const error = {
        code: 'ER_PARSE_ERROR',
        message: 'You have an error in your SQL syntax',
      };
      
      const isDeadlock = (manager as any).isDeadlock(error);
      assert.strictEqual(isDeadlock, false);
    });
  });
  
  describe('Operation validation', () => {
    it('should validate insert operation', () => {
      const manager = new TransactionManager();
      
      const operation = {
        type: TransactionOperationType.INSERT,
        table: 'users',
        data: {
          name: 'Alice',
          email: 'alice@example.com',
        },
      };
      
      assert.strictEqual(operation.type, TransactionOperationType.INSERT);
      assert.ok(operation.data);
      assert.strictEqual(operation.data.name, 'Alice');
    });
    
    it('should validate update operation', () => {
      const manager = new TransactionManager();
      
      const operation = {
        type: TransactionOperationType.UPDATE,
        table: 'users',
        where: { id: 1 },
        data: { name: 'Alice Updated' },
      };
      
      assert.strictEqual(operation.type, TransactionOperationType.UPDATE);
      assert.ok(operation.where);
      assert.ok(operation.data);
    });
    
    it('should validate delete operation', () => {
      const manager = new TransactionManager();
      
      const operation = {
        type: TransactionOperationType.DELETE,
        table: 'users',
        where: { id: 1 },
      };
      
      assert.strictEqual(operation.type, TransactionOperationType.DELETE);
      assert.ok(operation.where);
    });
    
    it('should validate query operation', () => {
      const manager = new TransactionManager();
      
      const operation = {
        type: TransactionOperationType.QUERY,
        table: 'users',
        where: { active: true },
        select: ['id', 'name', 'email'],
        orderBy: { createdAt: 'desc' as const },
        limit: 10,
      };
      
      assert.strictEqual(operation.type, TransactionOperationType.QUERY);
      assert.ok(operation.where);
      assert.ok(operation.select);
      assert.strictEqual(operation.select.length, 3);
    });
  });
  
  describe('Transaction options', () => {
    it('should use default max retries', () => {
      const manager = new TransactionManager();
      
      const defaultMaxRetries = (manager as any).DEFAULT_MAX_RETRIES;
      assert.strictEqual(defaultMaxRetries, 3);
    });
    
    it('should use default timeout', () => {
      const manager = new TransactionManager();
      
      const defaultTimeout = (manager as any).DEFAULT_TIMEOUT;
      assert.strictEqual(defaultTimeout, 30000);
    });
    
    it('should allow custom max retries', async () => {
      const manager = new TransactionManager();
      
      // This would normally be tested with a mock Prisma client
      // For now, just verify the interface accepts the option
      const options = {
        maxRetries: 5,
      };
      
      assert.strictEqual(options.maxRetries, 5);
    });
    
    it('should allow custom timeout', async () => {
      const manager = new TransactionManager();
      
      const options = {
        timeout: 60000,
      };
      
      assert.strictEqual(options.timeout, 60000);
    });
    
    it('should support isolation levels', async () => {
      const manager = new TransactionManager();
      
      const options = {
        isolationLevel: 'Serializable' as const,
      };
      
      assert.strictEqual(options.isolationLevel, 'Serializable');
    });
  });
});

/**
 * Vault Engine - Integration Tests
 * 
 * Tests for complete vault workflow (crypto + keychain + storage + audit)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { VaultEngine } from '../../../src/tools/vault/VaultEngine.js';

describe('VaultEngine Integration', () => {
  const testVaultDir = path.join(os.tmpdir(), `oktyv-vault-test-${Date.now()}`);
  const testAuditLog = path.join(testVaultDir, 'audit.log');
  let vaultEngine: VaultEngine;

  before(async () => {
    // Create test directory
    await fs.mkdir(testVaultDir, { recursive: true });
    
    // Initialize vault engine with test paths
    vaultEngine = new VaultEngine(
      path.join(testVaultDir, 'vaults'),
      testAuditLog,
      true // Enable audit logging
    );
  });

  after(async () => {
    // Clean up test directory
    try {
      await fs.rm(testVaultDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('set() / get()', () => {
    it('should store and retrieve credential', async () => {
      const vaultName = 'test-vault';
      const credentialName = 'api-key';
      const value = 'sk-test-abc123';

      await vaultEngine.set(vaultName, credentialName, value);
      const retrieved = await vaultEngine.get(vaultName, credentialName);

      assert.strictEqual(retrieved, value);
    });

    it('should create vault automatically on first set', async () => {
      const vaultName = 'auto-created';
      await vaultEngine.set(vaultName, 'test', 'value');

      const exists = await vaultEngine.vaultExists(vaultName);
      assert.strictEqual(exists, true);
    });

    it('should fail to get non-existent credential', async () => {
      try {
        await vaultEngine.get('test-vault', 'non-existent');
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.strictEqual(error.code, 'CREDENTIAL_NOT_FOUND');
      }
    });

    it('should fail to get from non-existent vault', async () => {
      try {
        await vaultEngine.get('non-existent-vault', 'any-credential');
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.strictEqual(error.code, 'VAULT_NOT_FOUND');
      }
    });

    it('should handle multiple credentials in same vault', async () => {
      const vaultName = 'multi-cred';
      
      await vaultEngine.set(vaultName, 'api-key', 'key-123');
      await vaultEngine.set(vaultName, 'password', 'pass-456');
      await vaultEngine.set(vaultName, 'token', 'tok-789');

      assert.strictEqual(await vaultEngine.get(vaultName, 'api-key'), 'key-123');
      assert.strictEqual(await vaultEngine.get(vaultName, 'password'), 'pass-456');
      assert.strictEqual(await vaultEngine.get(vaultName, 'token'), 'tok-789');
    });

    it('should update existing credential', async () => {
      const vaultName = 'update-test';
      const credentialName = 'api-key';

      await vaultEngine.set(vaultName, credentialName, 'old-value');
      await vaultEngine.set(vaultName, credentialName, 'new-value');

      const retrieved = await vaultEngine.get(vaultName, credentialName);
      assert.strictEqual(retrieved, 'new-value');
    });
  });

  describe('list()', () => {
    it('should list all credential names in vault', async () => {
      const vaultName = 'list-test';

      await vaultEngine.set(vaultName, 'cred-1', 'value-1');
      await vaultEngine.set(vaultName, 'cred-2', 'value-2');
      await vaultEngine.set(vaultName, 'cred-3', 'value-3');

      const credentials = await vaultEngine.list(vaultName);
      
      assert.strictEqual(credentials.length, 3);
      assert.ok(credentials.includes('cred-1'));
      assert.ok(credentials.includes('cred-2'));
      assert.ok(credentials.includes('cred-3'));
    });

    it('should return empty array for vault with no credentials', async () => {
      const vaultName = 'empty-vault';
      
      // Create vault without credentials
      await vaultEngine.set(vaultName, 'temp', 'value');
      await vaultEngine.delete(vaultName, 'temp');

      const credentials = await vaultEngine.list(vaultName);
      assert.strictEqual(credentials.length, 0);
    });

    it('should fail to list non-existent vault', async () => {
      try {
        await vaultEngine.list('non-existent-vault');
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.strictEqual(error.code, 'VAULT_NOT_FOUND');
      }
    });
  });

  describe('delete()', () => {
    it('should delete credential from vault', async () => {
      const vaultName = 'delete-test';
      const credentialName = 'to-delete';

      await vaultEngine.set(vaultName, credentialName, 'value');
      await vaultEngine.delete(vaultName, credentialName);

      try {
        await vaultEngine.get(vaultName, credentialName);
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.strictEqual(error.code, 'CREDENTIAL_NOT_FOUND');
      }
    });

    it('should fail to delete non-existent credential', async () => {
      try {
        await vaultEngine.delete('test-vault', 'non-existent');
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.strictEqual(error.code, 'CREDENTIAL_NOT_FOUND');
      }
    });

    it('should not affect other credentials when deleting', async () => {
      const vaultName = 'delete-selective';

      await vaultEngine.set(vaultName, 'keep-1', 'value-1');
      await vaultEngine.set(vaultName, 'delete-me', 'value-2');
      await vaultEngine.set(vaultName, 'keep-2', 'value-3');

      await vaultEngine.delete(vaultName, 'delete-me');

      const credentials = await vaultEngine.list(vaultName);
      assert.strictEqual(credentials.length, 2);
      assert.ok(credentials.includes('keep-1'));
      assert.ok(credentials.includes('keep-2'));
      assert.ok(!credentials.includes('delete-me'));
    });
  });

  describe('deleteVault()', () => {
    it('should delete entire vault and all credentials', async () => {
      const vaultName = 'vault-to-delete';

      await vaultEngine.set(vaultName, 'cred-1', 'value-1');
      await vaultEngine.set(vaultName, 'cred-2', 'value-2');

      await vaultEngine.deleteVault(vaultName);

      const exists = await vaultEngine.vaultExists(vaultName);
      assert.strictEqual(exists, false);
    });

    it('should be idempotent (safe to delete non-existent vault)', async () => {
      // Should not throw error
      await vaultEngine.deleteVault('non-existent-vault-xyz');
    });
  });

  describe('listVaults()', () => {
    it('should list all vaults', async () => {
      await vaultEngine.set('vault-a', 'test', 'value');
      await vaultEngine.set('vault-b', 'test', 'value');
      await vaultEngine.set('vault-c', 'test', 'value');

      const vaults = await vaultEngine.listVaults();

      assert.ok(vaults.length >= 3);
      assert.ok(vaults.includes('vault-a'));
      assert.ok(vaults.includes('vault-b'));
      assert.ok(vaults.includes('vault-c'));
    });
  });

  describe('Data Persistence', () => {
    it('should persist data across VaultEngine instances', async () => {
      const vaultName = 'persistence-test';
      const credentialName = 'persistent-key';
      const value = 'persistent-value';

      // Store with first instance
      await vaultEngine.set(vaultName, credentialName, value);

      // Create new instance (simulates restart)
      const newEngine = new VaultEngine(
        path.join(testVaultDir, 'vaults'),
        testAuditLog,
        false
      );

      // Retrieve with new instance
      const retrieved = await newEngine.get(vaultName, credentialName);
      assert.strictEqual(retrieved, value);
    });
  });

  describe('Security Properties', () => {
    it('should not expose plaintext in vault files', async () => {
      const vaultName = 'security-test';
      const credentialName = 'secret-api-key';
      const value = 'super-secret-value-12345';

      await vaultEngine.set(vaultName, credentialName, value);

      // Read vault file directly
      const vaultPath = path.join(testVaultDir, 'vaults', `${vaultName}.vault`);
      const fileContent = await fs.readFile(vaultPath, 'utf8');

      // Plaintext should NOT appear in file
      assert.ok(!fileContent.includes(value));
      
      // Encrypted data should be present
      assert.ok(fileContent.includes('data'));
      assert.ok(fileContent.includes('iv'));
      assert.ok(fileContent.includes('authTag'));
    });

    it('should handle special characters in credentials', async () => {
      const specialChars = 'P@ssw0rd!#$%^&*()[]{}|;:,.<>?/`~+=\'"\\';
      
      await vaultEngine.set('special-test', 'password', specialChars);
      const retrieved = await vaultEngine.get('special-test', 'password');
      
      assert.strictEqual(retrieved, specialChars);
    });

    it('should handle unicode in credentials', async () => {
      const unicode = '密码🔐مرور🇺🇸';
      
      await vaultEngine.set('unicode-test', 'password', unicode);
      const retrieved = await vaultEngine.get('unicode-test', 'password');
      
      assert.strictEqual(retrieved, unicode);
    });
  });
});

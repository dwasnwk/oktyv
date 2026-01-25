/**
 * Vault Engine - Crypto Tests
 * 
 * Tests for AES-256-GCM encryption/decryption
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import * as crypto from '../../../src/tools/vault/crypto.js';

describe('Vault Crypto', () => {
  describe('generateMasterKey()', () => {
    it('should generate 32-byte key', () => {
      const key = crypto.generateMasterKey();
      assert.strictEqual(key.length, 32);
      assert.ok(Buffer.isBuffer(key));
    });

    it('should generate unique keys', () => {
      const key1 = crypto.generateMasterKey();
      const key2 = crypto.generateMasterKey();
      assert.notDeepStrictEqual(key1, key2);
    });
  });

  describe('encrypt() / decrypt()', () => {
    let masterKey: Buffer;

    before(() => {
      masterKey = crypto.generateMasterKey();
    });

    it('should encrypt and decrypt plaintext', () => {
      const plaintext = 'my-secret-api-key-12345';
      const encrypted = crypto.encrypt(plaintext, masterKey);
      
      assert.ok(encrypted.data);
      assert.ok(encrypted.iv);
      assert.ok(encrypted.authTag);
      
      const decrypted = crypto.decrypt(encrypted, masterKey);
      assert.strictEqual(decrypted, plaintext);
    });

    it('should produce different ciphertext for same plaintext (non-deterministic)', () => {
      const plaintext = 'test-secret';
      const encrypted1 = crypto.encrypt(plaintext, masterKey);
      const encrypted2 = crypto.encrypt(plaintext, masterKey);
      
      // Different IVs = different ciphertext
      assert.notStrictEqual(encrypted1.data, encrypted2.data);
      assert.notStrictEqual(encrypted1.iv, encrypted2.iv);
      
      // Both decrypt to same plaintext
      assert.strictEqual(crypto.decrypt(encrypted1, masterKey), plaintext);
      assert.strictEqual(crypto.decrypt(encrypted2, masterKey), plaintext);
    });

    it('should fail decryption with wrong key', () => {
      const plaintext = 'secret-data';
      const encrypted = crypto.encrypt(plaintext, masterKey);
      
      const wrongKey = crypto.generateMasterKey();
      try {
        crypto.decrypt(encrypted, wrongKey);
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.ok(error.code === 'TAMPERED_DATA' || error.code === 'DECRYPTION_FAILED');
      }
    });

    it('should detect tampered data (authentication)', () => {
      const plaintext = 'important-secret';
      const encrypted = crypto.encrypt(plaintext, masterKey);
      
      // Tamper with encrypted data (flip a bit in the base64 data)
      const dataBuffer = Buffer.from(encrypted.data, 'base64');
      dataBuffer[0] ^= 0x01; // Flip least significant bit
      const tampered = {
        ...encrypted,
        data: dataBuffer.toString('base64'),
      };
      
      try {
        crypto.decrypt(tampered, masterKey);
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.strictEqual(error.code, 'TAMPERED_DATA');
      }
    });

    it('should reject invalid key length', () => {
      const shortKey = Buffer.from('short');
      const plaintext = 'test';
      
      try {
        crypto.encrypt(plaintext, shortKey);
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.strictEqual(error.code, 'INVALID_KEY_LENGTH');
      }
      
      const encrypted = crypto.encrypt(plaintext, masterKey);
      try {
        crypto.decrypt(encrypted, shortKey);
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.strictEqual(error.code, 'INVALID_KEY_LENGTH');
      }
    });

    it('should handle empty plaintext', () => {
      const plaintext = '';
      const encrypted = crypto.encrypt(plaintext, masterKey);
      const decrypted = crypto.decrypt(encrypted, masterKey);
      assert.strictEqual(decrypted, plaintext);
    });

    it('should handle long plaintext (10KB)', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = crypto.encrypt(plaintext, masterKey);
      const decrypted = crypto.decrypt(encrypted, masterKey);
      assert.strictEqual(decrypted, plaintext);
    });
  });

  describe('isValidMasterKey()', () => {
    it('should validate correct key', () => {
      const key = crypto.generateMasterKey();
      assert.strictEqual(crypto.isValidMasterKey(key), true);
    });

    it('should reject invalid keys', () => {
      assert.strictEqual(crypto.isValidMasterKey(Buffer.from('short')), false);
      assert.strictEqual(crypto.isValidMasterKey(Buffer.alloc(16)), false);
      assert.strictEqual(crypto.isValidMasterKey(Buffer.alloc(64)), false);
    });
  });
});

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { HashManager } from '../../../src/tools/file/HashManager.js';

const TEST_DIR = path.join(process.cwd(), 'test-tmp-hash');

describe('HashManager', () => {
  let hashManager: HashManager;
  
  before(async () => {
    hashManager = new HashManager();
    // Create test directory
    await fs.mkdir(TEST_DIR, { recursive: true });
  });
  
  after(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  
  describe('hash()', () => {
    it('should calculate MD5 hash', async () => {
      const filePath = path.join(TEST_DIR, 'md5-test.txt');
      await fs.writeFile(filePath, 'Hello, World!');
      
      const result = await hashManager.hash(filePath, 'md5');
      
      assert.strictEqual(result.algorithm, 'md5');
      assert.strictEqual(result.filePath, filePath);
      // Known MD5 of "Hello, World!"
      assert.strictEqual(result.hash, '65a8e27d8879283831b664bd8b7f0ad4');
    });
    
    it('should calculate SHA256 hash', async () => {
      const filePath = path.join(TEST_DIR, 'sha256-test.txt');
      await fs.writeFile(filePath, 'Hello, World!');
      
      const result = await hashManager.hash(filePath, 'sha256');
      
      assert.strictEqual(result.algorithm, 'sha256');
      // Known SHA256 of "Hello, World!"
      assert.strictEqual(
        result.hash,
        'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f'
      );
    });
    
    it('should calculate SHA512 hash', async () => {
      const filePath = path.join(TEST_DIR, 'sha512-test.txt');
      await fs.writeFile(filePath, 'Test');
      
      const result = await hashManager.hash(filePath, 'sha512');
      
      assert.strictEqual(result.algorithm, 'sha512');
      assert.strictEqual(result.hash.length, 128); // SHA512 produces 64-byte hash = 128 hex chars
    });
    
    it('should handle large files', async () => {
      const filePath = path.join(TEST_DIR, 'large-file.txt');
      // Create 1MB file
      const data = 'x'.repeat(1024 * 1024);
      await fs.writeFile(filePath, data);
      
      const result = await hashManager.hash(filePath, 'sha256');
      
      assert.ok(result.hash);
      assert.strictEqual(result.hash.length, 64); // SHA256 = 32 bytes = 64 hex chars
    });
  });
  
  describe('hashMultiple()', () => {
    it('should hash multiple files', async () => {
      const file1 = path.join(TEST_DIR, 'multi1.txt');
      const file2 = path.join(TEST_DIR, 'multi2.txt');
      const file3 = path.join(TEST_DIR, 'multi3.txt');
      
      await fs.writeFile(file1, 'File 1');
      await fs.writeFile(file2, 'File 2');
      await fs.writeFile(file3, 'File 3');
      
      const results = await hashManager.hashMultiple([file1, file2, file3]);
      
      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].filePath, file1);
      assert.strictEqual(results[1].filePath, file2);
      assert.strictEqual(results[2].filePath, file3);
      
      // All hashes should be different
      const hashes = results.map(r => r.hash);
      assert.strictEqual(new Set(hashes).size, 3);
    });
  });
  
  describe('compareFiles()', () => {
    it('should detect identical files', async () => {
      const file1 = path.join(TEST_DIR, 'compare1.txt');
      const file2 = path.join(TEST_DIR, 'compare2.txt');
      
      await fs.writeFile(file1, 'Same content');
      await fs.writeFile(file2, 'Same content');
      
      const result = await hashManager.compareFiles(file1, file2);
      
      assert.strictEqual(result.identical, true);
      assert.ok(result.hash);
    });
    
    it('should detect different files', async () => {
      const file1 = path.join(TEST_DIR, 'diff1.txt');
      const file2 = path.join(TEST_DIR, 'diff2.txt');
      
      await fs.writeFile(file1, 'Content 1');
      await fs.writeFile(file2, 'Content 2');
      
      const result = await hashManager.compareFiles(file1, file2);
      
      assert.strictEqual(result.identical, false);
      assert.strictEqual(result.hash, undefined);
    });
  });
  
  describe('findDuplicates()', () => {
    it('should find duplicate files', async () => {
      const file1 = path.join(TEST_DIR, 'dup1.txt');
      const file2 = path.join(TEST_DIR, 'dup2.txt');
      const file3 = path.join(TEST_DIR, 'dup3.txt');
      const file4 = path.join(TEST_DIR, 'unique.txt');
      
      await fs.writeFile(file1, 'Duplicate');
      await fs.writeFile(file2, 'Duplicate');
      await fs.writeFile(file3, 'Duplicate');
      await fs.writeFile(file4, 'Unique');
      
      const duplicates = await hashManager.findDuplicates([file1, file2, file3, file4]);
      
      assert.strictEqual(duplicates.size, 1); // One group of duplicates
      
      const duplicateGroup = Array.from(duplicates.values())[0];
      assert.strictEqual(duplicateGroup.length, 3); // 3 files are duplicates
      assert.ok(duplicateGroup.includes(file1));
      assert.ok(duplicateGroup.includes(file2));
      assert.ok(duplicateGroup.includes(file3));
    });
    
    it('should return empty map when no duplicates', async () => {
      const file1 = path.join(TEST_DIR, 'unique1.txt');
      const file2 = path.join(TEST_DIR, 'unique2.txt');
      
      await fs.writeFile(file1, 'Content 1');
      await fs.writeFile(file2, 'Content 2');
      
      const duplicates = await hashManager.findDuplicates([file1, file2]);
      
      assert.strictEqual(duplicates.size, 0);
    });
  });
  
  describe('verify()', () => {
    it('should verify correct hash', async () => {
      const filePath = path.join(TEST_DIR, 'verify.txt');
      await fs.writeFile(filePath, 'Hello, World!');
      
      const expectedHash = 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';
      const verified = await hashManager.verify(filePath, expectedHash, 'sha256');
      
      assert.strictEqual(verified, true);
    });
    
    it('should reject incorrect hash', async () => {
      const filePath = path.join(TEST_DIR, 'verify2.txt');
      await fs.writeFile(filePath, 'Hello, World!');
      
      const wrongHash = '0000000000000000000000000000000000000000000000000000000000000000';
      const verified = await hashManager.verify(filePath, wrongHash, 'sha256');
      
      assert.strictEqual(verified, false);
    });
    
    it('should handle uppercase hash', async () => {
      const filePath = path.join(TEST_DIR, 'verify3.txt');
      await fs.writeFile(filePath, 'Hello, World!');
      
      const expectedHash = 'DFFD6021BB2BD5B0AF676290809EC3A53191DD81C7F70A4B28688A362182986F';
      const verified = await hashManager.verify(filePath, expectedHash, 'sha256');
      
      assert.strictEqual(verified, true);
    });
  });
  
  describe('hashString()', () => {
    it('should hash string with MD5', async () => {
      const hash = hashManager.hashString('Hello, World!', 'md5');
      assert.strictEqual(hash, '65a8e27d8879283831b664bd8b7f0ad4');
    });
    
    it('should hash string with SHA256', async () => {
      const hash = hashManager.hashString('Hello, World!', 'sha256');
      assert.strictEqual(
        hash,
        'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f'
      );
    });
  });
});

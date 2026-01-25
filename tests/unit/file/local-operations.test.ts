import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { LocalOperations } from '../../../src/tools/file/LocalOperations.js';

const TEST_DIR = path.join(process.cwd(), 'test-tmp-local-ops');

describe('LocalOperations', () => {
  let localOps: LocalOperations;
  
  before(async () => {
    localOps = new LocalOperations();
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
  
  describe('read() / write()', () => {
    it('should write and read text file', async () => {
      const filePath = path.join(TEST_DIR, 'test.txt');
      const content = 'Hello, World!';
      
      await localOps.write(filePath, content);
      const read = await localOps.read(filePath);
      
      assert.strictEqual(read, content);
    });
    
    it('should write and read binary file', async () => {
      const filePath = path.join(TEST_DIR, 'test.bin');
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      
      await localOps.write(filePath, buffer, { encoding: 'binary' });
      const read = await localOps.read(filePath, { encoding: 'binary' }) as Buffer;
      
      assert.ok(Buffer.isBuffer(read));
      assert.deepEqual(read, buffer);
    });
    
    it('should append to file', async () => {
      const filePath = path.join(TEST_DIR, 'append.txt');
      
      await localOps.write(filePath, 'Line 1\n');
      await localOps.write(filePath, 'Line 2\n', { mode: 'append' });
      
      const content = await localOps.read(filePath);
      assert.strictEqual(content, 'Line 1\nLine 2\n');
    });
    
    it('should read partial file content', async () => {
      const filePath = path.join(TEST_DIR, 'partial.txt');
      const content = '0123456789';
      
      await localOps.write(filePath, content);
      
      // Read bytes 2-5
      const partial = await localOps.read(filePath, { start: 2, end: 5 });
      assert.strictEqual(partial, '234');
    });
  });
  
  describe('copy()', () => {
    it('should copy file', async () => {
      const source = path.join(TEST_DIR, 'source.txt');
      const dest = path.join(TEST_DIR, 'dest.txt');
      
      await localOps.write(source, 'Copy me');
      await localOps.copy(source, dest);
      
      const content = await localOps.read(dest);
      assert.strictEqual(content, 'Copy me');
    });
    
    it('should copy directory recursively', async () => {
      const sourceDir = path.join(TEST_DIR, 'source-dir');
      const destDir = path.join(TEST_DIR, 'dest-dir');
      
      // Create source directory with files
      await fs.mkdir(path.join(sourceDir, 'subdir'), { recursive: true });
      await localOps.write(path.join(sourceDir, 'file1.txt'), 'File 1');
      await localOps.write(path.join(sourceDir, 'subdir', 'file2.txt'), 'File 2');
      
      // Copy
      await localOps.copy(sourceDir, destDir, { recursive: true });
      
      // Verify
      const file1 = await localOps.read(path.join(destDir, 'file1.txt'));
      const file2 = await localOps.read(path.join(destDir, 'subdir', 'file2.txt'));
      assert.strictEqual(file1, 'File 1');
      assert.strictEqual(file2, 'File 2');
    });
    
    it('should fail to overwrite without flag', async () => {
      const source = path.join(TEST_DIR, 'source2.txt');
      const dest = path.join(TEST_DIR, 'dest2.txt');
      
      await localOps.write(source, 'Source');
      await localOps.write(dest, 'Dest');
      
      await assert.rejects(
        () => localOps.copy(source, dest, { overwrite: false }),
        /already exists/
      );
    });
  });
  
  describe('move()', () => {
    it('should move file', async () => {
      const source = path.join(TEST_DIR, 'move-source.txt');
      const dest = path.join(TEST_DIR, 'move-dest.txt');
      
      await localOps.write(source, 'Move me');
      await localOps.move(source, dest);
      
      const exists = await localOps.exists(source);
      const content = await localOps.read(dest);
      
      assert.strictEqual(exists, false);
      assert.strictEqual(content, 'Move me');
    });
  });
  
  describe('delete()', () => {
    it('should delete file', async () => {
      const filePath = path.join(TEST_DIR, 'delete-me.txt');
      
      await localOps.write(filePath, 'Delete me');
      await localOps.delete(filePath);
      
      const exists = await localOps.exists(filePath);
      assert.strictEqual(exists, false);
    });
    
    it('should delete directory recursively', async () => {
      const dirPath = path.join(TEST_DIR, 'delete-dir');
      
      await fs.mkdir(path.join(dirPath, 'subdir'), { recursive: true });
      await localOps.write(path.join(dirPath, 'file.txt'), 'File');
      
      await localOps.delete(dirPath, true);
      
      const exists = await localOps.exists(dirPath);
      assert.strictEqual(exists, false);
    });
  });
  
  describe('list()', () => {
    it('should list directory contents', async () => {
      const dirPath = path.join(TEST_DIR, 'list-dir');
      
      await fs.mkdir(dirPath, { recursive: true });
      await localOps.write(path.join(dirPath, 'file1.txt'), 'File 1');
      await localOps.write(path.join(dirPath, 'file2.txt'), 'File 2');
      await fs.mkdir(path.join(dirPath, 'subdir'));
      
      const files = await localOps.list(dirPath);
      
      assert.strictEqual(files.length, 3);
      assert.ok(files.some(f => f.name === 'file1.txt'));
      assert.ok(files.some(f => f.name === 'file2.txt'));
      assert.ok(files.some(f => f.name === 'subdir' && f.isDirectory));
    });
    
    it('should list recursively', async () => {
      const dirPath = path.join(TEST_DIR, 'list-recursive');
      
      await fs.mkdir(path.join(dirPath, 'subdir'), { recursive: true });
      await localOps.write(path.join(dirPath, 'file1.txt'), 'File 1');
      await localOps.write(path.join(dirPath, 'subdir', 'file2.txt'), 'File 2');
      
      const files = await localOps.list(dirPath, true);
      
      assert.ok(files.length >= 2);
      assert.ok(files.some(f => f.name.includes('file1.txt')));
      assert.ok(files.some(f => f.name.includes('file2.txt')));
    });
    
    it('should filter by pattern', async () => {
      const dirPath = path.join(TEST_DIR, 'list-pattern');
      
      await fs.mkdir(dirPath, { recursive: true });
      await localOps.write(path.join(dirPath, 'file1.txt'), 'File 1');
      await localOps.write(path.join(dirPath, 'file2.md'), 'File 2');
      
      const files = await localOps.list(dirPath, false, '*.txt');
      
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].name, 'file1.txt');
    });
  });
  
  describe('stat()', () => {
    it('should get file statistics', async () => {
      const filePath = path.join(TEST_DIR, 'stat-test.txt');
      const content = 'Test content';
      
      await localOps.write(filePath, content);
      const stats = await localOps.stat(filePath);
      
      assert.strictEqual(stats.isFile, true);
      assert.strictEqual(stats.isDirectory, false);
      assert.strictEqual(stats.size, content.length);
      assert.ok(stats.created instanceof Date);
      assert.ok(stats.modified instanceof Date);
    });
  });
  
  describe('exists()', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(TEST_DIR, 'exists-test.txt');
      
      await localOps.write(filePath, 'Exists');
      const exists = await localOps.exists(filePath);
      
      assert.strictEqual(exists, true);
    });
    
    it('should return false for non-existing file', async () => {
      const filePath = path.join(TEST_DIR, 'does-not-exist.txt');
      const exists = await localOps.exists(filePath);
      
      assert.strictEqual(exists, false);
    });
  });
});

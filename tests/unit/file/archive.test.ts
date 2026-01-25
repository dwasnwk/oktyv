import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { ArchiveManager } from '../../../src/tools/file/ArchiveManager.js';

const TEST_DIR = path.join(process.cwd(), 'test-tmp-archive');

describe('ArchiveManager', () => {
  let archiveManager: ArchiveManager;
  
  before(async () => {
    archiveManager = new ArchiveManager();
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
  
  describe('ZIP archives', () => {
    it('should create ZIP archive', async () => {
      const file1 = path.join(TEST_DIR, 'file1.txt');
      const file2 = path.join(TEST_DIR, 'file2.txt');
      const archive = path.join(TEST_DIR, 'archive.zip');
      
      await fs.writeFile(file1, 'Content 1');
      await fs.writeFile(file2, 'Content 2');
      
      await archiveManager.create({
        format: 'zip',
        sources: [file1, file2],
        destination: archive,
      });
      
      const stats = await fs.stat(archive);
      assert.ok(stats.size > 0);
    });
    
    it('should extract ZIP archive', async () => {
      const file1 = path.join(TEST_DIR, 'zip-extract-file1.txt');
      const file2 = path.join(TEST_DIR, 'zip-extract-file2.txt');
      const archive = path.join(TEST_DIR, 'extract-test.zip');
      const extractDir = path.join(TEST_DIR, 'extracted');
      
      await fs.writeFile(file1, 'Extract 1');
      await fs.writeFile(file2, 'Extract 2');
      
      // Create archive
      await archiveManager.create({
        format: 'zip',
        sources: [file1, file2],
        destination: archive,
      });
      
      // Extract
      await archiveManager.extract({
        archive,
        destination: extractDir,
      });
      
      // Verify extracted files
      const extracted1 = await fs.readFile(
        path.join(extractDir, 'zip-extract-file1.txt'),
        'utf-8'
      );
      const extracted2 = await fs.readFile(
        path.join(extractDir, 'zip-extract-file2.txt'),
        'utf-8'
      );
      
      assert.strictEqual(extracted1, 'Extract 1');
      assert.strictEqual(extracted2, 'Extract 2');
    });
    
    it('should list ZIP contents', async () => {
      const file1 = path.join(TEST_DIR, 'list-file1.txt');
      const file2 = path.join(TEST_DIR, 'list-file2.txt');
      const archive = path.join(TEST_DIR, 'list-test.zip');
      
      await fs.writeFile(file1, 'List 1');
      await fs.writeFile(file2, 'List 2');
      
      await archiveManager.create({
        format: 'zip',
        sources: [file1, file2],
        destination: archive,
      });
      
      const entries = await archiveManager.list(archive);
      
      assert.strictEqual(entries.length, 2);
      assert.ok(entries.some(e => e.path === 'list-file1.txt'));
      assert.ok(entries.some(e => e.path === 'list-file2.txt'));
    });
  });
  
  describe('TAR archives', () => {
    it('should create TAR archive', async () => {
      const file1 = path.join(TEST_DIR, 'tar-file1.txt');
      const file2 = path.join(TEST_DIR, 'tar-file2.txt');
      const archive = path.join(TEST_DIR, 'archive.tar');
      
      await fs.writeFile(file1, 'TAR Content 1');
      await fs.writeFile(file2, 'TAR Content 2');
      
      await archiveManager.create({
        format: 'tar',
        sources: [file1, file2],
        destination: archive,
      });
      
      const stats = await fs.stat(archive);
      assert.ok(stats.size > 0);
    });
    
    it('should create TAR.GZ archive', async () => {
      const file1 = path.join(TEST_DIR, 'gz-file1.txt');
      const file2 = path.join(TEST_DIR, 'gz-file2.txt');
      const archive = path.join(TEST_DIR, 'archive.tar.gz');
      
      await fs.writeFile(file1, 'GZIP Content 1');
      await fs.writeFile(file2, 'GZIP Content 2');
      
      await archiveManager.create({
        format: 'tar.gz',
        sources: [file1, file2],
        destination: archive,
      });
      
      const stats = await fs.stat(archive);
      assert.ok(stats.size > 0);
    });
    
    it('should extract TAR archive', async () => {
      const file1 = path.join(TEST_DIR, 'tar-ex-file1.txt');
      const archive = path.join(TEST_DIR, 'tar-extract.tar');
      const extractDir = path.join(TEST_DIR, 'tar-extracted');
      
      await fs.writeFile(file1, 'TAR Extract');
      
      await archiveManager.create({
        format: 'tar',
        sources: [file1],
        destination: archive,
      });
      
      await archiveManager.extract({
        archive,
        destination: extractDir,
      });
      
      const extracted = await fs.readFile(
        path.join(extractDir, 'tar-ex-file1.txt'),
        'utf-8'
      );
      
      assert.strictEqual(extracted, 'TAR Extract');
    });
  });
  
  describe('File compression', () => {
    it('should compress file with gzip', async () => {
      const source = path.join(TEST_DIR, 'compress-me.txt');
      const dest = path.join(TEST_DIR, 'compress-me.txt.gz');
      
      await fs.writeFile(source, 'Compress this content');
      
      await archiveManager.compressFile(source, dest);
      
      const stats = await fs.stat(dest);
      assert.ok(stats.size > 0);
    });
    
    it('should decompress gzipped file', async () => {
      const source = path.join(TEST_DIR, 'decompress-me.txt');
      const compressed = path.join(TEST_DIR, 'decompress-me.txt.gz');
      const decompressed = path.join(TEST_DIR, 'decompressed.txt');
      
      await fs.writeFile(source, 'Decompress this');
      
      await archiveManager.compressFile(source, compressed);
      await archiveManager.decompressFile(compressed, decompressed);
      
      const content = await fs.readFile(decompressed, 'utf-8');
      assert.strictEqual(content, 'Decompress this');
    });
  });
});

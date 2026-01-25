import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { WatchManager } from '../../../src/tools/file/WatchManager.js';

const TEST_DIR = path.join(process.cwd(), 'test-tmp-watch');

describe('WatchManager', () => {
  let watchManager: WatchManager;
  
  before(async () => {
    watchManager = new WatchManager();
    // Create test directory
    await fs.mkdir(TEST_DIR, { recursive: true });
  });
  
  after(async () => {
    // Stop all watches
    await watchManager.unwatchAll();
    
    // Clean up test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  
  describe('watch()', () => {
    it('should watch file creation', async () => {
      const watchId = 'test-create';
      const testFile = path.join(TEST_DIR, 'create-test.txt');
      
      let eventReceived = false;
      
      watchManager.watch(
        watchId,
        [TEST_DIR],
        (event, filePath) => {
          if (event === 'add' && filePath === testFile) {
            eventReceived = true;
          }
        },
        { events: ['add'] }
      );
      
      // Wait for watcher to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create file
      await fs.writeFile(testFile, 'Test content');
      
      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 500));
      
      assert.strictEqual(eventReceived, true);
      
      await watchManager.unwatch(watchId);
    });
    
    it('should watch file modification', async () => {
      const watchId = 'test-modify';
      const testFile = path.join(TEST_DIR, 'modify-test.txt');
      
      // Create file first
      await fs.writeFile(testFile, 'Initial content');
      
      let eventReceived = false;
      
      watchManager.watch(
        watchId,
        [testFile],
        (event, filePath) => {
          if (event === 'change' && filePath === testFile) {
            eventReceived = true;
          }
        },
        { events: ['change'] }
      );
      
      // Wait for watcher to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Modify file
      await fs.writeFile(testFile, 'Modified content');
      
      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 500));
      
      assert.strictEqual(eventReceived, true);
      
      await watchManager.unwatch(watchId);
    });
    
    it('should watch file deletion', async () => {
      const watchId = 'test-delete';
      const testFile = path.join(TEST_DIR, 'delete-test.txt');
      
      // Create file first
      await fs.writeFile(testFile, 'Delete me');
      
      let eventReceived = false;
      
      watchManager.watch(
        watchId,
        [testFile],
        (event, filePath) => {
          if (event === 'unlink' && filePath === testFile) {
            eventReceived = true;
          }
        },
        { events: ['unlink'] }
      );
      
      // Wait for watcher to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Delete file
      await fs.unlink(testFile);
      
      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 500));
      
      assert.strictEqual(eventReceived, true);
      
      await watchManager.unwatch(watchId);
    });
    
    it('should debounce events', async () => {
      const watchId = 'test-debounce';
      const testFile = path.join(TEST_DIR, 'debounce-test.txt');
      
      // Create file first
      await fs.writeFile(testFile, 'Initial');
      
      let eventCount = 0;
      
      watchManager.watch(
        watchId,
        [testFile],
        () => {
          eventCount++;
        },
        {
          events: ['change'],
          debounce: 500, // 500ms debounce
        }
      );
      
      // Wait for watcher to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Rapid modifications
      await fs.writeFile(testFile, 'Mod 1');
      await new Promise(resolve => setTimeout(resolve, 100));
      await fs.writeFile(testFile, 'Mod 2');
      await new Promise(resolve => setTimeout(resolve, 100));
      await fs.writeFile(testFile, 'Mod 3');
      
      // Wait for debounce + event processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Should only receive 1 event due to debouncing
      assert.strictEqual(eventCount, 1);
      
      await watchManager.unwatch(watchId);
    });
  });
  
  describe('unwatch()', () => {
    it('should stop watching', async () => {
      const watchId = 'test-unwatch';
      const testFile = path.join(TEST_DIR, 'unwatch-test.txt');
      
      let eventReceived = false;
      
      watchManager.watch(
        watchId,
        [TEST_DIR],
        () => {
          eventReceived = true;
        },
        { events: ['add'] }
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Stop watching
      await watchManager.unwatch(watchId);
      
      // Create file after unwatch
      await fs.writeFile(testFile, 'Should not trigger event');
      
      // Wait
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Event should not be received
      assert.strictEqual(eventReceived, false);
    });
  });
  
  describe('listWatches()', () => {
    it('should list active watches', async () => {
      const watchId1 = 'list-watch-1';
      const watchId2 = 'list-watch-2';
      
      watchManager.watch(watchId1, [TEST_DIR], () => {});
      watchManager.watch(watchId2, [TEST_DIR], () => {});
      
      const watches = watchManager.listWatches();
      
      assert.ok(watches.includes(watchId1));
      assert.ok(watches.includes(watchId2));
      
      await watchManager.unwatch(watchId1);
      await watchManager.unwatch(watchId2);
    });
  });
  
  describe('hasWatch()', () => {
    it('should check if watch exists', async () => {
      const watchId = 'check-watch';
      
      assert.strictEqual(watchManager.hasWatch(watchId), false);
      
      watchManager.watch(watchId, [TEST_DIR], () => {});
      
      assert.strictEqual(watchManager.hasWatch(watchId), true);
      
      await watchManager.unwatch(watchId);
      
      assert.strictEqual(watchManager.hasWatch(watchId), false);
    });
  });
});

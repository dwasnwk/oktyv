import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from '../cache-manager.js';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({
      enabled: true,
      maxSize: 5, // Small for testing eviction
      ttl: {
        jobs: 10, // 10 seconds for testing
        companies: 20,
        sessions: 5,
        default: 15,
      },
    });
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cache.set('test', 'value');
      const result = await cache.get('test');
      expect(result).toBe('value');
    });

    it('should return undefined for non-existent keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should check if key exists', async () => {
      await cache.set('test', 'value');
      expect(cache.has('test')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete values', async () => {
      await cache.set('test', 'value');
      cache.delete('test');
      expect(cache.has('test')).toBe(false);
    });

    it('should clear all values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      cache.clear();
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('Category-Specific TTLs', () => {
    it('should use jobs TTL for job keys', async () => {
      await cache.set('job:123', { id: '123' });
      
      // Should exist immediately
      expect(cache.has('job:123')).toBe(true);
      
      // Advance time by 11 seconds (jobs TTL is 10s)
      vi.useFakeTimers();
      vi.advanceTimersByTime(11000);
      
      // Should be expired
      expect(cache.has('job:123')).toBe(false);
      
      vi.useRealTimers();
    });

    it('should use companies TTL for company keys', async () => {
      await cache.set('company:acme', { name: 'ACME' });
      
      vi.useFakeTimers();
      
      // After 10s (less than 20s TTL), should still exist
      vi.advanceTimersByTime(10000);
      expect(cache.has('company:acme')).toBe(true);
      
      // After 21s, should be expired
      vi.advanceTimersByTime(11000);
      expect(cache.has('company:acme')).toBe(false);
      
      vi.useRealTimers();
    });

    it('should use sessions TTL for session keys', async () => {
      await cache.set('session:abc', { token: 'abc' });
      
      vi.useFakeTimers();
      
      // After 6s (sessions TTL is 5s), should be expired
      vi.advanceTimersByTime(6000);
      expect(cache.has('session:abc')).toBe(false);
      
      vi.useRealTimers();
    });

    it('should use default TTL for other keys', async () => {
      await cache.set('other:data', { value: 123 });
      
      vi.useFakeTimers();
      
      // After 10s (less than 15s default), should exist
      vi.advanceTimersByTime(10000);
      expect(cache.has('other:data')).toBe(true);
      
      // After 16s, should be expired
      vi.advanceTimersByTime(6000);
      expect(cache.has('other:data')).toBe(false);
      
      vi.useRealTimers();
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used items when maxSize exceeded', async () => {
      // Fill cache to max (5 items)
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      await cache.set('key4', 'value4');
      await cache.set('key5', 'value5');
      
      // All should exist
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key5')).toBe(true);
      
      // Add 6th item - should evict key1 (least recent)
      await cache.set('key6', 'value6');
      
      expect(cache.has('key1')).toBe(false); // Evicted
      expect(cache.has('key6')).toBe(true);  // New item
    });

    it('should update access order on get', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      await cache.set('key4', 'value4');
      await cache.set('key5', 'value5');
      
      // Access key1 to make it most recent
      await cache.get('key1');
      
      // Add 6th item - should evict key2 (now least recent)
      await cache.set('key6', 'value6');
      
      expect(cache.has('key1')).toBe(true);  // Still exists (was accessed)
      expect(cache.has('key2')).toBe(false); // Evicted
    });
  });

  describe('Pattern-Based Invalidation', () => {
    beforeEach(async () => {
      await cache.set('job:123', { id: '123' });
      await cache.set('job:456', { id: '456' });
      await cache.set('company:acme', { name: 'ACME' });
      await cache.set('company:corp', { name: 'Corp' });
      await cache.set('session:abc', { token: 'abc' });
    });

    it('should invalidate all matching keys', () => {
      cache.invalidate('job:');
      
      expect(cache.has('job:123')).toBe(false);
      expect(cache.has('job:456')).toBe(false);
      expect(cache.has('company:acme')).toBe(true); // Unaffected
    });

    it('should handle exact matches', () => {
      cache.invalidate('job:123');
      
      expect(cache.has('job:123')).toBe(false);
      expect(cache.has('job:456')).toBe(true); // Unaffected
    });

    it('should handle no matches gracefully', () => {
      expect(() => cache.invalidate('nonexistent:')).not.toThrow();
    });
  });

  describe('Enable/Disable', () => {
    it('should not cache when disabled', async () => {
      cache = new CacheManager({ enabled: false, maxSize: 100 });
      
      await cache.set('test', 'value');
      expect(cache.has('test')).toBe(false);
      expect(await cache.get('test')).toBeUndefined();
    });

    it('should still allow operations when disabled (no-op)', async () => {
      cache = new CacheManager({ enabled: false, maxSize: 100 });
      
      // Should not throw
      expect(() => cache.delete('test')).not.toThrow();
      expect(() => cache.clear()).not.toThrow();
      expect(() => cache.invalidate('test:')).not.toThrow();
    });
  });

  describe('Data Types', () => {
    it('should handle objects', async () => {
      const obj = { id: '123', name: 'Test', nested: { value: 42 } };
      await cache.set('obj', obj);
      const result = await cache.get('obj');
      expect(result).toEqual(obj);
    });

    it('should handle arrays', async () => {
      const arr = [1, 2, 3, { id: 'test' }];
      await cache.set('arr', arr);
      const result = await cache.get('arr');
      expect(result).toEqual(arr);
    });

    it('should handle primitives', async () => {
      await cache.set('string', 'test');
      await cache.set('number', 42);
      await cache.set('boolean', true);
      await cache.set('null', null);
      
      expect(await cache.get('string')).toBe('test');
      expect(await cache.get('number')).toBe(42);
      expect(await cache.get('boolean')).toBe(true);
      expect(await cache.get('null')).toBe(null);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty keys', async () => {
      await cache.set('', 'value');
      expect(await cache.get('')).toBe('value');
    });

    it('should handle special characters in keys', async () => {
      const key = 'key:with/special\\chars@#$%';
      await cache.set(key, 'value');
      expect(await cache.get(key)).toBe('value');
    });

    it('should handle undefined values', async () => {
      await cache.set('test', undefined);
      expect(cache.has('test')).toBe(true);
      expect(await cache.get('test')).toBeUndefined();
    });
  });
});

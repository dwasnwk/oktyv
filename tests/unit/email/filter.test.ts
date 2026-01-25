/**
 * Tests for FilterEngine
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FilterEngine } from '../../../src/tools/email/FilterEngine.js';

describe('FilterEngine', () => {
  describe('buildGmailQuery()', () => {
    it('should build query from single filter', () => {
      const engine = new FilterEngine();
      
      const query = engine.buildGmailQuery({
        from: 'sender@example.com',
      });
      
      assert.strictEqual(query, 'from:sender@example.com');
    });
    
    it('should build query with multiple filters', () => {
      const engine = new FilterEngine();
      
      const query = engine.buildGmailQuery({
        from: 'sender@example.com',
        subject: 'important',
        isUnread: true,
      });
      
      assert.ok(query.includes('from:sender@example.com'));
      assert.ok(query.includes('subject:important'));
      assert.ok(query.includes('is:unread'));
    });
    
    it('should handle attachment filter', () => {
      const engine = new FilterEngine();
      
      const query = engine.buildGmailQuery({
        hasAttachment: true,
      });
      
      assert.strictEqual(query, 'has:attachment');
    });
    
    it('should handle date range', () => {
      const engine = new FilterEngine();
      
      const query = engine.buildGmailQuery({
        after: new Date('2025-01-01'),
        before: new Date('2025-12-31'),
      });
      
      assert.ok(query.includes('after:2025/01/01'));
      assert.ok(query.includes('before:2025/12/31'));
    });
    
    it('should escape special characters', () => {
      const engine = new FilterEngine();
      
      const query = engine.buildGmailQuery({
        subject: 'test subject',
      });
      
      assert.ok(query.includes('"test subject"'));
    });
    
    it('should handle starred emails', () => {
      const engine = new FilterEngine();
      
      const query = engine.buildGmailQuery({
        isStarred: true,
      });
      
      assert.strictEqual(query, 'is:starred');
    });
    
    it('should handle labels', () => {
      const engine = new FilterEngine();
      
      const query = engine.buildGmailQuery({
        label: 'important',
      });
      
      assert.strictEqual(query, 'label:important');
    });
  });
  
  describe('buildImapCriteria()', () => {
    it('should build IMAP criteria from filter', () => {
      const engine = new FilterEngine();
      
      const criteria = engine.buildImapCriteria({
        from: 'sender@example.com',
        isUnread: true,
      });
      
      assert.strictEqual(criteria.from, 'sender@example.com');
      assert.strictEqual(criteria.unseen, true);
    });
    
    it('should handle date range for IMAP', () => {
      const engine = new FilterEngine();
      
      const after = new Date('2025-01-01');
      const before = new Date('2025-12-31');
      
      const criteria = engine.buildImapCriteria({
        after,
        before,
      });
      
      assert.strictEqual(criteria.since, after);
      assert.strictEqual(criteria.before, before);
    });
    
    it('should handle flagged (starred) for IMAP', () => {
      const engine = new FilterEngine();
      
      const criteria = engine.buildImapCriteria({
        isStarred: true,
      });
      
      assert.strictEqual(criteria.flagged, true);
    });
  });
  
  describe('Helper methods', () => {
    it('should create unread filter', () => {
      const engine = new FilterEngine();
      
      const filter = engine.unread();
      
      assert.strictEqual(filter.isUnread, true);
    });
    
    it('should create starred filter', () => {
      const engine = new FilterEngine();
      
      const filter = engine.starred();
      
      assert.strictEqual(filter.isStarred, true);
    });
    
    it('should create attachment filter', () => {
      const engine = new FilterEngine();
      
      const filter = engine.withAttachments();
      
      assert.strictEqual(filter.hasAttachment, true);
    });
    
    it('should create from sender filter', () => {
      const engine = new FilterEngine();
      
      const filter = engine.fromSender('sender@example.com');
      
      assert.strictEqual(filter.from, 'sender@example.com');
    });
    
    it('should create to recipient filter', () => {
      const engine = new FilterEngine();
      
      const filter = engine.toRecipient('recipient@example.com');
      
      assert.strictEqual(filter.to, 'recipient@example.com');
    });
    
    it('should create date range filter', () => {
      const engine = new FilterEngine();
      
      const after = new Date('2025-01-01');
      const before = new Date('2025-12-31');
      
      const filter = engine.dateRange(after, before);
      
      assert.strictEqual(filter.after, after);
      assert.strictEqual(filter.before, before);
    });
  });
  
  describe('combineFilters()', () => {
    it('should combine multiple filters', () => {
      const engine = new FilterEngine();
      
      const query = engine.combineFilters([
        { from: 'sender1@example.com' },
        { subject: 'test' },
      ]);
      
      assert.ok(query.includes('from:sender1@example.com'));
      assert.ok(query.includes('subject:test'));
    });
  });
});

/**
 * Tests for AttachmentHandler
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AttachmentHandler } from '../../../src/tools/email/AttachmentHandler.js';

describe('AttachmentHandler', () => {
  describe('fromBuffer()', () => {
    it('should create attachment from buffer', () => {
      const handler = new AttachmentHandler();
      
      const content = Buffer.from('test content');
      const attachment = handler.fromBuffer('test.txt', content, 'text/plain');
      
      assert.strictEqual(attachment.filename, 'test.txt');
      assert.strictEqual(attachment.contentType, 'text/plain');
      assert.strictEqual(attachment.size, content.length);
      assert.strictEqual(attachment.encoding, 'base64');
    });
    
    it('should detect MIME type if not provided', () => {
      const handler = new AttachmentHandler();
      
      const content = Buffer.from('pdf content');
      const attachment = handler.fromBuffer('document.pdf', content);
      
      assert.strictEqual(attachment.contentType, 'application/pdf');
    });
    
    it('should enforce size limit', () => {
      const handler = new AttachmentHandler();
      
      const largeContent = Buffer.alloc(1024 * 1024); // 1MB
      
      assert.throws(() => {
        handler.fromBuffer('large.txt', largeContent, 'text/plain', {
          maxSize: 500 * 1024, // 500KB limit
        });
      }, /too large/i);
    });
    
    it('should enforce allowed types', () => {
      const handler = new AttachmentHandler();
      
      const content = Buffer.from('test');
      
      assert.throws(() => {
        handler.fromBuffer('test.exe', content, 'application/octet-stream', {
          allowedTypes: ['text/plain', 'application/pdf'],
        });
      }, /not allowed/i);
    });
  });
  
  describe('encodeBase64() / decodeBase64()', () => {
    it('should encode and decode content', () => {
      const handler = new AttachmentHandler();
      
      const original = Buffer.from('Hello World');
      const encoded = handler.encodeBase64(original);
      const decoded = handler.decodeBase64(encoded);
      
      assert.strictEqual(decoded.toString(), 'Hello World');
    });
  });
  
  describe('isValidSize()', () => {
    it('should validate size within limit', () => {
      const handler = new AttachmentHandler();
      
      assert.strictEqual(handler.isValidSize(1024), true);
      assert.strictEqual(handler.isValidSize(1024 * 1024), true);
      assert.strictEqual(handler.isValidSize(25 * 1024 * 1024), true);
    });
    
    it('should reject size over limit', () => {
      const handler = new AttachmentHandler();
      
      assert.strictEqual(handler.isValidSize(26 * 1024 * 1024), false);
      assert.strictEqual(handler.isValidSize(100 * 1024 * 1024), false);
    });
    
    it('should respect custom max size', () => {
      const handler = new AttachmentHandler();
      
      assert.strictEqual(handler.isValidSize(2 * 1024 * 1024, 1 * 1024 * 1024), false);
      assert.strictEqual(handler.isValidSize(500 * 1024, 1 * 1024 * 1024), true);
    });
  });
  
  describe('formatSize()', () => {
    it('should format bytes', () => {
      const handler = new AttachmentHandler();
      
      assert.strictEqual(handler.formatSize(500), '500 B');
    });
    
    it('should format kilobytes', () => {
      const handler = new AttachmentHandler();
      
      assert.ok(handler.formatSize(1024).includes('KB'));
      assert.ok(handler.formatSize(10 * 1024).includes('KB'));
    });
    
    it('should format megabytes', () => {
      const handler = new AttachmentHandler();
      
      assert.ok(handler.formatSize(1024 * 1024).includes('MB'));
      assert.ok(handler.formatSize(5 * 1024 * 1024).includes('MB'));
    });
    
    it('should format gigabytes', () => {
      const handler = new AttachmentHandler();
      
      assert.ok(handler.formatSize(1024 * 1024 * 1024).includes('GB'));
    });
  });
});

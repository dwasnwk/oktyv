/**
 * Tests for EmailParser
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EmailParser } from '../../../src/tools/email/EmailParser.js';

describe('EmailParser', () => {
  describe('parse()', () => {
    it('should parse simple plain text email', async () => {
      const parser = new EmailParser();
      
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Test Email
Date: Mon, 20 Jan 2025 10:00:00 +0000

This is a test email body.`;
      
      const parsed = await parser.parse(rawEmail);
      
      assert.ok(parsed);
      assert.strictEqual(parsed.subject, 'Test Email');
      assert.ok(parsed.text?.includes('test email body'));
      assert.strictEqual(parsed.from?.address, 'sender@example.com');
    });
    
    it('should parse HTML email', async () => {
      const parser = new EmailParser();
      
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: HTML Email
Content-Type: text/html

<html><body><h1>Hello</h1></body></html>`;
      
      const parsed = await parser.parse(rawEmail);
      
      assert.ok(parsed);
      assert.strictEqual(parsed.subject, 'HTML Email');
      assert.ok(parsed.html?.includes('<h1>Hello</h1>'));
    });
    
    it('should handle multiple recipients', async () => {
      const parser = new EmailParser();
      
      const rawEmail = `From: sender@example.com
To: recipient1@example.com, recipient2@example.com
Subject: Multiple Recipients

Test`;
      
      const parsed = await parser.parse(rawEmail);
      
      assert.ok(parsed);
      assert.ok(parsed.to.length >= 1);
    });
  });
  
  describe('extractPlainText()', () => {
    it('should extract plain text from HTML', () => {
      const parser = new EmailParser();
      
      const html = '<html><body><p>Hello <b>World</b></p></body></html>';
      const text = parser.extractPlainText(html);
      
      assert.ok(text.includes('Hello'));
      assert.ok(text.includes('World'));
      assert.ok(!text.includes('<'));
    });
    
    it('should handle HTML entities', () => {
      const parser = new EmailParser();
      
      const html = 'Hello&nbsp;&lt;World&gt;&amp;&quot;';
      const text = parser.extractPlainText(html);
      
      assert.strictEqual(text, 'Hello <World>&"');
    });
  });
  
  describe('isValidEmail()', () => {
    it('should validate correct email addresses', () => {
      const parser = new EmailParser();
      
      assert.strictEqual(parser.isValidEmail('user@example.com'), true);
      assert.strictEqual(parser.isValidEmail('user+tag@example.com'), true);
      assert.strictEqual(parser.isValidEmail('user@sub.example.com'), true);
    });
    
    it('should reject invalid email addresses', () => {
      const parser = new EmailParser();
      
      assert.strictEqual(parser.isValidEmail('invalid'), false);
      assert.strictEqual(parser.isValidEmail('invalid@'), false);
      assert.strictEqual(parser.isValidEmail('@example.com'), false);
      assert.strictEqual(parser.isValidEmail('user space@example.com'), false);
    });
  });
  
  describe('getDomain()', () => {
    it('should extract domain from email', () => {
      const parser = new EmailParser();
      
      assert.strictEqual(parser.getDomain('user@example.com'), 'example.com');
      assert.strictEqual(parser.getDomain('user@sub.example.com'), 'sub.example.com');
    });
    
    it('should return null for invalid email', () => {
      const parser = new EmailParser();
      
      assert.strictEqual(parser.getDomain('invalid'), null);
    });
  });
});

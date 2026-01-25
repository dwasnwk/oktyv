/**
 * Email Engine - MCP Tools
 * 
 * Tool definitions for email operations.
 */

import { z } from 'zod';

/**
 * email_gmail_send - Send email via Gmail API
 */
export const email_gmail_send = {
  name: 'email_gmail_send',
  description: 'Send an email using Gmail API with OAuth 2.0 authentication',
  inputSchema: z.object({
    userId: z.string().describe('Gmail user ID (email address)'),
    to: z.array(z.string().email()).describe('Recipient email addresses'),
    subject: z.string().describe('Email subject'),
    body: z.string().describe('Email body (plain text or HTML)'),
    html: z.boolean().optional().describe('Whether body is HTML (default: false)'),
    cc: z.array(z.string().email()).optional().describe('CC recipients'),
    bcc: z.array(z.string().email()).optional().describe('BCC recipients'),
    attachments: z.array(z.object({
      filename: z.string(),
      content: z.string().describe('Base64-encoded content'),
    })).optional().describe('Email attachments'),
  }),
};

/**
 * email_gmail_read - Read emails from Gmail
 */
export const email_gmail_read = {
  name: 'email_gmail_read',
  description: 'List and read emails from Gmail using search queries',
  inputSchema: z.object({
    userId: z.string().describe('Gmail user ID (email address)'),
    query: z.string().optional().describe('Gmail search query (e.g., "is:unread", "from:sender@example.com")'),
    maxResults: z.number().optional().describe('Maximum number of results (default: 10)'),
    pageToken: z.string().optional().describe('Page token for pagination'),
  }),
};

/**
 * email_gmail_search - Search Gmail messages
 */
export const email_gmail_search = {
  name: 'email_gmail_search',
  description: 'Search Gmail messages using advanced query syntax',
  inputSchema: z.object({
    userId: z.string().describe('Gmail user ID (email address)'),
    query: z.string().describe('Gmail search query (e.g., "subject:invoice after:2025/01/01")'),
    maxResults: z.number().optional().describe('Maximum number of results (default: 10)'),
  }),
};

/**
 * email_smtp_connect - Connect to SMTP server
 */
export const email_smtp_connect = {
  name: 'email_smtp_connect',
  description: 'Connect to an SMTP server for sending emails',
  inputSchema: z.object({
    connectionId: z.string().describe('Unique identifier for this connection'),
    host: z.string().describe('SMTP server host (e.g., smtp.gmail.com)'),
    port: z.number().describe('SMTP server port (587 for TLS, 465 for SSL)'),
    secure: z.boolean().describe('Use SSL (true for port 465, false for port 587)'),
    vaultName: z.string().optional().describe('Vault name containing credentials'),
    credentialName: z.string().optional().describe('Credential name in vault (format: username:password)'),
    username: z.string().optional().describe('SMTP username (alternative to vault)'),
    password: z.string().optional().describe('SMTP password (alternative to vault)'),
  }),
};

/**
 * email_smtp_send - Send email via SMTP
 */
export const email_smtp_send = {
  name: 'email_smtp_send',
  description: 'Send an email using SMTP protocol',
  inputSchema: z.object({
    connectionId: z.string().describe('SMTP connection identifier'),
    from: z.string().email().describe('Sender email address'),
    to: z.array(z.string().email()).describe('Recipient email addresses'),
    subject: z.string().describe('Email subject'),
    text: z.string().optional().describe('Plain text body'),
    html: z.string().optional().describe('HTML body'),
    cc: z.array(z.string().email()).optional().describe('CC recipients'),
    bcc: z.array(z.string().email()).optional().describe('BCC recipients'),
    replyTo: z.string().email().optional().describe('Reply-To email address'),
    attachments: z.array(z.object({
      filename: z.string(),
      path: z.string().optional().describe('File path'),
      content: z.string().optional().describe('Base64-encoded content'),
      contentType: z.string().optional().describe('MIME type'),
    })).optional().describe('Email attachments'),
  }),
};

/**
 * email_imap_connect - Connect to IMAP server
 */
export const email_imap_connect = {
  name: 'email_imap_connect',
  description: 'Connect to an IMAP server for reading emails',
  inputSchema: z.object({
    connectionId: z.string().describe('Unique identifier for this connection'),
    host: z.string().describe('IMAP server host (e.g., imap.gmail.com)'),
    port: z.number().describe('IMAP server port (993 for SSL, 143 for TLS)'),
    secure: z.boolean().describe('Use SSL (true for port 993)'),
    vaultName: z.string().optional().describe('Vault name containing credentials'),
    credentialName: z.string().optional().describe('Credential name in vault (format: username:password)'),
    username: z.string().optional().describe('IMAP username (alternative to vault)'),
    password: z.string().optional().describe('IMAP password (alternative to vault)'),
  }),
};

/**
 * email_imap_fetch - Fetch emails via IMAP
 */
export const email_imap_fetch = {
  name: 'email_imap_fetch',
  description: 'Fetch emails from IMAP server with optional filtering',
  inputSchema: z.object({
    connectionId: z.string().describe('IMAP connection identifier'),
    folder: z.string().optional().describe('Mailbox folder (default: INBOX)'),
    criteria: z.array(z.string()).optional().describe('Search criteria (e.g., ["UNSEEN"], ["FROM", "sender@example.com"])'),
    limit: z.number().optional().describe('Maximum number of emails to fetch (default: 10)'),
    markSeen: z.boolean().optional().describe('Mark emails as seen after fetching (default: false)'),
  }),
};

/**
 * email_parse - Parse email message
 */
export const email_parse = {
  name: 'email_parse',
  description: 'Parse a raw email message and extract content',
  inputSchema: z.object({
    raw: z.string().describe('Raw email message (MIME format)'),
    includeAttachments: z.boolean().optional().describe('Extract attachments (default: true)'),
    maxAttachmentSize: z.number().optional().describe('Maximum attachment size in bytes'),
  }),
};

/**
 * Export all tools
 */
export const emailTools = [
  email_gmail_send,
  email_gmail_read,
  email_gmail_search,
  email_smtp_connect,
  email_smtp_send,
  email_imap_connect,
  email_imap_fetch,
  email_parse,
];

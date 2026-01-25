/**
 * Email Engine - Gmail Manager
 * 
 * Interact with Gmail API using OAuth 2.0.
 * 
 * Features:
 * - Send emails via Gmail API
 * - List and search messages
 * - Get message details
 * - Download attachments
 * - OAuth authentication via API Engine
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger('gmail-manager');

/**
 * Gmail send options
 */
export interface GmailSendOptions {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: GmailAttachment[];
}

/**
 * Gmail attachment
 */
export interface GmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

/**
 * Gmail list options
 */
export interface GmailListOptions {
  query?: string;
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
}

/**
 * Gmail message
 */
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  from?: string;
  to?: string[];
  subject?: string;
  date?: Date;
}

/**
 * Gmail Manager
 * 
 * Manages Gmail API operations.
 */
export class GmailManager {
  private readonly GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';
  
  private apiRequest: (url: string, options?: any) => Promise<any>;
  
  constructor(apiRequest: (url: string, options?: any) => Promise<any>) {
    this.apiRequest = apiRequest;
    logger.info('Gmail manager initialized');
  }
  
  /**
   * Send email via Gmail API
   * 
   * @param userId - Gmail user ID (usually email address)
   * @param options - Send options
   */
  async send(userId: string, options: GmailSendOptions): Promise<string> {
    const { to, attachments } = options;
    
    logger.info('Sending email via Gmail', {
      userId,
      to: to.length,
      hasAttachments: attachments && attachments.length > 0,
    });
    
    // Build RFC 2822 message
    const email = this.buildEmail(userId, options);
    
    // Base64url encode
    const encodedEmail = Buffer.from(email).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    try {
      const response = await this.apiRequest(
        `${this.GMAIL_API_BASE}/users/${userId}/messages/send`,
        {
          method: 'POST',
          body: JSON.stringify({
            raw: encodedEmail,
          }),
        }
      );
      
      logger.info('Email sent successfully', {
        userId,
        messageId: response.id,
      });
      
      return response.id;
    } catch (error: any) {
      logger.error('Failed to send email', {
        userId,
        error: error.message,
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
  
  /**
   * List messages
   * 
   * @param userId - Gmail user ID
   * @param options - List options
   * @returns Messages and next page token
   */
  async list(
    userId: string,
    options: GmailListOptions = {}
  ): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
    const { query, maxResults = 10, pageToken, labelIds } = options;
    
    logger.debug('Listing Gmail messages', {
      userId,
      query,
      maxResults,
    });
    
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (maxResults) params.append('maxResults', maxResults.toString());
    if (pageToken) params.append('pageToken', pageToken);
    if (labelIds) {
      for (const labelId of labelIds) {
        params.append('labelIds', labelId);
      }
    }
    
    try {
      const response = await this.apiRequest(
        `${this.GMAIL_API_BASE}/users/${userId}/messages?${params.toString()}`
      );
      
      const messages: GmailMessage[] = [];
      
      if (response.messages) {
        for (const msg of response.messages) {
          messages.push({
            id: msg.id,
            threadId: msg.threadId,
            labelIds: msg.labelIds || [],
            snippet: '',
          });
        }
      }
      
      logger.info('Messages listed', {
        userId,
        count: messages.length,
      });
      
      return {
        messages,
        nextPageToken: response.nextPageToken,
      };
    } catch (error: any) {
      logger.error('Failed to list messages', {
        userId,
        error: error.message,
      });
      throw new Error(`Failed to list messages: ${error.message}`);
    }
  }
  
  /**
   * Get message details
   * 
   * @param userId - Gmail user ID
   * @param messageId - Message ID
   * @returns Message details
   */
  async get(userId: string, messageId: string): Promise<any> {
    logger.debug('Getting message details', {
      userId,
      messageId,
    });
    
    try {
      const response = await this.apiRequest(
        `${this.GMAIL_API_BASE}/users/${userId}/messages/${messageId}?format=full`
      );
      
      logger.info('Message retrieved', {
        userId,
        messageId,
      });
      
      return response;
    } catch (error: any) {
      logger.error('Failed to get message', {
        userId,
        messageId,
        error: error.message,
      });
      throw new Error(`Failed to get message: ${error.message}`);
    }
  }
  
  /**
   * Search messages
   * 
   * @param userId - Gmail user ID
   * @param query - Search query
   * @param maxResults - Max results
   * @returns Search results
   */
  async search(
    userId: string,
    query: string,
    maxResults: number = 10
  ): Promise<GmailMessage[]> {
    logger.info('Searching Gmail messages', {
      userId,
      query,
      maxResults,
    });
    
    const result = await this.list(userId, { query, maxResults });
    return result.messages;
  }
  
  /**
   * Build RFC 2822 email message
   * 
   * @param from - Sender email
   * @param options - Send options
   * @returns RFC 2822 message
   */
  private buildEmail(from: string, options: GmailSendOptions): string {
    const { to, subject, text, html, cc, bcc } = options;
    
    const lines: string[] = [];
    
    // Headers
    lines.push(`From: ${from}`);
    lines.push(`To: ${to.join(', ')}`);
    if (cc && cc.length > 0) {
      lines.push(`Cc: ${cc.join(', ')}`);
    }
    if (bcc && bcc.length > 0) {
      lines.push(`Bcc: ${bcc.join(', ')}`);
    }
    lines.push(`Subject: ${subject}`);
    lines.push('MIME-Version: 1.0');
    
    // Body
    if (html) {
      lines.push('Content-Type: text/html; charset=utf-8');
      lines.push('');
      lines.push(html);
    } else {
      lines.push('Content-Type: text/plain; charset=utf-8');
      lines.push('');
      lines.push(text || '');
    }
    
    return lines.join('\r\n');
  }
}

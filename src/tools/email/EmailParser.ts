/**
 * Email Engine - Email Parser
 * 
 * Parse MIME email messages and extract content.
 * 
 * Features:
 * - MIME parsing with mailparser
 * - HTML and plain text extraction
 * - Attachment extraction
 * - Header parsing
 * - Email address parsing
 */

import { simpleParser } from 'mailparser';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('email-parser');

/**
 * Parsed email result
 */
export interface ParsedEmail {
  messageId: string | undefined;
  from: EmailAddress | undefined;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  subject: string | undefined;
  date: Date | undefined;
  text: string | undefined;
  html: string | undefined;
  attachments: EmailAttachment[];
  headers: Map<string, string | string[]>;
  inReplyTo: string | undefined;
  references: string[];
}

/**
 * Email address
 */
export interface EmailAddress {
  name: string;
  address: string;
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
  contentId: string | undefined;
  inline: boolean;
}

/**
 * Parse options
 */
export interface ParseOptions {
  extractAttachments?: boolean;
  maxAttachmentSize?: number; // bytes
}

/**
 * Email Parser
 * 
 * Parses MIME email messages.
 */
export class EmailParser {
  constructor() {
    logger.info('Email parser initialized');
  }
  
  /**
   * Parse raw email message
   * 
   * @param rawEmail - Raw email string or buffer
   * @param options - Parse options
   * @returns Parsed email
   */
  async parse(
    rawEmail: string | Buffer,
    options: ParseOptions = {}
  ): Promise<ParsedEmail> {
    const { extractAttachments = true, maxAttachmentSize } = options;
    
    logger.debug('Parsing email', {
      size: typeof rawEmail === 'string' ? rawEmail.length : rawEmail.length,
      extractAttachments,
    });
    
    try {
      const parsed = await simpleParser(rawEmail);
      
      const result: ParsedEmail = {
        messageId: parsed.messageId,
        from: this.parseAddress(parsed.from),
        to: this.parseAddresses(parsed.to),
        cc: this.parseAddresses(parsed.cc),
        bcc: this.parseAddresses(parsed.bcc),
        subject: parsed.subject,
        date: parsed.date,
        text: parsed.text,
        html: parsed.html !== false ? parsed.html as string : undefined,
        attachments: [],
        headers: parsed.headers,
        inReplyTo: parsed.inReplyTo,
        references: parsed.references || [],
      };
      
      // Extract attachments
      if (extractAttachments && parsed.attachments) {
        for (const attachment of parsed.attachments) {
          // Check size limit
          if (maxAttachmentSize && attachment.size > maxAttachmentSize) {
            logger.warn('Attachment too large, skipping', {
              filename: attachment.filename,
              size: attachment.size,
              maxSize: maxAttachmentSize,
            });
            continue;
          }
          
          result.attachments.push({
            filename: attachment.filename || 'unnamed',
            contentType: attachment.contentType,
            size: attachment.size,
            content: attachment.content,
            contentId: attachment.contentId,
            inline: attachment.contentDisposition === 'inline',
          });
        }
      }
      
      logger.info('Email parsed successfully', {
        messageId: result.messageId,
        subject: result.subject,
        attachmentCount: result.attachments.length,
      });
      
      return result;
    } catch (error: any) {
      logger.error('Email parsing failed', {
        error: error.message,
      });
      throw new Error(`Email parsing failed: ${error.message}`);
    }
  }
  
  /**
   * Parse single email address
   */
  private parseAddress(address: any): EmailAddress | undefined {
    if (!address) {
      return undefined;
    }
    
    if (address.value && Array.isArray(address.value) && address.value.length > 0) {
      const first = address.value[0];
      return {
        name: first.name || '',
        address: first.address || '',
      };
    }
    
    if (typeof address === 'object' && address.address) {
      return {
        name: address.name || '',
        address: address.address,
      };
    }
    
    return undefined;
  }
  
  /**
   * Parse multiple email addresses
   */
  private parseAddresses(addresses: any): EmailAddress[] {
    if (!addresses) {
      return [];
    }
    
    const result: EmailAddress[] = [];
    
    if (addresses.value && Array.isArray(addresses.value)) {
      for (const addr of addresses.value) {
        result.push({
          name: addr.name || '',
          address: addr.address || '',
        });
      }
    } else if (Array.isArray(addresses)) {
      for (const addr of addresses) {
        if (addr.address) {
          result.push({
            name: addr.name || '',
            address: addr.address,
          });
        }
      }
    }
    
    return result;
  }
  
  /**
   * Extract plain text from HTML
   * 
   * @param html - HTML content
   * @returns Plain text
   */
  extractPlainText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Validate email address format
   * 
   * @param email - Email address
   * @returns True if valid
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Extract email domain
   * 
   * @param email - Email address
   * @returns Domain
   */
  getDomain(email: string): string | null {
    const match = email.match(/@([^\s@]+)$/);
    return match ? match[1] : null;
  }
}

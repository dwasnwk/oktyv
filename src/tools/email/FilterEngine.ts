/**
 * Email Engine - Filter Engine
 * 
 * Build email search and filter queries.
 * 
 * Features:
 * - Gmail search query builder
 * - IMAP search criteria builder
 * - Date range filtering
 * - Sender/recipient filtering
 * - Subject and body text search
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger('filter-engine');

/**
 * Email filter
 */
export interface EmailFilter {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  hasAttachment?: boolean;
  isUnread?: boolean;
  isStarred?: boolean;
  label?: string;
  after?: Date;
  before?: Date;
}

/**
 * IMAP search criteria
 */
export interface ImapSearchCriteria {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  unseen?: boolean;
  flagged?: boolean;
  since?: Date;
  before?: Date;
}

/**
 * Filter Engine
 * 
 * Builds email search queries.
 */
export class FilterEngine {
  constructor() {
    logger.info('Filter engine initialized');
  }
  
  /**
   * Build Gmail search query
   * 
   * Gmail uses a custom query syntax.
   * Reference: https://support.google.com/mail/answer/7190
   * 
   * @param filter - Email filter
   * @returns Gmail query string
   */
  buildGmailQuery(filter: EmailFilter): string {
    const parts: string[] = [];
    
    if (filter.from) {
      parts.push(`from:${this.escapeQuery(filter.from)}`);
    }
    
    if (filter.to) {
      parts.push(`to:${this.escapeQuery(filter.to)}`);
    }
    
    if (filter.subject) {
      parts.push(`subject:${this.escapeQuery(filter.subject)}`);
    }
    
    if (filter.body) {
      parts.push(this.escapeQuery(filter.body));
    }
    
    if (filter.hasAttachment) {
      parts.push('has:attachment');
    }
    
    if (filter.isUnread) {
      parts.push('is:unread');
    }
    
    if (filter.isStarred) {
      parts.push('is:starred');
    }
    
    if (filter.label) {
      parts.push(`label:${this.escapeQuery(filter.label)}`);
    }
    
    if (filter.after) {
      parts.push(`after:${this.formatGmailDate(filter.after)}`);
    }
    
    if (filter.before) {
      parts.push(`before:${this.formatGmailDate(filter.before)}`);
    }
    
    const query = parts.join(' ');
    
    logger.debug('Built Gmail query', { filter, query });
    
    return query;
  }
  
  /**
   * Build IMAP search criteria
   * 
   * IMAP uses a different format.
   * Reference: RFC 3501
   * 
   * @param filter - Email filter
   * @returns IMAP search criteria
   */
  buildImapCriteria(filter: EmailFilter): ImapSearchCriteria {
    const criteria: ImapSearchCriteria = {};
    
    if (filter.from) {
      criteria.from = filter.from;
    }
    
    if (filter.to) {
      criteria.to = filter.to;
    }
    
    if (filter.subject) {
      criteria.subject = filter.subject;
    }
    
    if (filter.body) {
      criteria.body = filter.body;
    }
    
    if (filter.isUnread) {
      criteria.unseen = true;
    }
    
    if (filter.isStarred) {
      criteria.flagged = true;
    }
    
    if (filter.after) {
      criteria.since = filter.after;
    }
    
    if (filter.before) {
      criteria.before = filter.before;
    }
    
    logger.debug('Built IMAP criteria', { filter, criteria });
    
    return criteria;
  }
  
  /**
   * Combine multiple filters with AND
   * 
   * @param filters - Email filters
   * @returns Combined Gmail query
   */
  combineFilters(filters: EmailFilter[]): string {
    const queries = filters.map(f => this.buildGmailQuery(f));
    return queries.join(' ');
  }
  
  /**
   * Create filter for unread emails
   * 
   * @returns Email filter
   */
  unread(): EmailFilter {
    return { isUnread: true };
  }
  
  /**
   * Create filter for starred emails
   * 
   * @returns Email filter
   */
  starred(): EmailFilter {
    return { isStarred: true };
  }
  
  /**
   * Create filter for emails with attachments
   * 
   * @returns Email filter
   */
  withAttachments(): EmailFilter {
    return { hasAttachment: true };
  }
  
  /**
   * Create filter for emails from sender
   * 
   * @param email - Sender email
   * @returns Email filter
   */
  fromSender(email: string): EmailFilter {
    return { from: email };
  }
  
  /**
   * Create filter for emails to recipient
   * 
   * @param email - Recipient email
   * @returns Email filter
   */
  toRecipient(email: string): EmailFilter {
    return { to: email };
  }
  
  /**
   * Create filter for date range
   * 
   * @param after - Start date
   * @param before - End date
   * @returns Email filter
   */
  dateRange(after?: Date, before?: Date): EmailFilter {
    return { after, before };
  }
  
  /**
   * Create filter for subject containing text
   * 
   * @param text - Subject text
   * @returns Email filter
   */
  subjectContains(text: string): EmailFilter {
    return { subject: text };
  }
  
  /**
   * Create filter for body containing text
   * 
   * @param text - Body text
   * @returns Email filter
   */
  bodyContains(text: string): EmailFilter {
    return { body: text };
  }
  
  /**
   * Escape query text for Gmail
   * 
   * @param text - Query text
   * @returns Escaped text
   */
  private escapeQuery(text: string): string {
    // Gmail handles email addresses and simple terms without quotes
    // Only quote if text contains spaces or special chars (except @, which is valid in emails)
    if (/[\s:]/.test(text)) {
      return `"${text.replace(/"/g, '\\"')}"`;
    }
    return text;
  }
  
  /**
   * Format date for Gmail query
   * 
   * @param date - Date
   * @returns Formatted date (YYYY/MM/DD)
   */
  private formatGmailDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }
}

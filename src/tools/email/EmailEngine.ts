/**
 * Email Engine - Main Orchestrator
 * 
 * Integrates all email components for unified email operations.
 * 
 * Features:
 * - Gmail API integration
 * - SMTP sending
 * - IMAP receiving
 * - Email parsing
 * - Attachment handling
 */

import { GmailManager } from './GmailManager.js';
import { SmtpManager, SmtpConfig, SmtpSendOptions } from './SmtpManager.js';
import { ImapManager, ImapConfig, ImapFetchOptions } from './ImapManager.js';
import { EmailParser, ParseOptions, ParsedEmail } from './EmailParser.js';
import { AttachmentHandler } from './AttachmentHandler.js';
import { FilterEngine, EmailFilter } from './FilterEngine.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('email-engine');

/**
 * Email Engine
 * 
 * Main orchestrator for email operations.
 */
export class EmailEngine {
  private gmailManager: GmailManager;
  private smtpManager: SmtpManager;
  private imapManager: ImapManager;
  private emailParser: EmailParser;
  private attachmentHandler: AttachmentHandler;
  private filterEngine: FilterEngine;
  
  constructor(
    getVault: (vault: string, key: string) => Promise<string>,
    apiRequest: (url: string, options?: any) => Promise<any>
  ) {
    this.gmailManager = new GmailManager(apiRequest);
    this.smtpManager = new SmtpManager(getVault);
    this.imapManager = new ImapManager(getVault);
    this.emailParser = new EmailParser();
    this.attachmentHandler = new AttachmentHandler();
    this.filterEngine = new FilterEngine();
    
    logger.info('Email engine initialized');
  }
  
  /**
   * Send email via Gmail API
   * 
   * @param userId - Gmail user ID
   * @param options - Send options
   * @returns Message ID
   */
  async gmailSend(userId: string, options: any): Promise<string> {
    logger.info('Sending email via Gmail', { userId });
    return await this.gmailManager.send(userId, options);
  }
  
  /**
   * List emails from Gmail
   * 
   * @param userId - Gmail user ID
   * @param options - List options
   * @returns Messages
   */
  async gmailList(userId: string, options: any = {}): Promise<any> {
    logger.info('Listing Gmail emails', { userId });
    return await this.gmailManager.list(userId, options);
  }
  
  /**
   * Get email from Gmail
   * 
   * @param userId - Gmail user ID
   * @param messageId - Message ID
   * @returns Message
   */
  async gmailGet(userId: string, messageId: string): Promise<any> {
    logger.info('Getting Gmail email', { userId, messageId });
    return await this.gmailManager.get(userId, messageId);
  }
  
  /**
   * Search Gmail emails
   * 
   * @param userId - Gmail user ID
   * @param query - Search query
   * @param maxResults - Max results
   * @returns Search results
   */
  async gmailSearch(userId: string, query: string, maxResults?: number): Promise<any> {
    logger.info('Searching Gmail', { userId, query });
    return await this.gmailManager.search(userId, query, maxResults);
  }
  
  /**
   * Connect to SMTP server
   * 
   * @param config - SMTP configuration
   */
  async smtpConnect(config: SmtpConfig): Promise<void> {
    logger.info('Connecting to SMTP', { connectionId: config.connectionId });
    await this.smtpManager.connect(config);
  }
  
  /**
   * Send email via SMTP
   * 
   * @param connectionId - Connection ID
   * @param options - Send options
   * @returns Message ID
   */
  async smtpSend(connectionId: string, options: SmtpSendOptions): Promise<string> {
    logger.info('Sending email via SMTP', { connectionId });
    return await this.smtpManager.send(connectionId, options);
  }
  
  /**
   * Disconnect from SMTP
   * 
   * @param connectionId - Connection ID
   */
  async smtpDisconnect(connectionId: string): Promise<void> {
    logger.info('Disconnecting SMTP', { connectionId });
    await this.smtpManager.disconnect(connectionId);
  }
  
  /**
   * Connect to IMAP server
   * 
   * @param config - IMAP configuration
   */
  async imapConnect(config: ImapConfig): Promise<void> {
    logger.info('Connecting to IMAP', { connectionId: config.connectionId });
    await this.imapManager.connect(config);
  }
  
  /**
   * Fetch emails via IMAP
   * 
   * @param connectionId - Connection ID
   * @param options - Fetch options
   * @returns Emails
   */
  async imapFetch(connectionId: string, options?: ImapFetchOptions): Promise<ParsedEmail[]> {
    logger.info('Fetching emails via IMAP', { connectionId });
    return await this.imapManager.fetch(connectionId, options);
  }
  
  /**
   * Disconnect from IMAP
   * 
   * @param connectionId - Connection ID
   */
  async imapDisconnect(connectionId: string): Promise<void> {
    logger.info('Disconnecting IMAP', { connectionId });
    await this.imapManager.disconnect(connectionId);
  }
  
  /**
   * Parse email message
   * 
   * @param rawEmail - Raw email
   * @param options - Parse options
   * @returns Parsed email
   */
  async parseEmail(rawEmail: string | Buffer, options?: ParseOptions): Promise<ParsedEmail> {
    logger.info('Parsing email');
    return await this.emailParser.parse(rawEmail, options);
  }
  
  /**
   * Build Gmail search query from filter
   * 
   * @param filter - Email filter
   * @returns Gmail query string
   */
  buildGmailQuery(filter: EmailFilter): string {
    return this.filterEngine.buildGmailQuery(filter);
  }
  
  /**
   * Get SMTP manager
   */
  getSmtpManager(): SmtpManager {
    return this.smtpManager;
  }
  
  /**
   * Get IMAP manager
   */
  getImapManager(): ImapManager {
    return this.imapManager;
  }
  
  /**
   * Get Gmail manager
   */
  getGmailManager(): GmailManager {
    return this.gmailManager;
  }
  
  /**
   * Get email parser
   */
  getEmailParser(): EmailParser {
    return this.emailParser;
  }
  
  /**
   * Get attachment handler
   */
  getAttachmentHandler(): AttachmentHandler {
    return this.attachmentHandler;
  }
  
  /**
   * Get filter engine
   */
  getFilterEngine(): FilterEngine {
    return this.filterEngine;
  }
  
  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all email connections');
    await this.smtpManager.closeAll();
    await this.imapManager.closeAll();
  }
}

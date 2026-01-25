/**
 * Email Engine - SMTP Manager
 * 
 * Send emails via SMTP protocol using nodemailer.
 * 
 * Features:
 * - Connect to any SMTP server
 * - TLS/SSL encryption
 * - Send HTML and plain text emails
 * - Multiple recipients (To, CC, BCC)
 * - Attachments
 */

import nodemailer, { Transporter } from 'nodemailer';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('smtp-manager');

/**
 * SMTP connection config
 */
export interface SmtpConfig {
  connectionId: string;
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  vaultName?: string;
  credentialName?: string;
  username?: string;
  password?: string;
}

/**
 * Email send options
 */
export interface SmtpSendOptions {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: SmtpAttachment[];
}

/**
 * SMTP attachment
 */
export interface SmtpAttachment {
  filename: string;
  path?: string;
  content?: Buffer | string;
  contentType?: string;
  cid?: string; // Content-ID for inline images
}

/**
 * SMTP connection
 */
interface SmtpConnection {
  connectionId: string;
  transporter: Transporter;
  config: SmtpConfig;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * SMTP Manager
 * 
 * Manages SMTP email sending operations.
 */
export class SmtpManager {
  private connections: Map<string, SmtpConnection>;
  private getVault: (vault: string, key: string) => Promise<string>;
  
  constructor(getVault: (vault: string, key: string) => Promise<string>) {
    this.connections = new Map();
    this.getVault = getVault;
    
    logger.info('SMTP manager initialized');
  }
  
  /**
   * Connect to SMTP server
   * 
   * @param config - SMTP configuration
   */
  async connect(config: SmtpConfig): Promise<void> {
    const { connectionId, host, port, secure, vaultName, credentialName, username, password } = config;
    
    logger.info('Connecting to SMTP server', {
      connectionId,
      host,
      port,
      secure,
    });
    
    try {
      // Get credentials
      let auth: { user: string; pass: string } | undefined;
      
      if (vaultName && credentialName) {
        const credentials = await this.getVault(vaultName, credentialName);
        const [user, pass] = credentials.split(':');
        auth = { user, pass };
      } else if (username && password) {
        auth = { user: username, pass: password };
      }
      
      // Create transporter
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth,
      });
      
      // Verify connection
      await transporter.verify();
      
      // Store connection
      this.connections.set(connectionId, {
        connectionId,
        transporter,
        config,
        createdAt: new Date(),
        lastUsed: new Date(),
      });
      
      logger.info('SMTP connection established', { connectionId });
    } catch (error: any) {
      logger.error('SMTP connection failed', {
        connectionId,
        error: error.message,
      });
      throw new Error(`SMTP connection failed: ${error.message}`);
    }
  }
  
  /**
   * Send email via SMTP
   * 
   * @param connectionId - Connection identifier
   * @param options - Send options
   */
  async send(connectionId: string, options: SmtpSendOptions): Promise<string> {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      throw new Error(`SMTP connection ${connectionId} not found`);
    }
    
    const { from, to, subject, text, html, cc, bcc, replyTo, attachments } = options;
    
    logger.info('Sending email via SMTP', {
      connectionId,
      from,
      to: to.length,
      subject,
      hasAttachments: attachments && attachments.length > 0,
    });
    
    try {
      // Prepare message
      const message: any = {
        from,
        to: to.join(', '),
        subject,
      };
      
      if (cc && cc.length > 0) {
        message.cc = cc.join(', ');
      }
      
      if (bcc && bcc.length > 0) {
        message.bcc = bcc.join(', ');
      }
      
      if (replyTo) {
        message.replyTo = replyTo;
      }
      
      if (html) {
        message.html = html;
      }
      
      if (text) {
        message.text = text;
      }
      
      if (attachments && attachments.length > 0) {
        message.attachments = attachments;
      }
      
      // Send email
      const info = await connection.transporter.sendMail(message);
      
      // Update last used
      connection.lastUsed = new Date();
      
      logger.info('Email sent successfully', {
        connectionId,
        messageId: info.messageId,
      });
      
      return info.messageId;
    } catch (error: any) {
      logger.error('Failed to send email', {
        connectionId,
        error: error.message,
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
  
  /**
   * Disconnect from SMTP server
   * 
   * @param connectionId - Connection identifier
   */
  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      logger.warn('SMTP connection not found for disconnect', { connectionId });
      return;
    }
    
    logger.info('Disconnecting SMTP', { connectionId });
    
    connection.transporter.close();
    this.connections.delete(connectionId);
    
    logger.info('SMTP disconnected', { connectionId });
  }
  
  /**
   * List all connections
   * 
   * @returns Connection IDs
   */
  listConnections(): string[] {
    return Array.from(this.connections.keys());
  }
  
  /**
   * Get connection metadata
   * 
   * @param connectionId - Connection identifier
   * @returns Connection metadata
   */
  getConnectionMetadata(connectionId: string): any {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      return null;
    }
    
    return {
      connectionId: connection.connectionId,
      host: connection.config.host,
      port: connection.config.port,
      secure: connection.config.secure,
      createdAt: connection.createdAt,
      lastUsed: connection.lastUsed,
    };
  }
  
  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all SMTP connections');
    
    for (const connectionId of this.connections.keys()) {
      await this.disconnect(connectionId);
    }
  }
}

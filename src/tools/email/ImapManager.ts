/**
 * Email Engine - IMAP Manager
 * 
 * Receive and manage emails via IMAP protocol.
 * 
 * Features:
 * - Connect to IMAP servers
 * - Fetch emails with filters
 * - Search emails
 * - Mark as read/unread
 * - Delete emails
 */

import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { createLogger } from '../../utils/logger.js';
import { ParsedEmail } from './EmailParser.js';

const logger = createLogger('imap-manager');

/**
 * IMAP connection config
 */
export interface ImapConfig {
  connectionId: string;
  host: string;
  port: number;
  secure: boolean;
  vaultName?: string;
  credentialName?: string;
  username?: string;
  password?: string;
}

/**
 * IMAP fetch options
 */
export interface ImapFetchOptions {
  folder?: string;
  criteria?: string[]; // e.g., ['UNSEEN'], ['FROM', 'sender@example.com']
  limit?: number;
  markSeen?: boolean;
}

/**
 * IMAP connection
 */
interface ImapConnection {
  connectionId: string;
  client: Imap;
  config: ImapConfig;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * IMAP Manager
 * 
 * Manages IMAP email receiving operations.
 */
export class ImapManager {
  private connections: Map<string, ImapConnection>;
  private getVault: (vault: string, key: string) => Promise<string>;
  
  constructor(getVault: (vault: string, key: string) => Promise<string>) {
    this.connections = new Map();
    this.getVault = getVault;
    
    logger.info('IMAP manager initialized');
  }
  
  /**
   * Connect to IMAP server
   * 
   * @param config - IMAP configuration
   */
  async connect(config: ImapConfig): Promise<void> {
    const { connectionId, host, port, secure, vaultName, credentialName, username, password } = config;
    
    logger.info('Connecting to IMAP server', {
      connectionId,
      host,
      port,
      secure,
    });
    
    try {
      // Get credentials
      let user: string;
      let pass: string;
      
      if (vaultName && credentialName) {
        const credentials = await this.getVault(vaultName, credentialName);
        [user, pass] = credentials.split(':');
      } else if (username && password) {
        user = username;
        pass = password;
      } else {
        throw new Error('No credentials provided');
      }
      
      // Create IMAP client
      const imap = new Imap({
        host,
        port,
        tls: secure,
        user,
        password: pass,
        tlsOptions: { rejectUnauthorized: false },
      });
      
      // Connect
      await new Promise<void>((resolve, reject) => {
        imap.once('ready', () => resolve());
        imap.once('error', (err: Error) => reject(err));
        imap.connect();
      });
      
      // Store connection
      this.connections.set(connectionId, {
        connectionId,
        client: imap,
        config,
        createdAt: new Date(),
        lastUsed: new Date(),
      });
      
      logger.info('IMAP connection established', { connectionId });
    } catch (error: any) {
      logger.error('IMAP connection failed', {
        connectionId,
        error: error.message,
      });
      throw new Error(`IMAP connection failed: ${error.message}`);
    }
  }
  
  /**
   * Fetch emails from IMAP server
   * 
   * @param connectionId - Connection identifier
   * @param options - Fetch options
   * @returns Array of parsed emails
   */
  async fetch(
    connectionId: string,
    options: ImapFetchOptions = {}
  ): Promise<ParsedEmail[]> {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      throw new Error(`IMAP connection ${connectionId} not found`);
    }
    
    const { folder = 'INBOX', criteria = ['ALL'], limit = 10, markSeen = false } = options;
    
    logger.info('Fetching emails via IMAP', {
      connectionId,
      folder,
      criteria,
      limit,
    });
    
    try {
      const emails: ParsedEmail[] = [];
      
      // Open mailbox
      await new Promise<void>((resolve, reject) => {
        connection.client.openBox(folder, !markSeen, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Search for emails
      const uids = await new Promise<number[]>((resolve, reject) => {
        connection.client.search(criteria, (err: any, results: any) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      
      if (uids.length === 0) {
        logger.info('No emails found', { connectionId });
        return [];
      }
      
      // Limit results
      const fetchUids = uids.slice(-limit);
      
      // Fetch emails
      const fetch = connection.client.fetch(fetchUids, {
        bodies: '',
        markSeen,
      });
      
      await new Promise<void>((resolve, reject) => {
        fetch.on('message', (msg: any) => {
          msg.on('body', (stream: any) => {
            let buffer = '';
            
            stream.on('data', (chunk: any) => {
              buffer += chunk.toString('utf8');
            });
            
            stream.once('end', async () => {
              const parsed = await simpleParser(buffer);
              
              emails.push({
                messageId: parsed.messageId,
                from: parsed.from ? {
                  name: parsed.from.text || '',
                  address: (parsed.from.value && parsed.from.value[0]?.address) || '',
                } : undefined,
                to: parsed.to ? (Array.isArray(parsed.to.value) ? parsed.to.value.map((a: any) => ({
                  name: a.name || '',
                  address: a.address || '',
                })) : []) : [],
                cc: [],
                bcc: [],
                subject: parsed.subject,
                date: parsed.date,
                text: parsed.text,
                html: parsed.html !== false ? parsed.html as string : undefined,
                attachments: [],
                headers: parsed.headers,
                inReplyTo: parsed.inReplyTo,
                references: parsed.references || [],
              });
            });
          });
        });
        
        fetch.once('error', reject);
        fetch.once('end', () => resolve());
      });
      
      // Update last used
      connection.lastUsed = new Date();
      
      logger.info('Emails fetched successfully', {
        connectionId,
        count: emails.length,
      });
      
      return emails;
    } catch (error: any) {
      logger.error('Failed to fetch emails', {
        connectionId,
        error: error.message,
      });
      throw new Error(`Failed to fetch emails: ${error.message}`);
    }
  }
  
  /**
   * Disconnect from IMAP server
   * 
   * @param connectionId - Connection identifier
   */
  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      logger.warn('IMAP connection not found for disconnect', { connectionId });
      return;
    }
    
    logger.info('Disconnecting IMAP', { connectionId });
    
    connection.client.end();
    this.connections.delete(connectionId);
    
    logger.info('IMAP disconnected', { connectionId });
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
   * Close all connections
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all IMAP connections');
    
    for (const connectionId of this.connections.keys()) {
      await this.disconnect(connectionId);
    }
  }
}

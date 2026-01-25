/**
 * Vault Engine - Audit Logger
 * 
 * Logs all vault operations for security and compliance.
 * Stores audit logs in ~/.oktyv/logs/vault-audit.log
 * 
 * Logged Events:
 * - VAULT_CREATED, VAULT_DELETED
 * - CREDENTIAL_SET, CREDENTIAL_GET, CREDENTIAL_DELETED
 * - MASTER_KEY_CREATED, MASTER_KEY_DELETED
 * - ACCESS_DENIED, VAULT_ERROR
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Audit event types
 */
export type AuditEventType =
  | 'VAULT_CREATED'
  | 'VAULT_DELETED'
  | 'CREDENTIAL_SET'
  | 'CREDENTIAL_GET'
  | 'CREDENTIAL_DELETED'
  | 'CREDENTIAL_LIST'
  | 'MASTER_KEY_CREATED'
  | 'MASTER_KEY_DELETED'
  | 'ACCESS_DENIED'
  | 'VAULT_ERROR';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  timestamp: string;
  event: AuditEventType;
  vaultName: string;
  credentialName?: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * AuditLogger - Logs vault operations for security and compliance
 */
export class AuditLogger {
  private logFile: string;
  private enabled: boolean;
  
  constructor(logFile?: string, enabled: boolean = true) {
    // Default: ~/.oktyv/logs/vault-audit.log
    this.logFile = logFile || path.join(os.homedir(), '.oktyv', 'logs', 'vault-audit.log');
    this.enabled = enabled;
  }
  
  /**
   * Ensure log directory exists
   */
  private async ensureLogDir(): Promise<void> {
    if (!this.enabled) return;
    
    try {
      const logDir = path.dirname(this.logFile);
      await fs.mkdir(logDir, { recursive: true });
    } catch {
      // Fail silently if can't create log dir
      this.enabled = false;
    }
  }
  
  /**
   * Log a vault operation
   */
  async log(entry: AuditLogEntry): Promise<void> {
    if (!this.enabled) return;
    
    await this.ensureLogDir();
    
    try {
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.logFile, logLine, 'utf8');
    } catch {
      // Fail silently if logging fails - don't block vault operations
    }
  }
  
  /**
   * Log successful vault creation
   */
  async logVaultCreated(vaultName: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'VAULT_CREATED',
      vaultName,
      success: true,
    });
  }
  
  /**
   * Log successful vault deletion
   */
  async logVaultDeleted(vaultName: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'VAULT_DELETED',
      vaultName,
      success: true,
    });
  }
  
  /**
   * Log successful credential set
   */
  async logCredentialSet(vaultName: string, credentialName: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'CREDENTIAL_SET',
      vaultName,
      credentialName,
      success: true,
    });
  }
  
  /**
   * Log successful credential retrieval
   */
  async logCredentialGet(vaultName: string, credentialName: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'CREDENTIAL_GET',
      vaultName,
      credentialName,
      success: true,
    });
  }
  
  /**
   * Log successful credential deletion
   */
  async logCredentialDeleted(vaultName: string, credentialName: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'CREDENTIAL_DELETED',
      vaultName,
      credentialName,
      success: true,
    });
  }
  
  /**
   * Log successful credential list
   */
  async logCredentialList(vaultName: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'CREDENTIAL_LIST',
      vaultName,
      success: true,
    });
  }
  
  /**
   * Log master key creation
   */
  async logMasterKeyCreated(vaultName: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'MASTER_KEY_CREATED',
      vaultName,
      success: true,
    });
  }
  
  /**
   * Log master key deletion
   */
  async logMasterKeyDeleted(vaultName: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'MASTER_KEY_DELETED',
      vaultName,
      success: true,
    });
  }
  
  /**
   * Log access denied
   */
  async logAccessDenied(vaultName: string, credentialName: string | undefined, errorCode: string, errorMessage: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'ACCESS_DENIED',
      vaultName,
      credentialName,
      success: false,
      errorCode,
      errorMessage,
    });
  }
  
  /**
   * Log vault error
   */
  async logError(vaultName: string, credentialName: string | undefined, errorCode: string, errorMessage: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'VAULT_ERROR',
      vaultName,
      credentialName,
      success: false,
      errorCode,
      errorMessage,
    });
  }
  
  /**
   * Read audit log (for debugging/compliance)
   * Returns most recent N entries
   */
  async readLog(limit: number = 100): Promise<AuditLogEntry[]> {
    if (!this.enabled) return [];
    
    try {
      const content = await fs.readFile(this.logFile, 'utf8');
      const lines = content.trim().split('\n');
      const entries = lines
        .slice(-limit)
        .map(line => JSON.parse(line) as AuditLogEntry);
      return entries.reverse(); // Most recent first
    } catch {
      return [];
    }
  }
}

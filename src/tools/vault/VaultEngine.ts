/**
 * Vault Engine - Main Orchestrator
 * 
 * High-level API for vault operations.
 * Coordinates crypto, keychain, storage, and audit logging.
 * 
 * Flow:
 * 1. User stores credential → VaultEngine encrypts → Storage saves → Audit logs
 * 2. User retrieves credential → Storage loads → VaultEngine decrypts → Audit logs
 * 3. Master key stored in OS keychain (Keychain/Credential Manager)
 * 4. Vault data stored as encrypted JSON (~/.oktyv/vaults/*.vault)
 */

import * as crypto from './crypto.js';
import { KeychainAdapter, KeychainError } from './KeychainAdapter.js';
import { VaultStorage, VaultStorageError } from './VaultStorage.js';
import { AuditLogger } from './AuditLogger.js';

/**
 * Vault Engine Error
 */
export class VaultError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'VaultError';
  }
}

/**
 * VaultEngine - Main vault orchestrator
 */
export class VaultEngine {
  private keychain: KeychainAdapter;
  private storage: VaultStorage;
  private audit: AuditLogger;
  
  constructor(
    storageDir?: string,
    auditLogFile?: string,
    auditEnabled: boolean = true
  ) {
    this.keychain = new KeychainAdapter();
    this.storage = new VaultStorage(storageDir);
    this.audit = new AuditLogger(auditLogFile, auditEnabled);
  }
  
  /**
   * Get or create master key for vault
   * 
   * If master key exists in keychain → retrieve it
   * If not → generate new key → store in keychain
   */
  private async getMasterKey(vaultName: string): Promise<Buffer> {
    try {
      // Try to get existing master key
      return await this.keychain.getMasterKey(vaultName);
    } catch (error) {
      // If key doesn't exist, create new one
      if (error instanceof KeychainError && error.code === 'MASTER_KEY_NOT_FOUND') {
        const masterKey = crypto.generateMasterKey();
        await this.keychain.setMasterKey(vaultName, masterKey);
        await this.audit.logMasterKeyCreated(vaultName);
        return masterKey;
      }
      
      // Re-throw other errors
      throw error;
    }
  }
  
  /**
   * Store credential in vault
   * 
   * @param vaultName - Name of vault (e.g., "personal", "work")
   * @param credentialName - Name of credential (e.g., "github-token")
   * @param value - Secret value to store
   */
  async set(vaultName: string, credentialName: string, value: string): Promise<void> {
    try {
      // Get master key (creates if needed)
      const masterKey = await this.getMasterKey(vaultName);
      
      // Encrypt credential
      const encrypted = crypto.encrypt(value, masterKey);
      
      // Store encrypted data
      await this.storage.setCredential(vaultName, credentialName, encrypted);
      
      // Audit log
      await this.audit.logCredentialSet(vaultName, credentialName);
    } catch (error: any) {
      await this.audit.logError(vaultName, credentialName, error.code || 'UNKNOWN', error.message);
      
      if (error instanceof KeychainError || error instanceof VaultStorageError || error instanceof crypto.CryptoError) {
        throw new VaultError(error.code, error.message);
      }
      
      throw new VaultError('UNKNOWN', `Failed to store credential: ${error.message}`);
    }
  }
  
  /**
   * Retrieve credential from vault
   * 
   * @param vaultName - Name of vault
   * @param credentialName - Name of credential
   * @returns Decrypted secret value
   */
  async get(vaultName: string, credentialName: string): Promise<string> {
    try {
      // Get master key
      const masterKey = await this.getMasterKey(vaultName);
      
      // Load encrypted data
      const encrypted = await this.storage.getCredential(vaultName, credentialName);
      
      // Decrypt credential
      const decrypted = crypto.decrypt(encrypted, masterKey);
      
      // Audit log
      await this.audit.logCredentialGet(vaultName, credentialName);
      
      return decrypted;
    } catch (error: any) {
      if (error instanceof KeychainError && error.code === 'KEYCHAIN_ACCESS_DENIED') {
        await this.audit.logAccessDenied(vaultName, credentialName, error.code, error.message);
      } else {
        await this.audit.logError(vaultName, credentialName, error.code || 'UNKNOWN', error.message);
      }
      
      if (error instanceof KeychainError || error instanceof VaultStorageError || error instanceof crypto.CryptoError) {
        throw new VaultError(error.code, error.message);
      }
      
      throw new VaultError('UNKNOWN', `Failed to retrieve credential: ${error.message}`);
    }
  }
  
  /**
   * Delete credential from vault
   * 
   * @param vaultName - Name of vault
   * @param credentialName - Name of credential
   */
  async delete(vaultName: string, credentialName: string): Promise<void> {
    try {
      await this.storage.deleteCredential(vaultName, credentialName);
      await this.audit.logCredentialDeleted(vaultName, credentialName);
    } catch (error: any) {
      await this.audit.logError(vaultName, credentialName, error.code || 'UNKNOWN', error.message);
      
      if (error instanceof VaultStorageError) {
        throw new VaultError(error.code, error.message);
      }
      
      throw new VaultError('UNKNOWN', `Failed to delete credential: ${error.message}`);
    }
  }
  
  /**
   * List all credential names in vault (not values)
   * 
   * @param vaultName - Name of vault
   * @returns Array of credential names
   */
  async list(vaultName: string): Promise<string[]> {
    try {
      const credentials = await this.storage.listCredentials(vaultName);
      await this.audit.logCredentialList(vaultName);
      return credentials;
    } catch (error: any) {
      await this.audit.logError(vaultName, undefined, error.code || 'UNKNOWN', error.message);
      
      if (error instanceof VaultStorageError) {
        throw new VaultError(error.code, error.message);
      }
      
      throw new VaultError('UNKNOWN', `Failed to list credentials: ${error.message}`);
    }
  }
  
  /**
   * Delete entire vault (vault file + master key from keychain)
   * 
   * @param vaultName - Name of vault to delete
   */
  async deleteVault(vaultName: string): Promise<void> {
    try {
      // Delete vault file
      await this.storage.deleteVault(vaultName);
      
      // Delete master key from keychain
      await this.keychain.deleteMasterKey(vaultName);
      
      // Audit log
      await this.audit.logVaultDeleted(vaultName);
      await this.audit.logMasterKeyDeleted(vaultName);
    } catch (error: any) {
      await this.audit.logError(vaultName, undefined, error.code || 'UNKNOWN', error.message);
      
      if (error instanceof KeychainError || error instanceof VaultStorageError) {
        throw new VaultError(error.code, error.message);
      }
      
      throw new VaultError('UNKNOWN', `Failed to delete vault: ${error.message}`);
    }
  }
  
  /**
   * List all vaults
   * 
   * @returns Array of vault names
   */
  async listVaults(): Promise<string[]> {
    try {
      return await this.storage.listVaults();
    } catch (error: any) {
      if (error instanceof VaultStorageError) {
        throw new VaultError(error.code, error.message);
      }
      
      throw new VaultError('UNKNOWN', `Failed to list vaults: ${error.message}`);
    }
  }
  
  /**
   * Check if vault exists
   * 
   * @param vaultName - Name of vault
   * @returns true if vault exists
   */
  async vaultExists(vaultName: string): Promise<boolean> {
    return await this.storage.vaultExists(vaultName);
  }
}

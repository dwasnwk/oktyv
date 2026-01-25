/**
 * Vault Engine - Vault Storage
 * 
 * Manages encrypted vault files on disk.
 * Each vault is stored as a separate .vault file containing encrypted credentials.
 * 
 * File Structure:
 * ~/.oktyv/vaults/<vault-name>.vault
 * 
 * File Format (JSON):
 * {
 *   "version": "1.0",
 *   "created": "2024-01-24T12:00:00.000Z",
 *   "updated": "2024-01-24T12:30:00.000Z",
 *   "credentials": {
 *     "api-key-1": { data: "...", iv: "...", authTag: "..." },
 *     "password-1": { data: "...", iv: "...", authTag: "..." }
 *   }
 * }
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { EncryptedData } from './crypto.js';

/**
 * Vault file structure
 */
export interface VaultFile {
  version: string;
  created: string;
  updated: string;
  credentials: Record<string, EncryptedData>;
}

/**
 * Custom error class for vault storage operations
 */
export class VaultStorageError extends Error {
  constructor(
    public code: 'VAULT_NOT_FOUND' | 'VAULT_READ_FAILED' | 'VAULT_WRITE_FAILED' | 'CREDENTIAL_NOT_FOUND' | 'INVALID_VAULT_FILE',
    message: string
  ) {
    super(message);
    this.name = 'VaultStorageError';
  }
}

/**
 * VaultStorage - Manages encrypted vault files on disk
 */
export class VaultStorage {
  private vaultsDir: string;
  
  constructor(baseDir?: string) {
    // Default: ~/.oktyv/vaults
    this.vaultsDir = baseDir || path.join(os.homedir(), '.oktyv', 'vaults');
  }
  
  /**
   * Get path to vault file
   */
  private getVaultPath(vaultName: string): string {
    return path.join(this.vaultsDir, `${vaultName}.vault`);
  }
  
  /**
   * Ensure vaults directory exists
   */
  private async ensureVaultsDir(): Promise<void> {
    try {
      await fs.mkdir(this.vaultsDir, { recursive: true });
    } catch (error: any) {
      throw new VaultStorageError(
        'VAULT_WRITE_FAILED',
        `Failed to create vaults directory: ${error.message}`
      );
    }
  }
  
  /**
   * Check if vault file exists
   */
  async vaultExists(vaultName: string): Promise<boolean> {
    try {
      await fs.access(this.getVaultPath(vaultName));
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Create new vault file
   */
  async createVault(vaultName: string): Promise<void> {
    await this.ensureVaultsDir();
    
    const vaultFile: VaultFile = {
      version: '1.0',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      credentials: {},
    };
    
    try {
      const vaultPath = this.getVaultPath(vaultName);
      await fs.writeFile(vaultPath, JSON.stringify(vaultFile, null, 2), 'utf8');
    } catch (error: any) {
      throw new VaultStorageError(
        'VAULT_WRITE_FAILED',
        `Failed to create vault: ${error.message}`
      );
    }
  }
  
  /**
   * Read vault file
   */
  async readVault(vaultName: string): Promise<VaultFile> {
    const vaultPath = this.getVaultPath(vaultName);
    
    try {
      const content = await fs.readFile(vaultPath, 'utf8');
      const vault = JSON.parse(content) as VaultFile;
      
      // Validate structure
      if (!vault.version || !vault.credentials) {
        throw new VaultStorageError(
          'INVALID_VAULT_FILE',
          'Vault file is missing required fields'
        );
      }
      
      return vault;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new VaultStorageError(
          'VAULT_NOT_FOUND',
          `Vault not found: ${vaultName}`
        );
      }
      
      if (error instanceof VaultStorageError) {
        throw error;
      }
      
      throw new VaultStorageError(
        'VAULT_READ_FAILED',
        `Failed to read vault: ${error.message}`
      );
    }
  }
  
  /**
   * Write vault file
   */
  async writeVault(vaultName: string, vault: VaultFile): Promise<void> {
    await this.ensureVaultsDir();
    
    vault.updated = new Date().toISOString();
    
    try {
      const vaultPath = this.getVaultPath(vaultName);
      await fs.writeFile(vaultPath, JSON.stringify(vault, null, 2), 'utf8');
    } catch (error: any) {
      throw new VaultStorageError(
        'VAULT_WRITE_FAILED',
        `Failed to write vault: ${error.message}`
      );
    }
  }
  
  /**
   * Store encrypted credential in vault
   */
  async setCredential(vaultName: string, credentialName: string, encrypted: EncryptedData): Promise<void> {
    // Create vault if it doesn't exist
    if (!(await this.vaultExists(vaultName))) {
      await this.createVault(vaultName);
    }
    
    const vault = await this.readVault(vaultName);
    vault.credentials[credentialName] = encrypted;
    await this.writeVault(vaultName, vault);
  }
  
  /**
   * Retrieve encrypted credential from vault
   */
  async getCredential(vaultName: string, credentialName: string): Promise<EncryptedData> {
    const vault = await this.readVault(vaultName);
    const encrypted = vault.credentials[credentialName];
    
    if (!encrypted) {
      throw new VaultStorageError(
        'CREDENTIAL_NOT_FOUND',
        `Credential not found: ${credentialName} in vault ${vaultName}`
      );
    }
    
    return encrypted;
  }
  
  /**
   * Delete credential from vault
   */
  async deleteCredential(vaultName: string, credentialName: string): Promise<void> {
    const vault = await this.readVault(vaultName);
    
    if (!vault.credentials[credentialName]) {
      throw new VaultStorageError(
        'CREDENTIAL_NOT_FOUND',
        `Credential not found: ${credentialName} in vault ${vaultName}`
      );
    }
    
    delete vault.credentials[credentialName];
    await this.writeVault(vaultName, vault);
  }
  
  /**
   * List all credential names in vault (not values)
   */
  async listCredentials(vaultName: string): Promise<string[]> {
    const vault = await this.readVault(vaultName);
    return Object.keys(vault.credentials);
  }
  
  /**
   * Delete entire vault file
   */
  async deleteVault(vaultName: string): Promise<void> {
    const vaultPath = this.getVaultPath(vaultName);
    
    try {
      await fs.unlink(vaultPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Vault doesn't exist - idempotent operation
        return;
      }
      
      throw new VaultStorageError(
        'VAULT_WRITE_FAILED',
        `Failed to delete vault: ${error.message}`
      );
    }
  }
  
  /**
   * List all vault names
   */
  async listVaults(): Promise<string[]> {
    try {
      await this.ensureVaultsDir();
      const files = await fs.readdir(this.vaultsDir);
      return files
        .filter(f => f.endsWith('.vault'))
        .map(f => f.replace('.vault', ''));
    } catch (error: any) {
      throw new VaultStorageError(
        'VAULT_READ_FAILED',
        `Failed to list vaults: ${error.message}`
      );
    }
  }
}

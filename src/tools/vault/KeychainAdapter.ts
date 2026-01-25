/**
 * Vault Engine - OS Keychain Adapter
 * 
 * Provides cross-platform OS keychain integration for secure master key storage.
 * Uses @napi-rs/keyring for native OS integration:
 * - macOS: Keychain Services
 * - Windows: Credential Manager
 * - Linux: Secret Service (GNOME Keyring, KDE Wallet)
 */

import { Entry } from '@napi-rs/keyring';

/**
 * Custom error class for keychain operations
 */
export class KeychainError extends Error {
  constructor(
    public code: 'MASTER_KEY_NOT_FOUND' | 'KEYCHAIN_ACCESS_DENIED' | 'INVALID_VAULT_NAME',
    message: string
  ) {
    super(message);
    this.name = 'KeychainError';
  }
}

/**
 * KeychainAdapter - Manages master keys in OS keychain
 * 
 * Master keys are stored in the OS-native secure credential store:
 * - macOS: Keychain Access
 * - Windows: Credential Manager
 * - Linux: GNOME Keyring / KDE Wallet
 */
export class KeychainAdapter {
  private serviceName = 'oktyv-vault';
  
  /**
   * Retrieve master key for a vault from OS keychain
   * 
   * @param vaultName - Name of the vault (used as account name in keychain)
   * @returns Master key as Buffer (32 bytes)
   * @throws KeychainError if key not found or access denied
   */
  async getMasterKey(vaultName: string): Promise<Buffer> {
    this.validateVaultName(vaultName);
    
    try {
      const entry = new Entry(this.serviceName, vaultName);
      const keyBase64 = entry.getPassword();
      
      if (!keyBase64) {
        throw new KeychainError(
          'MASTER_KEY_NOT_FOUND',
          `No master key found for vault: ${vaultName}`
        );
      }
      
      return Buffer.from(keyBase64, 'base64');
    } catch (error: any) {
      // If error is already KeychainError, re-throw
      if (error instanceof KeychainError) {
        throw error;
      }
      
      // Map keyring library errors to KeychainError
      throw new KeychainError(
        'KEYCHAIN_ACCESS_DENIED',
        `Failed to access keychain: ${error.message}`
      );
    }
  }
  
  /**
   * Store master key for a vault in OS keychain
   * 
   * @param vaultName - Name of the vault
   * @param key - Master key (32 bytes)
   * @throws KeychainError if access denied or invalid vault name
   */
  async setMasterKey(vaultName: string, key: Buffer): Promise<void> {
    this.validateVaultName(vaultName);
    
    if (key.length !== 32) {
      throw new Error('Master key must be 32 bytes');
    }
    
    try {
      const entry = new Entry(this.serviceName, vaultName);
      const keyBase64 = key.toString('base64');
      entry.setPassword(keyBase64);
    } catch (error: any) {
      throw new KeychainError(
        'KEYCHAIN_ACCESS_DENIED',
        `Failed to store key in keychain: ${error.message}`
      );
    }
  }
  
  /**
   * Delete master key for a vault from OS keychain
   * 
   * @param vaultName - Name of the vault
   * @throws KeychainError if access denied
   */
  async deleteMasterKey(vaultName: string): Promise<void> {
    this.validateVaultName(vaultName);
    
    try {
      const entry = new Entry(this.serviceName, vaultName);
      entry.deleteCredential();
    } catch (error: any) {
      // Deletion of non-existent key is not an error (idempotent)
      if (error.message?.includes('not found')) {
        return;
      }
      
      throw new KeychainError(
        'KEYCHAIN_ACCESS_DENIED',
        `Failed to delete key from keychain: ${error.message}`
      );
    }
  }
  
  /**
   * Check if master key exists for a vault
   * 
   * @param vaultName - Name of the vault
   * @returns true if key exists, false otherwise
   */
  async hasMasterKey(vaultName: string): Promise<boolean> {
    try {
      await this.getMasterKey(vaultName);
      return true;
    } catch (error) {
      if (error instanceof KeychainError && error.code === 'MASTER_KEY_NOT_FOUND') {
        return false;
      }
      // Re-throw other errors (access denied, etc.)
      throw error;
    }
  }
  
  /**
   * Validate vault name
   * Vault names must be alphanumeric with hyphens, 1-50 characters
   */
  private validateVaultName(vaultName: string): void {
    if (!vaultName || vaultName.length === 0 || vaultName.length > 50) {
      throw new KeychainError(
        'INVALID_VAULT_NAME',
        'Vault name must be 1-50 characters'
      );
    }
    
    if (!/^[a-z0-9-]+$/.test(vaultName)) {
      throw new KeychainError(
        'INVALID_VAULT_NAME',
        'Vault name must contain only lowercase letters, numbers, and hyphens'
      );
    }
  }
}

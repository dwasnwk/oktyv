/**
 * Vault Engine - MCP Tools
 * 
 * MCP tool definitions for vault operations.
 * Exposes VaultEngine functionality to Claude via Model Context Protocol.
 */

import { z } from 'zod';
import { VaultEngine } from './VaultEngine.js';

// Singleton VaultEngine instance
const vaultEngine = new VaultEngine();

/**
 * Zod schemas for parameter validation
 */

const VaultNameSchema = z.string()
  .min(1).max(50)
  .regex(/^[a-z0-9-]+$/, 'Vault name must contain only lowercase letters, numbers, and hyphens');

const CredentialNameSchema = z.string()
  .min(1).max(100)
  .regex(/^[a-z0-9-_]+$/, 'Credential name must contain only lowercase letters, numbers, hyphens, and underscores');

const CredentialValueSchema = z.string()
  .min(1).max(10000);

/**
 * vault_set - Store credential in vault
 * 
 * Encrypts and stores a credential (API key, password, token) in a vault.
 * Master key is automatically managed in OS keychain.
 * 
 * @param vaultName - Name of vault (e.g., "personal", "work", "project-x")
 * @param credentialName - Name of credential (e.g., "github-token", "api-key")
 * @param value - Secret value to store (will be encrypted)
 */
export const vaultSetTool = {
  name: 'vault_set',
  description: 'Store an encrypted credential in a vault. Creates vault if it doesn\'t exist. Master key stored in OS keychain (Keychain/Credential Manager).',
  inputSchema: z.object({
    vaultName: VaultNameSchema.describe('Vault name (lowercase, alphanumeric, hyphens)'),
    credentialName: CredentialNameSchema.describe('Credential name (lowercase, alphanumeric, hyphens, underscores)'),
    value: CredentialValueSchema.describe('Secret value to store (will be encrypted with AES-256-GCM)'),
  }),
  handler: async (params: { vaultName: string; credentialName: string; value: string }) => {
    await vaultEngine.set(params.vaultName, params.credentialName, params.value);
    return {
      success: true,
      message: `Credential "${params.credentialName}" stored in vault "${params.vaultName}"`,
    };
  },
};

/**
 * vault_get - Retrieve credential from vault
 * 
 * Decrypts and returns a stored credential.
 * 
 * @param vaultName - Name of vault
 * @param credentialName - Name of credential
 * @returns Decrypted credential value
 */
export const vaultGetTool = {
  name: 'vault_get',
  description: 'Retrieve and decrypt a credential from a vault. Returns the plaintext secret value.',
  inputSchema: z.object({
    vaultName: VaultNameSchema.describe('Vault name'),
    credentialName: CredentialNameSchema.describe('Credential name'),
  }),
  handler: async (params: { vaultName: string; credentialName: string }) => {
    const value = await vaultEngine.get(params.vaultName, params.credentialName);
    return {
      success: true,
      credentialName: params.credentialName,
      value,
    };
  },
};

/**
 * vault_list - List all credential names in vault
 * 
 * Returns list of credential names (not values).
 * 
 * @param vaultName - Name of vault
 * @returns Array of credential names
 */
export const vaultListTool = {
  name: 'vault_list',
  description: 'List all credential names in a vault (values not included for security). Returns array of credential names.',
  inputSchema: z.object({
    vaultName: VaultNameSchema.describe('Vault name'),
  }),
  handler: async (params: { vaultName: string }) => {
    const credentials = await vaultEngine.list(params.vaultName);
    return {
      success: true,
      vaultName: params.vaultName,
      credentials,
      count: credentials.length,
    };
  },
};

/**
 * vault_delete - Delete credential from vault
 * 
 * Permanently deletes a credential from the vault.
 * 
 * @param vaultName - Name of vault
 * @param credentialName - Name of credential to delete
 */
export const vaultDeleteTool = {
  name: 'vault_delete',
  description: 'Delete a credential from a vault. This is permanent and cannot be undone.',
  inputSchema: z.object({
    vaultName: VaultNameSchema.describe('Vault name'),
    credentialName: CredentialNameSchema.describe('Credential name to delete'),
  }),
  handler: async (params: { vaultName: string; credentialName: string }) => {
    await vaultEngine.delete(params.vaultName, params.credentialName);
    return {
      success: true,
      message: `Credential "${params.credentialName}" deleted from vault "${params.vaultName}"`,
    };
  },
};

/**
 * vault_delete_vault - Delete entire vault
 * 
 * Permanently deletes vault file and master key from keychain.
 * All credentials in the vault will be lost.
 * 
 * @param vaultName - Name of vault to delete
 */
export const vaultDeleteVaultTool = {
  name: 'vault_delete_vault',
  description: 'Delete an entire vault including all credentials and master key. This is permanent and cannot be undone. Use with caution.',
  inputSchema: z.object({
    vaultName: VaultNameSchema.describe('Vault name to delete'),
  }),
  handler: async (params: { vaultName: string }) => {
    await vaultEngine.deleteVault(params.vaultName);
    return {
      success: true,
      message: `Vault "${params.vaultName}" and all its credentials permanently deleted`,
    };
  },
};

/**
 * vault_list_vaults - List all vaults
 * 
 * Returns list of all vault names.
 * 
 * @returns Array of vault names
 */
export const vaultListVaultsTool = {
  name: 'vault_list_vaults',
  description: 'List all vaults. Returns array of vault names.',
  inputSchema: z.object({}),
  handler: async (_params?: Record<string, never>) => {
    const vaults = await vaultEngine.listVaults();
    return {
      success: true,
      vaults,
      count: vaults.length,
    };
  },
};

/**
 * All vault tools
 */
export const vaultTools = [
  vaultSetTool,
  vaultGetTool,
  vaultListTool,
  vaultDeleteTool,
  vaultDeleteVaultTool,
  vaultListVaultsTool,
];

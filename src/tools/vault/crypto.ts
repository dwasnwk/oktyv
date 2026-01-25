/**
 * Vault Engine - Cryptography Utilities
 * 
 * AES-256-GCM encryption/decryption for vault data.
 * Uses Node.js built-in crypto module for secure operations.
 * 
 * Algorithm: AES-256-GCM (Galois/Counter Mode)
 * - 256-bit key strength
 * - Authenticated encryption (prevents tampering)
 * - 128-bit IV (initialization vector)
 * - 128-bit authentication tag
 */

import * as crypto from 'crypto';

// Constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;  // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  data: string;      // base64-encoded encrypted data
  iv: string;        // base64-encoded initialization vector
  authTag: string;   // base64-encoded authentication tag
}

/**
 * Custom error class for crypto operations
 */
export class CryptoError extends Error {
  constructor(
    public code: 'KEY_GENERATION_FAILED' | 'ENCRYPTION_FAILED' | 'DECRYPTION_FAILED' | 'INVALID_KEY_LENGTH' | 'TAMPERED_DATA',
    message: string
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}

/**
 * Generate a secure random master key (32 bytes / 256 bits)
 * 
 * @returns Buffer containing 256-bit random key
 * @throws CryptoError if key generation fails
 */
export function generateMasterKey(): Buffer {
  try {
    return crypto.randomBytes(KEY_LENGTH);
  } catch (error: any) {
    throw new CryptoError(
      'KEY_GENERATION_FAILED',
      `Failed to generate master key: ${error.message}`
    );
  }
}

/**
 * Encrypt plaintext using AES-256-GCM
 * 
 * @param plaintext - String to encrypt
 * @param masterKey - 256-bit master key (32 bytes)
 * @returns EncryptedData object with encrypted data, IV, and auth tag
 * @throws CryptoError if encryption fails or key is invalid
 */
export function encrypt(plaintext: string, masterKey: Buffer): EncryptedData {
  // Validate key length
  if (masterKey.length !== KEY_LENGTH) {
    throw new CryptoError(
      'INVALID_KEY_LENGTH',
      `Master key must be ${KEY_LENGTH} bytes, got ${masterKey.length} bytes`
    );
  }

  try {
    // Generate random IV (must be unique for each encryption)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
    
    // Encrypt plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag (proves data hasn't been tampered with)
    const authTag = cipher.getAuthTag();
    
    return {
      data: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  } catch (error: any) {
    throw new CryptoError(
      'ENCRYPTION_FAILED',
      `Encryption failed: ${error.message}`
    );
  }
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * @param encrypted - EncryptedData object from encrypt()
 * @param masterKey - 256-bit master key (32 bytes)
 * @returns Decrypted plaintext string
 * @throws CryptoError if decryption fails, key is invalid, or data was tampered with
 */
export function decrypt(encrypted: EncryptedData, masterKey: Buffer): string {
  // Validate key length
  if (masterKey.length !== KEY_LENGTH) {
    throw new CryptoError(
      'INVALID_KEY_LENGTH',
      `Master key must be ${KEY_LENGTH} bytes, got ${masterKey.length} bytes`
    );
  }

  try {
    // Create decipher with AES-256-GCM
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      masterKey,
      Buffer.from(encrypted.iv, 'base64')
    );
    
    // Set authentication tag (will throw if data was tampered with)
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));
    
    // Decrypt data
    let decrypted = decipher.update(encrypted.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    // Check if error is due to tampered data
    if (error.message?.includes('Unsupported state') || error.message?.includes('auth')) {
      throw new CryptoError(
        'TAMPERED_DATA',
        'Decryption failed: Data has been tampered with or corrupted'
      );
    }
    
    throw new CryptoError(
      'DECRYPTION_FAILED',
      `Decryption failed: ${error.message}`
    );
  }
}

/**
 * Validate that a buffer is a valid master key
 * 
 * @param key - Buffer to validate
 * @returns true if valid, false otherwise
 */
export function isValidMasterKey(key: Buffer): boolean {
  return Buffer.isBuffer(key) && key.length === KEY_LENGTH;
}

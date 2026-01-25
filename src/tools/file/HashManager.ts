import crypto from 'crypto';
import fs from 'fs';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('hash-manager');

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

export interface HashResult {
  algorithm: HashAlgorithm;
  hash: string;
  filePath: string;
}

export interface CompareResult {
  file1: string;
  file2: string;
  identical: boolean;
  hash?: string;
}

/**
 * File hashing and comparison manager
 */
export class HashManager {
  /**
   * Initialize hash manager
   */
  constructor() {
    logger.info('Hash manager initialized');
  }
  
  /**
   * Calculate file hash
   * 
   * @param filePath - Path to file
   * @param algorithm - Hash algorithm
   * @returns Hash result
   */
  async hash(filePath: string, algorithm: HashAlgorithm = 'sha256'): Promise<HashResult> {
    logger.info('Calculating file hash', { filePath, algorithm });
    
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (chunk: Buffer) => {
        hash.update(chunk);
      });
      
      stream.on('end', () => {
        const hashValue = hash.digest('hex');
        logger.info('Hash calculated', { filePath, algorithm, hash: hashValue });
        resolve({
          algorithm,
          hash: hashValue,
          filePath,
        });
      });
      
      stream.on('error', (error) => {
        logger.error('Hash calculation failed', { filePath, error });
        reject(new Error(`FILE_HASH_FAILED: ${error.message}`));
      });
    });
  }
  
  /**
   * Calculate hash for multiple files
   * 
   * @param filePaths - Array of file paths
   * @param algorithm - Hash algorithm
   * @returns Array of hash results
   */
  async hashMultiple(filePaths: string[], algorithm: HashAlgorithm = 'sha256'): Promise<HashResult[]> {
    logger.info('Calculating hashes for multiple files', {
      count: filePaths.length,
      algorithm,
    });
    
    const results: HashResult[] = [];
    for (const filePath of filePaths) {
      const result = await this.hash(filePath, algorithm);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Compare two files by hash
   * 
   * @param file1 - First file path
   * @param file2 - Second file path
   * @param algorithm - Hash algorithm
   * @returns Comparison result
   */
  async compareFiles(
    file1: string,
    file2: string,
    algorithm: HashAlgorithm = 'sha256'
  ): Promise<CompareResult> {
    logger.info('Comparing files', { file1, file2, algorithm });
    
    const [hash1, hash2] = await Promise.all([
      this.hash(file1, algorithm),
      this.hash(file2, algorithm),
    ]);
    
    const identical = hash1.hash === hash2.hash;
    
    logger.info('Files compared', { file1, file2, identical });
    
    return {
      file1,
      file2,
      identical,
      hash: identical ? hash1.hash : undefined,
    };
  }
  
  /**
   * Find duplicate files in a set
   * 
   * @param filePaths - Array of file paths
   * @param algorithm - Hash algorithm
   * @returns Map of hash to file paths (only duplicates)
   */
  async findDuplicates(
    filePaths: string[],
    algorithm: HashAlgorithm = 'sha256'
  ): Promise<Map<string, string[]>> {
    logger.info('Finding duplicates', { count: filePaths.length, algorithm });
    
    // Calculate all hashes
    const results = await this.hashMultiple(filePaths, algorithm);
    
    // Group by hash
    const hashMap = new Map<string, string[]>();
    for (const result of results) {
      const existing = hashMap.get(result.hash) || [];
      existing.push(result.filePath);
      hashMap.set(result.hash, existing);
    }
    
    // Filter to only duplicates (hash appears more than once)
    const duplicates = new Map<string, string[]>();
    for (const [hash, paths] of hashMap.entries()) {
      if (paths.length > 1) {
        duplicates.set(hash, paths);
      }
    }
    
    logger.info('Duplicates found', {
      total: filePaths.length,
      duplicateGroups: duplicates.size,
    });
    
    return duplicates;
  }
  
  /**
   * Verify file integrity against expected hash
   * 
   * @param filePath - Path to file
   * @param expectedHash - Expected hash value
   * @param algorithm - Hash algorithm
   * @returns True if hash matches
   */
  async verify(
    filePath: string,
    expectedHash: string,
    algorithm: HashAlgorithm = 'sha256'
  ): Promise<boolean> {
    logger.info('Verifying file integrity', { filePath, algorithm });
    
    const result = await this.hash(filePath, algorithm);
    const matches = result.hash === expectedHash.toLowerCase();
    
    logger.info('Verification complete', { filePath, matches });
    
    return matches;
  }
  
  /**
   * Calculate checksum for a string
   * 
   * @param data - Data to hash
   * @param algorithm - Hash algorithm
   * @returns Hash value
   */
  hashString(data: string, algorithm: HashAlgorithm = 'sha256'): string {
    const hash = crypto.createHash(algorithm);
    hash.update(data);
    return hash.digest('hex');
  }
}

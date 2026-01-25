/**
 * Email Engine - Attachment Handler
 * 
 * Handle email attachments (encoding, decoding, validation).
 * 
 * Features:
 * - Base64 encoding/decoding
 * - MIME type detection
 * - Size validation
 * - Inline images (CID)
 */

import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { basename } from 'path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('attachment-handler');

/**
 * Attachment data
 */
export interface AttachmentData {
  filename: string;
  content: Buffer | string;
  contentType: string;
  encoding?: 'base64' | 'utf-8';
  size: number;
  cid?: string; // Content-ID for inline images
}

/**
 * Attachment options
 */
export interface AttachmentOptions {
  maxSize?: number; // bytes
  allowedTypes?: string[]; // MIME types
}

/**
 * Attachment Handler
 * 
 * Handles email attachment operations.
 */
export class AttachmentHandler {
  private readonly MAX_SIZE = 25 * 1024 * 1024; // 25MB default
  
  constructor() {
    logger.info('Attachment handler initialized');
  }
  
  /**
   * Prepare attachment from file path
   * 
   * @param filePath - Path to file
   * @param options - Attachment options
   * @returns Attachment data
   */
  async fromFile(
    filePath: string,
    options: AttachmentOptions = {}
  ): Promise<AttachmentData> {
    const { maxSize = this.MAX_SIZE, allowedTypes } = options;
    
    logger.debug('Loading attachment from file', { filePath });
    
    try {
      // Get file stats
      const stats = await stat(filePath);
      
      // Check size
      if (stats.size > maxSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize})`);
      }
      
      // Detect MIME type
      const contentType = this.detectMimeType(filePath);
      
      // Check allowed types
      if (allowedTypes && !allowedTypes.includes(contentType)) {
        throw new Error(`File type not allowed: ${contentType}`);
      }
      
      // Read file
      const content = await this.readFile(filePath);
      
      logger.info('Attachment loaded', {
        filename: basename(filePath),
        size: stats.size,
        contentType,
      });
      
      return {
        filename: basename(filePath),
        content,
        contentType,
        encoding: 'base64',
        size: stats.size,
      };
    } catch (error: any) {
      logger.error('Failed to load attachment', {
        filePath,
        error: error.message,
      });
      throw new Error(`Failed to load attachment: ${error.message}`);
    }
  }
  
  /**
   * Prepare attachment from buffer
   * 
   * @param filename - Filename
   * @param content - File content
   * @param contentType - MIME type
   * @param options - Attachment options
   * @returns Attachment data
   */
  fromBuffer(
    filename: string,
    content: Buffer,
    contentType?: string,
    options: AttachmentOptions = {}
  ): AttachmentData {
    const { maxSize = this.MAX_SIZE, allowedTypes } = options;
    
    // Check size
    if (content.length > maxSize) {
      throw new Error(`Content too large: ${content.length} bytes (max: ${maxSize})`);
    }
    
    // Detect or validate MIME type
    const finalContentType = contentType || this.detectMimeType(filename);
    
    // Check allowed types
    if (allowedTypes && !allowedTypes.includes(finalContentType)) {
      throw new Error(`Content type not allowed: ${finalContentType}`);
    }
    
    logger.info('Attachment created from buffer', {
      filename,
      size: content.length,
      contentType: finalContentType,
    });
    
    return {
      filename,
      content,
      contentType: finalContentType,
      encoding: 'base64',
      size: content.length,
    };
  }
  
  /**
   * Create inline image attachment
   * 
   * @param filePath - Path to image
   * @param cid - Content-ID
   * @param options - Attachment options
   * @returns Attachment data
   */
  async createInlineImage(
    filePath: string,
    cid: string,
    options: AttachmentOptions = {}
  ): Promise<AttachmentData> {
    const attachment = await this.fromFile(filePath, options);
    
    // Validate it's an image
    if (!attachment.contentType.startsWith('image/')) {
      throw new Error(`Not an image file: ${attachment.contentType}`);
    }
    
    attachment.cid = cid;
    
    logger.info('Inline image created', {
      filename: attachment.filename,
      cid,
    });
    
    return attachment;
  }
  
  /**
   * Encode attachment content to base64
   * 
   * @param content - Buffer content
   * @returns Base64 string
   */
  encodeBase64(content: Buffer): string {
    return content.toString('base64');
  }
  
  /**
   * Decode base64 content
   * 
   * @param base64 - Base64 string
   * @returns Buffer
   */
  decodeBase64(base64: string): Buffer {
    return Buffer.from(base64, 'base64');
  }
  
  /**
   * Detect MIME type from filename
   * 
   * @param filename - Filename
   * @returns MIME type
   */
  private detectMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      
      // Text
      txt: 'text/plain',
      html: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      json: 'application/json',
      xml: 'text/xml',
      csv: 'text/csv',
      
      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',
      '7z': 'application/x-7z-compressed',
      
      // Other
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
  
  /**
   * Read file content
   * 
   * @param filePath - Path to file
   * @returns Buffer
   */
  private async readFile(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      const stream = createReadStream(filePath);
      
      stream.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.from(chunk));
      });
      
      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Validate attachment size
   * 
   * @param size - Size in bytes
   * @param maxSize - Max size in bytes
   * @returns True if valid
   */
  isValidSize(size: number, maxSize?: number): boolean {
    const limit = maxSize || this.MAX_SIZE;
    return size <= limit;
  }
  
  /**
   * Format file size for display
   * 
   * @param bytes - Size in bytes
   * @returns Formatted string
   */
  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }
}

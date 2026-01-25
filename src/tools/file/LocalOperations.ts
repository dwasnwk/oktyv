import fs from 'fs/promises';
import fss from 'fs';
import path from 'path';
import { glob } from 'glob';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('local-operations');

export interface FileStats {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isFile: boolean;
  isDirectory: boolean;
  permissions: string;
}

export interface FileListResult {
  path: string;
  name: string;
  isDirectory: boolean;
  size?: number;
}

export interface ReadOptions {
  encoding?: BufferEncoding;
  start?: number;
  end?: number;
}

export interface WriteOptions {
  encoding?: BufferEncoding;
  mode?: 'overwrite' | 'append';
}

export interface CopyOptions {
  recursive?: boolean;
  overwrite?: boolean;
}

/**
 * Local file system operations manager
 */
export class LocalOperations {
  /**
   * Initialize local operations
   */
  constructor() {
    logger.info('Local operations initialized');
  }
  
  /**
   * Read file contents
   * 
   * @param filePath - Path to file
   * @param options - Read options
   * @returns File contents
   */
  async read(filePath: string, options: ReadOptions = {}): Promise<string | Buffer> {
    const { encoding = 'utf-8', start, end } = options;
    
    logger.info('Reading file', { filePath, encoding });
    
    try {
      // If start/end provided, use streams
      if (start !== undefined || end !== undefined) {
        return await this.readPartial(filePath, start, end, encoding);
      }
      
      // Full file read
      if (encoding === 'binary') {
        return await fs.readFile(filePath);
      } else {
        return await fs.readFile(filePath, encoding);
      }
    } catch (error) {
      logger.error('File read failed', { filePath, error });
      throw new Error(`FILE_READ_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * Read partial file contents
   */
  private async readPartial(
    filePath: string,
    start: number | undefined,
    end: number | undefined,
    encoding: BufferEncoding | 'binary'
  ): Promise<string | Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = fss.createReadStream(filePath, {
        start,
        end: end !== undefined ? end - 1 : undefined, // end is inclusive in createReadStream
      });
      
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (encoding === 'binary') {
          resolve(buffer);
        } else {
          resolve(buffer.toString(encoding));
        }
      });
      
      stream.on('error', reject);
    });
  }
  
  /**
   * Write file contents
   * 
   * @param filePath - Path to file
   * @param content - Content to write
   * @param options - Write options
   */
  async write(
    filePath: string,
    content: string | Buffer,
    options: WriteOptions = {}
  ): Promise<void> {
    const { encoding = 'utf-8', mode = 'overwrite' } = options;
    
    logger.info('Writing file', { filePath, mode, size: content.length });
    
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      if (mode === 'append') {
        await fs.appendFile(filePath, content, encoding === 'binary' ? undefined : encoding);
      } else {
        await fs.writeFile(filePath, content, encoding === 'binary' ? undefined : encoding);
      }
      
      logger.info('File written', { filePath });
    } catch (error) {
      logger.error('File write failed', { filePath, error });
      throw new Error(`FILE_WRITE_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * Copy file or directory
   * 
   * @param source - Source path
   * @param destination - Destination path
   * @param options - Copy options
   */
  async copy(source: string, destination: string, options: CopyOptions = {}): Promise<void> {
    const { recursive = false, overwrite = false } = options;
    
    logger.info('Copying', { source, destination, recursive, overwrite });
    
    try {
      const stats = await fs.stat(source);
      
      if (stats.isDirectory()) {
        if (!recursive) {
          throw new Error('Cannot copy directory without recursive option');
        }
        await this.copyDirectory(source, destination, overwrite);
      } else {
        await this.copyFile(source, destination, overwrite);
      }
      
      logger.info('Copy complete', { source, destination });
    } catch (error) {
      logger.error('Copy failed', { source, destination, error });
      throw new Error(`FILE_COPY_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * Copy single file
   */
  private async copyFile(source: string, destination: string, overwrite: boolean): Promise<void> {
    // Check if destination exists
    const destExists = await this.exists(destination);
    if (destExists && !overwrite) {
      throw new Error('Destination file already exists and overwrite=false');
    }
    
    // Create destination directory
    const dir = path.dirname(destination);
    await fs.mkdir(dir, { recursive: true });
    
    // Copy file
    await fs.copyFile(source, destination);
  }
  
  /**
   * Copy directory recursively
   */
  private async copyDirectory(source: string, destination: string, overwrite: boolean): Promise<void> {
    // Create destination directory
    await fs.mkdir(destination, { recursive: true });
    
    // Read source directory
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    // Copy each entry
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath, overwrite);
      } else {
        await this.copyFile(sourcePath, destPath, overwrite);
      }
    }
  }
  
  /**
   * Move/rename file or directory
   * 
   * @param source - Source path
   * @param destination - Destination path
   * @param overwrite - Overwrite if destination exists
   */
  async move(source: string, destination: string, overwrite = false): Promise<void> {
    logger.info('Moving', { source, destination, overwrite });
    
    try {
      // Check if destination exists
      try {
        await fs.access(destination);
        if (!overwrite) {
          throw new Error('Destination already exists and overwrite=false');
        }
        // Delete destination
        await this.delete(destination, true);
      } catch {
        // Destination doesn't exist, safe to move
      }
      
      // Create destination directory
      const dir = path.dirname(destination);
      await fs.mkdir(dir, { recursive: true });
      
      // Move file/directory
      await fs.rename(source, destination);
      
      logger.info('Move complete', { source, destination });
    } catch (error) {
      logger.error('Move failed', { source, destination, error });
      throw new Error(`FILE_MOVE_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * Delete file or directory
   * 
   * @param filePath - Path to delete
   * @param recursive - Delete directories recursively
   */
  async delete(filePath: string, recursive = false): Promise<void> {
    logger.info('Deleting', { filePath, recursive });
    
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        if (!recursive) {
          throw new Error('Cannot delete directory without recursive option');
        }
        await fs.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.unlink(filePath);
      }
      
      logger.info('Delete complete', { filePath });
    } catch (error) {
      logger.error('Delete failed', { filePath, error });
      throw new Error(`FILE_DELETE_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * List directory contents
   * 
   * @param dirPath - Directory path
   * @param recursive - List recursively
   * @param pattern - Glob pattern
   * @returns File list
   */
  async list(
    dirPath: string,
    recursive = false,
    pattern?: string
  ): Promise<FileListResult[]> {
    logger.info('Listing directory', { dirPath, recursive, pattern });
    
    try {
      let files: string[];
      
      if (pattern) {
        // Use glob for pattern matching
        files = await glob(pattern, {
          cwd: dirPath,
          dot: false,
          absolute: false,
        });
      } else if (recursive) {
        // Use glob for recursive listing
        files = await glob('**/*', {
          cwd: dirPath,
          dot: false,
          absolute: false,
        });
      } else {
        // Simple directory read
        files = await fs.readdir(dirPath);
      }
      
      // Get stats for each file
      const results: FileListResult[] = [];
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        try {
          const stats = await fs.stat(fullPath);
          results.push({
            path: fullPath,
            name: file,
            isDirectory: stats.isDirectory(),
            size: stats.isFile() ? stats.size : undefined,
          });
        } catch {
          // Skip files that can't be accessed
        }
      }
      
      logger.info('List complete', { dirPath, count: results.length });
      return results;
    } catch (error) {
      logger.error('List failed', { dirPath, error });
      throw new Error(`FILE_LIST_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get file statistics
   * 
   * @param filePath - Path to file
   * @returns File statistics
   */
  async stat(filePath: string): Promise<FileStats> {
    logger.info('Getting file stats', { filePath });
    
    try {
      const stats = await fs.stat(filePath);
      
      // Get permissions as octal string
      const permissions = (stats.mode & parseInt('777', 8)).toString(8);
      
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        permissions,
      };
    } catch (error) {
      logger.error('Stat failed', { filePath, error });
      throw new Error(`FILE_STAT_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * Check if file/directory exists
   * 
   * @param filePath - Path to check
   * @returns True if exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Create directory
   * 
   * @param dirPath - Directory path
   * @param recursive - Create parent directories
   */
  async mkdir(dirPath: string, recursive = true): Promise<void> {
    logger.info('Creating directory', { dirPath, recursive });
    
    try {
      await fs.mkdir(dirPath, { recursive });
      logger.info('Directory created', { dirPath });
    } catch (error) {
      logger.error('Mkdir failed', { dirPath, error });
      throw new Error(`FILE_MKDIR_FAILED: ${(error as Error).message}`);
    }
  }
}

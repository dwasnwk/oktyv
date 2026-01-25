import archiver from 'archiver';
import unzipper from 'unzipper';
import * as tar from 'tar';
import * as zlib from 'zlib';
import fs from 'fs';
import fss from 'fs/promises';
import path from 'path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('archive-manager');

export type ArchiveFormat = 'zip' | 'tar' | 'tar.gz';

export interface CreateArchiveOptions {
  format: ArchiveFormat;
  sources: string[];
  destination: string;
}

export interface ExtractArchiveOptions {
  archive: string;
  destination: string;
  format?: ArchiveFormat; // Auto-detect if not provided
}

export interface ArchiveEntry {
  path: string;
  size: number;
  isDirectory: boolean;
}

/**
 * Archive and compression manager
 */
export class ArchiveManager {
  /**
   * Initialize archive manager
   */
  constructor() {
    logger.info('Archive manager initialized');
  }
  
  /**
   * Create archive
   * 
   * @param options - Archive options
   */
  async create(options: CreateArchiveOptions): Promise<void> {
    const { format, sources, destination } = options;
    
    logger.info('Creating archive', { format, sources, destination });
    
    try {
      if (format === 'zip') {
        await this.createZip(sources, destination);
      } else if (format === 'tar') {
        await this.createTar(sources, destination, false);
      } else if (format === 'tar.gz') {
        await this.createTar(sources, destination, true);
      }
      
      logger.info('Archive created', { destination });
    } catch (error) {
      logger.error('Archive creation failed', { error });
      throw new Error(`ARCHIVE_CREATE_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create ZIP archive
   */
  private async createZip(sources: string[], destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(destination);
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });
      
      output.on('close', () => {
        resolve();
      });
      
      archive.on('error', (error: Error) => {
        reject(error);
      });
      
      archive.pipe(output);
      
      // Add each source
      for (const source of sources) {
        const stats = fs.statSync(source);
        if (stats.isDirectory()) {
          archive.directory(source, path.basename(source));
        } else {
          archive.file(source, { name: path.basename(source) });
        }
      }
      
      archive.finalize();
    });
  }
  
  /**
   * Create TAR archive (optionally gzipped)
   */
  private async createTar(
    sources: string[],
    destination: string,
    gzip: boolean
  ): Promise<void> {
    // Extract basenames for tar to avoid full path nesting
    const basenames = sources.map(s => path.basename(s));
    const cwd = path.dirname(sources[0]); // Assume all in same directory
    
    const options: any = {
      gzip,
      file: destination,
      cwd,
    };
    
    await tar.create(options, basenames);
  }
  
  /**
   * Extract archive
   * 
   * @param options - Extract options
   */
  async extract(options: ExtractArchiveOptions): Promise<void> {
    const { archive, destination, format } = options;
    
    logger.info('Extracting archive', { archive, destination, format });
    
    try {
      // Auto-detect format if not provided
      const detectedFormat = format || this.detectFormat(archive);
      
      if (detectedFormat === 'zip') {
        await this.extractZip(archive, destination);
      } else if (detectedFormat === 'tar' || detectedFormat === 'tar.gz') {
        await this.extractTar(archive, destination);
      }
      
      logger.info('Archive extracted', { destination });
    } catch (error) {
      logger.error('Archive extraction failed', { error });
      throw new Error(`ARCHIVE_EXTRACT_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * Extract ZIP archive
   */
  private async extractZip(archive: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.createReadStream(archive)
        .pipe(unzipper.Extract({ path: destination }) as any)
        .on('close', () => resolve())
        .on('error', reject);
    });
  }
  
  /**
   * Extract TAR archive (handles .tar and .tar.gz)
   */
  private async extractTar(archive: string, destination: string): Promise<void> {
    // Create destination directory if it doesn't exist
    await fss.mkdir(destination, { recursive: true });
    
    await tar.extract({
      file: archive,
      cwd: destination,
    });
  }
  
  /**
   * List archive contents
   * 
   * @param archivePath - Path to archive
   * @param format - Archive format (auto-detect if not provided)
   * @returns List of entries
   */
  async list(archivePath: string, format?: ArchiveFormat): Promise<ArchiveEntry[]> {
    logger.info('Listing archive contents', { archivePath, format });
    
    try {
      const detectedFormat = format || this.detectFormat(archivePath);
      
      if (detectedFormat === 'zip') {
        return await this.listZip(archivePath);
      } else if (detectedFormat === 'tar' || detectedFormat === 'tar.gz') {
        return await this.listTar(archivePath);
      }
      
      return [];
    } catch (error) {
      logger.error('Archive listing failed', { error });
      throw new Error(`ARCHIVE_LIST_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * List ZIP archive contents
   */
  private async listZip(archivePath: string): Promise<ArchiveEntry[]> {
    return new Promise((resolve, reject) => {
      const entries: ArchiveEntry[] = [];
      
      fs.createReadStream(archivePath)
        .pipe(unzipper.Parse() as any)
        .on('entry', (entry: any) => {
          entries.push({
            path: entry.path,
            size: entry.vars.uncompressedSize,
            isDirectory: entry.type === 'Directory',
          });
          entry.autodrain();
        })
        .on('close', () => resolve(entries))
        .on('error', reject);
    });
  }
  
  /**
   * List TAR archive contents
   */
  private async listTar(archivePath: string): Promise<ArchiveEntry[]> {
    const entries: ArchiveEntry[] = [];
    
    await tar.list({
      file: archivePath,
      onentry: (entry) => {
        entries.push({
          path: entry.path,
          size: entry.size,
          isDirectory: entry.type === 'Directory',
        });
      },
    });
    
    return entries;
  }
  
  /**
   * Detect archive format from file extension
   */
  private detectFormat(filePath: string): ArchiveFormat {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.zip') {
      return 'zip';
    } else if (ext === '.gz' && filePath.endsWith('.tar.gz')) {
      return 'tar.gz';
    } else if (ext === '.tar') {
      return 'tar';
    }
    
    // Default to zip
    return 'zip';
  }
  
  /**
   * Compress single file with gzip
   * 
   * @param source - Source file
   * @param destination - Destination file (.gz)
   */
  async compressFile(source: string, destination: string): Promise<void> {
    logger.info('Compressing file', { source, destination });
    
    try {
      const gzip = zlib.createGzip();
      const sourceStream = fs.createReadStream(source);
      const destStream = fs.createWriteStream(destination);
      
      await new Promise<void>((resolve, reject) => {
        sourceStream
          .pipe(gzip)
          .pipe(destStream)
          .on('finish', () => resolve())
          .on('error', reject);
      });
      
      logger.info('File compressed', { destination });
    } catch (error) {
      logger.error('File compression failed', { error });
      throw new Error(`FILE_COMPRESS_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * Decompress gzipped file
   * 
   * @param source - Source file (.gz)
   * @param destination - Destination file
   */
  async decompressFile(source: string, destination: string): Promise<void> {
    logger.info('Decompressing file', { source, destination });
    
    try {
      const gunzip = zlib.createGunzip();
      const sourceStream = fs.createReadStream(source);
      const destStream = fs.createWriteStream(destination);
      
      await new Promise<void>((resolve, reject) => {
        sourceStream
          .pipe(gunzip)
          .pipe(destStream)
          .on('finish', () => resolve())
          .on('error', reject);
      });
      
      logger.info('File decompressed', { destination });
    } catch (error) {
      logger.error('File decompression failed', { error });
      throw new Error(`FILE_DECOMPRESS_FAILED: ${(error as Error).message}`);
    }
  }
}

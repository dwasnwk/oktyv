import { LocalOperations } from './LocalOperations.js';
import { HashManager } from './HashManager.js';
import { ArchiveManager } from './ArchiveManager.js';
import { WatchManager } from './WatchManager.js';
import { CloudStorage } from './CloudStorage.js';
import { BatchProcessor } from './BatchProcessor.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('file-engine');

/**
 * File Engine - Main orchestrator for file operations
 */
export class FileEngine {
  public local: LocalOperations;
  public hash: HashManager;
  public archive: ArchiveManager;
  public watch: WatchManager;
  public cloud: CloudStorage;
  public batch: BatchProcessor;
  
  /**
   * Initialize File Engine
   */
  constructor() {
    logger.info('File Engine initializing');
    
    this.local = new LocalOperations();
    this.hash = new HashManager();
    this.archive = new ArchiveManager();
    this.watch = new WatchManager();
    this.cloud = new CloudStorage();
    this.batch = new BatchProcessor();
    
    logger.info('File Engine initialized');
  }
  
  /**
   * Health check
   * 
   * @returns True if healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - verify managers are initialized
      return !!(
        this.local &&
        this.hash &&
        this.archive &&
        this.watch &&
        this.cloud &&
        this.batch
      );
    } catch {
      return false;
    }
  }
}

import chokidar, { FSWatcher } from 'chokidar';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('watch-manager');

export type WatchEvent = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

export interface WatchOptions {
  recursive?: boolean;
  events?: WatchEvent[];
  debounce?: number; // ms
  ignored?: string | string[];
}

export type WatchCallback = (event: WatchEvent, path: string) => void;

interface WatchSession {
  id: string;
  watcher: FSWatcher;
  callback: WatchCallback;
  debounceTimers: Map<string, NodeJS.Timeout>;
}

/**
 * File system watch manager
 */
export class WatchManager {
  private sessions: Map<string, WatchSession> = new Map();
  
  /**
   * Initialize watch manager
   */
  constructor() {
    logger.info('Watch manager initialized');
  }
  
  /**
   * Start watching paths
   * 
   * @param watchId - Unique watch ID
   * @param paths - Paths to watch
   * @param callback - Event callback
   * @param options - Watch options
   */
  watch(
    watchId: string,
    paths: string[],
    callback: WatchCallback,
    options: WatchOptions = {}
  ): void {
    const {
      recursive = true,
      events = ['add', 'change', 'unlink', 'addDir', 'unlinkDir'],
      debounce = 0,
      ignored,
    } = options;
    
    logger.info('Starting watch', { watchId, paths, recursive, debounce });
    
    // Check if watch already exists
    if (this.sessions.has(watchId)) {
      throw new Error(`Watch session already exists: ${watchId}`);
    }
    
    // Create watcher
    const watcher = chokidar.watch(paths, {
      persistent: true,
      ignoreInitial: true,
      ignored,
      depth: recursive ? undefined : 0,
    });
    
    // Create session
    const session: WatchSession = {
      id: watchId,
      watcher,
      callback,
      debounceTimers: new Map(),
    };
    
    // Set up event handlers
    const handleEvent = (event: WatchEvent, path: string) => {
      if (!events.includes(event)) {
        return; // Filter out unwanted events
      }
      
      if (debounce > 0) {
        // Debounce the event
        const existingTimer = session.debounceTimers.get(path);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        const timer = setTimeout(() => {
          callback(event, path);
          session.debounceTimers.delete(path);
        }, debounce);
        
        session.debounceTimers.set(path, timer);
      } else {
        // Immediate callback
        callback(event, path);
      }
    };
    
    watcher.on('add', (path) => handleEvent('add', path));
    watcher.on('change', (path) => handleEvent('change', path));
    watcher.on('unlink', (path) => handleEvent('unlink', path));
    watcher.on('addDir', (path) => handleEvent('addDir', path));
    watcher.on('unlinkDir', (path) => handleEvent('unlinkDir', path));
    
    watcher.on('error', (error) => {
      logger.error('Watch error', { watchId, error });
    });
    
    watcher.on('ready', () => {
      logger.info('Watch ready', { watchId });
    });
    
    this.sessions.set(watchId, session);
  }
  
  /**
   * Stop watching
   * 
   * @param watchId - Watch ID to stop
   */
  async unwatch(watchId: string): Promise<void> {
    logger.info('Stopping watch', { watchId });
    
    const session = this.sessions.get(watchId);
    if (!session) {
      throw new Error(`Watch session not found: ${watchId}`);
    }
    
    // Clear all debounce timers
    for (const timer of session.debounceTimers.values()) {
      clearTimeout(timer);
    }
    session.debounceTimers.clear();
    
    // Close watcher
    await session.watcher.close();
    
    // Remove session
    this.sessions.delete(watchId);
    
    logger.info('Watch stopped', { watchId });
  }
  
  /**
   * Get list of active watch sessions
   * 
   * @returns Array of watch IDs
   */
  listWatches(): string[] {
    return Array.from(this.sessions.keys());
  }
  
  /**
   * Check if watch exists
   * 
   * @param watchId - Watch ID
   * @returns True if exists
   */
  hasWatch(watchId: string): boolean {
    return this.sessions.has(watchId);
  }
  
  /**
   * Stop all watches
   */
  async unwatchAll(): Promise<void> {
    logger.info('Stopping all watches', { count: this.sessions.size });
    
    const promises = Array.from(this.sessions.keys()).map((id) =>
      this.unwatch(id)
    );
    
    await Promise.all(promises);
  }
}

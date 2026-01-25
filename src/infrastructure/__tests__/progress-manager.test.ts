import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProgressManager } from '../progress-manager.js';

describe('ProgressManager', () => {
  let progress: ProgressManager;

  beforeEach(() => {
    progress = new ProgressManager({
      spinners: true,
      bars: true,
    });
    
    // Mock console methods to prevent actual output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Spinner Operations', () => {
    it('should start spinner', () => {
      expect(() => {
        progress.startSpinner('Loading...');
      }).not.toThrow();
    });

    it('should update spinner text', () => {
      progress.startSpinner('Loading...');
      
      expect(() => {
        progress.updateSpinner('Still loading...');
      }).not.toThrow();
    });

    it('should succeed spinner', () => {
      progress.startSpinner('Processing...');
      
      expect(() => {
        progress.succeedSpinner('Complete!');
      }).not.toThrow();
    });

    it('should fail spinner', () => {
      progress.startSpinner('Processing...');
      
      expect(() => {
        progress.failSpinner('Failed!');
      }).not.toThrow();
    });

    it('should warn spinner', () => {
      progress.startSpinner('Processing...');
      
      expect(() => {
        progress.warnSpinner('Warning!');
      }).not.toThrow();
    });

    it('should info spinner', () => {
      progress.startSpinner('Processing...');
      
      expect(() => {
        progress.infoSpinner('Info!');
      }).not.toThrow();
    });

    it('should stop spinner', () => {
      progress.startSpinner('Loading...');
      
      expect(() => {
        progress.stopSpinner();
      }).not.toThrow();
    });
  });

  describe('Progress Bar Operations', () => {
    it('should start progress bar', () => {
      expect(() => {
        progress.startProgress(100, 'Downloading');
      }).not.toThrow();
    });

    it('should update progress bar', () => {
      progress.startProgress(100, 'Processing');
      
      expect(() => {
        progress.updateProgress(50);
      }).not.toThrow();
    });

    it('should increment progress bar', () => {
      progress.startProgress(100, 'Processing');
      
      expect(() => {
        progress.incrementProgress();
        progress.incrementProgress(5);
      }).not.toThrow();
    });

    it('should stop progress bar', () => {
      progress.startProgress(100, 'Processing');
      
      expect(() => {
        progress.stopProgress();
      }).not.toThrow();
    });
  });

  describe('Spinner Disabled', () => {
    beforeEach(() => {
      progress = new ProgressManager({
        spinners: false,
        bars: true,
      });
    });

    it('should not throw when starting spinner while disabled', () => {
      expect(() => {
        progress.startSpinner('Loading...');
      }).not.toThrow();
    });

    it('should not throw when updating spinner while disabled', () => {
      expect(() => {
        progress.updateSpinner('Still loading...');
      }).not.toThrow();
    });

    it('should not throw when succeeding spinner while disabled', () => {
      expect(() => {
        progress.succeedSpinner('Complete!');
      }).not.toThrow();
    });

    it('should not throw when failing spinner while disabled', () => {
      expect(() => {
        progress.failSpinner('Failed!');
      }).not.toThrow();
    });
  });

  describe('Progress Bar Disabled', () => {
    beforeEach(() => {
      progress = new ProgressManager({
        spinners: true,
        bars: false,
      });
    });

    it('should not throw when starting progress while disabled', () => {
      expect(() => {
        progress.startProgress(100, 'Processing');
      }).not.toThrow();
    });

    it('should not throw when updating progress while disabled', () => {
      expect(() => {
        progress.updateProgress(50);
      }).not.toThrow();
    });

    it('should not throw when incrementing progress while disabled', () => {
      expect(() => {
        progress.incrementProgress();
      }).not.toThrow();
    });

    it('should not throw when stopping progress while disabled', () => {
      expect(() => {
        progress.stopProgress();
      }).not.toThrow();
    });
  });

  describe('Both Disabled', () => {
    beforeEach(() => {
      progress = new ProgressManager({
        spinners: false,
        bars: false,
      });
    });

    it('should handle all operations as no-ops', () => {
      expect(() => {
        progress.startSpinner('Test');
        progress.updateSpinner('Update');
        progress.succeedSpinner('Success');
        
        progress.startProgress(100, 'Test');
        progress.updateProgress(50);
        progress.incrementProgress();
        progress.stopProgress();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle starting multiple spinners sequentially', () => {
      progress.startSpinner('First');
      progress.succeedSpinner('First done');
      
      expect(() => {
        progress.startSpinner('Second');
        progress.succeedSpinner('Second done');
      }).not.toThrow();
    });

    it('should handle updating spinner without starting', () => {
      // Should not throw (graceful no-op)
      expect(() => {
        progress.updateSpinner('Update without start');
      }).not.toThrow();
    });

    it('should handle succeeding spinner without starting', () => {
      // Should not throw (graceful no-op)
      expect(() => {
        progress.succeedSpinner('Success without start');
      }).not.toThrow();
    });

    it('should handle updating progress without starting', () => {
      // Should not throw (graceful no-op)
      expect(() => {
        progress.updateProgress(50);
      }).not.toThrow();
    });

    it('should handle incrementing progress without starting', () => {
      // Should not throw (graceful no-op)
      expect(() => {
        progress.incrementProgress();
      }).not.toThrow();
    });

    it('should handle progress update beyond total', () => {
      progress.startProgress(100, 'Test');
      
      expect(() => {
        progress.updateProgress(150);
      }).not.toThrow();
    });

    it('should handle negative progress values', () => {
      progress.startProgress(100, 'Test');
      
      expect(() => {
        progress.updateProgress(-10);
      }).not.toThrow();
    });

    it('should handle zero total for progress bar', () => {
      expect(() => {
        progress.startProgress(0, 'Test');
      }).not.toThrow();
    });

    it('should handle empty spinner text', () => {
      expect(() => {
        progress.startSpinner('');
      }).not.toThrow();
    });

    it('should handle empty progress label', () => {
      expect(() => {
        progress.startProgress(100, '');
      }).not.toThrow();
    });
  });

  describe('Lifecycle Management', () => {
    it('should clean up spinner on success', () => {
      progress.startSpinner('Processing');
      progress.succeedSpinner('Done');
      
      // Should be able to start a new spinner
      expect(() => {
        progress.startSpinner('New task');
      }).not.toThrow();
    });

    it('should clean up spinner on failure', () => {
      progress.startSpinner('Processing');
      progress.failSpinner('Error');
      
      // Should be able to start a new spinner
      expect(() => {
        progress.startSpinner('New task');
      }).not.toThrow();
    });

    it('should clean up progress bar on stop', () => {
      progress.startProgress(100, 'Task 1');
      progress.stopProgress();
      
      // Should be able to start a new progress bar
      expect(() => {
        progress.startProgress(50, 'Task 2');
      }).not.toThrow();
    });
  });

  describe('Typical Usage Patterns', () => {
    it('should handle successful workflow with spinner', () => {
      expect(() => {
        progress.startSpinner('Connecting...');
        progress.updateSpinner('Authenticating...');
        progress.updateSpinner('Loading data...');
        progress.succeedSpinner('Connected successfully');
      }).not.toThrow();
    });

    it('should handle failed workflow with spinner', () => {
      expect(() => {
        progress.startSpinner('Connecting...');
        progress.updateSpinner('Authenticating...');
        progress.failSpinner('Authentication failed');
      }).not.toThrow();
    });

    it('should handle progress bar workflow', () => {
      expect(() => {
        progress.startProgress(100, 'Downloading files');
        for (let i = 0; i < 10; i++) {
          progress.incrementProgress(10);
        }
        progress.stopProgress();
      }).not.toThrow();
    });

    it('should handle mixed spinner and progress', () => {
      expect(() => {
        // Spinner first
        progress.startSpinner('Initializing...');
        progress.succeedSpinner('Ready');
        
        // Then progress bar
        progress.startProgress(50, 'Processing items');
        progress.updateProgress(25);
        progress.incrementProgress(25);
        progress.stopProgress();
        
        // Then spinner again
        progress.startSpinner('Finalizing...');
        progress.succeedSpinner('Complete');
      }).not.toThrow();
    });
  });
});

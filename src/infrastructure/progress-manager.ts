/**
 * Progress Manager
 * Manages multiple concurrent spinners and progress bars
 * Provides user-friendly progress indicators for CLI operations
 */

import ora, { Ora } from 'ora';

export interface ProgressConfig {
  spinners: boolean;
  bars: boolean;
}

interface SpinnerState {
  id: string;
  instance?: Ora;
  active: boolean;
}

interface BarState {
  id: string;
  total: number;
  current: number;
  active: boolean;
}

/**
 * Progress Manager  
 * Manages spinners and progress bars with ID-based tracking
 * Supports both legacy single-spinner API and new multi-spinner API
 */
export class ProgressManager {
  private config: ProgressConfig;
  private spinners: Map<string, SpinnerState> = new Map();
  private bars: Map<string, BarState> = new Map();
  private spinnerCounter: number = 0;
  private barCounter: number = 0;
  private currentSpinnerId: string | null = null; // For legacy API

  constructor(config: ProgressConfig) {
    this.config = config;
  }

  /**
   * Start a spinner with text
   * @returns Spinner ID for future operations
   */
  public startSpinner(text: string): string {
    const id = `spinner-${this.spinnerCounter++}`;
    
    if (this.config.spinners) {
      const instance = ora({
        text,
        color: 'cyan',
      }).start();
      
      this.spinners.set(id, { id, instance, active: true });
    } else {
      // Spinners disabled - track ID but don't create instance
      this.spinners.set(id, { id, instance: undefined, active: false });
    }
    
    this.currentSpinnerId = id; // Track for legacy API
    return id;
  }

  /**
   * Update spinner text
   * Legacy API: updates current spinner if no ID provided
   */
  public updateSpinner(idOrText: string, text?: string): void {
    const id = text !== undefined ? idOrText : this.currentSpinnerId;
    const updateText = text !== undefined ? text : idOrText;
    
    if (!id) return;
    
    const spinner = this.spinners.get(id);
    if (!spinner || !spinner.instance) return;
    
    spinner.instance.text = updateText;
  }

  /**
   * Mark spinner as succeeded
   * Legacy API: succeeds current spinner if no ID provided
   */
  public succeedSpinner(idOrText?: string, text?: string): void {
    const id = text !== undefined ? idOrText : this.currentSpinnerId;
    const successText = text !== undefined ? text : idOrText;
    
    if (!id) return;
    
    const spinner = this.spinners.get(id);
    if (!spinner) return;
    
    if (spinner.instance) {
      spinner.instance.succeed(successText);
    }
    
    spinner.active = false;
    this.spinners.delete(id);
    
    if (id === this.currentSpinnerId) {
      this.currentSpinnerId = null;
    }
  }

  /**
   * Mark spinner as failed
   * Legacy API: fails current spinner if no ID provided
   */
  public failSpinner(idOrText?: string, text?: string): void {
    const id = text !== undefined ? idOrText : this.currentSpinnerId;
    const failText = text !== undefined ? text : idOrText;
    
    if (!id) return;
    
    const spinner = this.spinners.get(id);
    if (!spinner) return;
    
    if (spinner.instance) {
      spinner.instance.fail(failText);
    }
    
    spinner.active = false;
    this.spinners.delete(id);
    
    if (id === this.currentSpinnerId) {
      this.currentSpinnerId = null;
    }
  }

  /**
   * Mark spinner with warning
   */
  public warnSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (!spinner) return;
    
    if (spinner.instance) {
      spinner.instance.warn(text);
    }
    
    spinner.active = false;
    this.spinners.delete(id);
  }

  /**
   * Mark spinner with info
   */
  public infoSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (!spinner) return;
    
    if (spinner.instance) {
      spinner.instance.info(text);
    }
    
    spinner.active = false;
    this.spinners.delete(id);
  }

  /**
   * Stop spinner without status
   */
  public stopSpinner(id?: string): void {
    const spinnerId = id || this.currentSpinnerId;
    if (!spinnerId) return;
    
    const spinner = this.spinners.get(spinnerId);
    if (!spinner) return;
    
    if (spinner.instance) {
      spinner.instance.stop();
    }
    
    spinner.active = false;
    this.spinners.delete(spinnerId);
    
    if (spinnerId === this.currentSpinnerId) {
      this.currentSpinnerId = null;
    }
  }

  /**
   * Check if any spinner is currently active
   */
  public hasActiveSpinner(): boolean {
    for (const spinner of this.spinners.values()) {
      if (spinner.active) return true;
    }
    return false;
  }

  /**
   * Start a progress bar
   * @param total - Total items to process
   * @param label - Label for the progress bar
   * @returns Bar ID for future operations
   */
  public startProgress(total: number, _label: string): string {
    const id = `bar-${this.barCounter++}`;
    
    if (this.config.bars) {
      // Note: cli-progress doesn't support multiple concurrent bars well
      // For now, we'll track the state but use a simplified implementation
      this.bars.set(id, { id, total, current: 0, active: true });
    } else {
      // Bars disabled - track ID but don't create instance
      this.bars.set(id, { id, total, current: 0, active: false });
    }
    
    return id;
  }

  /**
   * Update progress bar to specific value
   */
  public updateProgress(id: string, current: number): void {
    const bar = this.bars.get(id);
    if (!bar) return;
    
    bar.current = Math.min(current, bar.total);
  }

  /**
   * Increment progress bar by amount
   */
  public incrementProgress(id: string, amount: number = 1): void {
    const bar = this.bars.get(id);
    if (!bar) return;
    
    bar.current = Math.min(bar.current + amount, bar.total);
  }

  /**
   * Stop progress bar
   */
  public stopProgress(id: string): void {
    const bar = this.bars.get(id);
    if (!bar) return;
    
    bar.active = false;
    this.bars.delete(id);
  }

  /**
   * Check if any progress bar is currently active
   */
  public hasActiveBar(): boolean {
    for (const bar of this.bars.values()) {
      if (bar.active) return true;
    }
    return false;
  }

  /**
   * Stop all spinners and progress bars
   */
  public stopAll(): void {
    // Stop all spinners
    for (const spinner of this.spinners.values()) {
      if (spinner.instance) {
        spinner.instance.stop();
      }
    }
    this.spinners.clear();
    this.currentSpinnerId = null;
    
    // Stop all bars
    this.bars.clear();
  }
}

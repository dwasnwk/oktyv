/**
 * Progress Manager
 * Wraps ora (spinners) and cli-progress (bars) for visual feedback
 * Provides user-friendly progress indicators for CLI operations
 */

import ora, { Ora } from 'ora';
import cliProgress from 'cli-progress';
import { config } from './config-manager.js';
import { logger } from '../utils/logger.js';

/**
 * Progress Manager
 * Manages spinners and progress bars for CLI feedback
 */
export class ProgressManager {
  private spinner?: Ora;
  private progressBar?: cliProgress.SingleBar;
  private spinnersEnabled: boolean;
  private barsEnabled: boolean;

  constructor() {
    const progressConfig = config.getProgressConfig();
    this.spinnersEnabled = progressConfig.spinners;
    this.barsEnabled = progressConfig.bars;

    logger.info('ProgressManager initialized', {
      spinners: this.spinnersEnabled,
      bars: this.barsEnabled,
    });
  }

  /**
   * Start a spinner with text
   */
  public startSpinner(text: string): void {
    if (!this.spinnersEnabled) return;

    this.spinner = ora({
      text,
      color: 'cyan',
    }).start();
  }

  /**
   * Update spinner text
   */
  public updateSpinner(text: string): void {
    if (!this.spinnersEnabled || !this.spinner) return;
    this.spinner.text = text;
  }

  /**
   * Mark spinner as succeeded
   */
  public succeedSpinner(text?: string): void {
    if (!this.spinnersEnabled || !this.spinner) return;
    this.spinner.succeed(text);
    this.spinner = undefined;
  }

  /**
   * Mark spinner as failed
   */
  public failSpinner(text?: string): void {
    if (!this.spinnersEnabled || !this.spinner) return;
    this.spinner.fail(text);
    this.spinner = undefined;
  }

  /**
   * Stop spinner without success/fail
   */
  public stopSpinner(): void {
    if (!this.spinnersEnabled || !this.spinner) return;
    this.spinner.stop();
    this.spinner = undefined;
  }

  /**
   * Start a progress bar
   */
  public startProgress(total: number, label: string): void {
    if (!this.barsEnabled) return;

    this.progressBar = new cliProgress.SingleBar({
      format: `${label} | {bar} | {percentage}% | {value}/{total}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    this.progressBar.start(total, 0);
  }

  /**
   * Update progress bar current value
   */
  public updateProgress(current: number): void {
    if (!this.barsEnabled || !this.progressBar) return;
    this.progressBar.update(current);
  }

  /**
   * Increment progress bar by 1
   */
  public incrementProgress(): void {
    if (!this.barsEnabled || !this.progressBar) return;
    this.progressBar.increment();
  }

  /**
   * Stop progress bar
   */
  public stopProgress(): void {
    if (!this.barsEnabled || !this.progressBar) return;
    this.progressBar.stop();
    this.progressBar = undefined;
  }

  /**
   * Enable spinners
   */
  public enableSpinners(): void {
    this.spinnersEnabled = true;
    logger.info('Spinners enabled');
  }

  /**
   * Disable spinners
   */
  public disableSpinners(): void {
    this.spinnersEnabled = false;
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = undefined;
    }
    logger.info('Spinners disabled');
  }

  /**
   * Enable progress bars
   */
  public enableBars(): void {
    this.barsEnabled = true;
    logger.info('Progress bars enabled');
  }

  /**
   * Disable progress bars
   */
  public disableBars(): void {
    this.barsEnabled = false;
    if (this.progressBar) {
      this.progressBar.stop();
      this.progressBar = undefined;
    }
    logger.info('Progress bars disabled');
  }

  /**
   * Check if spinners are enabled
   */
  public areSpinnersEnabled(): boolean {
    return this.spinnersEnabled;
  }

  /**
   * Check if bars are enabled
   */
  public areBarsEnabled(): boolean {
    return this.barsEnabled;
  }
}

// Export singleton instance
export const progress = new ProgressManager();

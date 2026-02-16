import { createLogger } from '@nexus/shared';

const logger = createLogger('FlowController');

/**
 * Flow control configuration
 */
export interface FlowControlConfig {
  maxBufferSize: number; // bytes
  highWaterMark: number; // percentage (0-100)
  lowWaterMark: number; // percentage (0-100)
}

/**
 * Flow Controller - Handles backpressure and flow control
 */
export class FlowController {
  private bufferSize: number = 0;
  private paused: boolean = false;
  private config: FlowControlConfig;

  constructor(config: Partial<FlowControlConfig> = {}) {
    this.config = {
      maxBufferSize: config.maxBufferSize || 10 * 1024 * 1024, // 10MB
      highWaterMark: config.highWaterMark || 80,
      lowWaterMark: config.lowWaterMark || 20,
    };
  }

  /**
   * Write data and check backpressure
   */
  public write(dataSize: number): boolean {
    this.bufferSize += dataSize;

    if (!this.paused && this.bufferSize > (this.config.maxBufferSize * this.config.highWaterMark) / 100) {
      this.paused = true;
      logger.warn('Flow control: pause (high water mark reached)', {
        bufferSize: this.bufferSize,
        maxSize: this.config.maxBufferSize,
      });
      return false; // Backpressure
    }

    return true;
  }

  /**
   * Mark data as flushed
   */
  public drain(dataSize: number): boolean {
    this.bufferSize = Math.max(0, this.bufferSize - dataSize);

    if (this.paused && this.bufferSize < (this.config.maxBufferSize * this.config.lowWaterMark) / 100) {
      this.paused = false;
      logger.info('Flow control: resume (low water mark reached)', {
        bufferSize: this.bufferSize,
      });
      return true; // Can resume
    }

    return this.paused;
  }

  /**
   * Check if paused
   */
  public isPaused(): boolean {
    return this.paused;
  }

  /**
   * Get current buffer utilization
   */
  public getUtilization(): number {
    return (this.bufferSize / this.config.maxBufferSize) * 100;
  }

  /**
   * Get stats
   */
  public getStats(): Record<string, unknown> {
    return {
      bufferSize: this.bufferSize,
      maxBufferSize: this.config.maxBufferSize,
      utilization: this.getUtilization(),
      paused: this.paused,
      highWaterMark: this.config.highWaterMark,
      lowWaterMark: this.config.lowWaterMark,
    };
  }

  /**
   * Reset controller
   */
  public reset(): void {
    this.bufferSize = 0;
    this.paused = false;
    logger.debug('Flow controller reset');
  }
}

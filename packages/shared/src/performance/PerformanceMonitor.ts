import { createLogger } from '../utils/logger';

const logger = createLogger('PerformanceMonitor');

/**
 * Performance metric
 */
export interface PerformanceMetric {
  name: string;
  duration: number; // milliseconds
  timestamp: Date;
  threshold?: number;
  exceeded: boolean;
}

/**
 * Performance Monitor - Tracks and reports performance metrics
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 100000;
  private thresholds: Map<string, number> = new Map();

  /**
   * Start measuring
   */
  public startMeasure(name: string): () => void {
    const startTime = Date.now();

    return () => {
      this.endMeasure(name, startTime);
    };
  }

  /**
   * End measuring
   */
  public endMeasure(name: string, startTime: number): PerformanceMetric {
    const duration = Date.now() - startTime;
    const threshold = this.thresholds.get(name);
    const exceeded = threshold ? duration > threshold : false;

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      threshold,
      exceeded,
    };

    this.metrics.push(metric);

    // Trim old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(this.metrics.length - this.maxMetrics);
    }

    if (exceeded) {
      logger.warn(`Performance threshold exceeded: ${name}`, {
        duration,
        threshold,
      });
    } else {
      logger.debug(`Performance metric recorded: ${name}`, { duration });
    }

    return metric;
  }

  /**
   * Set performance threshold
   */
  public setThreshold(name: string, thresholdMs: number): void {
    this.thresholds.set(name, thresholdMs);
    logger.debug(`Performance threshold set: ${name}`, { thresholdMs });
  }

  /**
   * Get metric statistics
   */
  public getStatistics(name: string): Record<string, number> | undefined {
    const filtered = this.metrics.filter((m) => m.name === name);

    if (filtered.length === 0) {
      return undefined;
    }

    const durations = filtered.map((m) => m.duration);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p95 = this.percentile(durations, 0.95);
    const p99 = this.percentile(durations, 0.99);

    return { min, max, avg, p95, p99, count: durations.length };
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get all metrics
   */
  public getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get exceeded metrics
   */
  public getExceededMetrics(): PerformanceMetric[] {
    return this.metrics.filter((m) => m.exceeded);
  }

  /**
   * Clear metrics
   */
  public clear(): void {
    this.metrics = [];
    logger.info('Performance metrics cleared');
  }
}

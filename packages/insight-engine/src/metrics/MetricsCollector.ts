import { createLogger } from '@nexus/shared';

const logger = createLogger('MetricsCollector');

/**
 * Metric data point
 */
export interface MetricPoint {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

/**
 * Metric series
 */
export interface MetricSeries {
  name: string;
  points: MetricPoint[];
  unit?: string;
}

/**
 * Metrics Collector - Collects and aggregates metrics
 */
export class MetricsCollector {
  private metrics: Map<string, MetricSeries> = new Map();
  private maxDataPoints: number = 10000;

  /**
   * Record metric value
   */
  public recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { name, points: [] });
    }

    const series = this.metrics.get(name)!;
    series.points.push({
      timestamp: new Date(),
      value,
      tags,
    });

    // Trim old points if exceeding max
    if (series.points.length > this.maxDataPoints) {
      series.points = series.points.slice(series.points.length - this.maxDataPoints);
    }

    logger.debug(`Metric recorded: ${name}`, { value });
  }

  /**
   * Get metric series
   */
  public getMetric(name: string): MetricSeries | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get metric statistics
   */
  public getStatistics(name: string): Record<string, number> | undefined {
    const series = this.metrics.get(name);
    if (!series || series.points.length === 0) {
      return undefined;
    }

    const values = series.points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const latest = values[values.length - 1];

    return { min, max, avg, latest, count: values.length };
  }

  /**
   * Get metrics in time range
   */
  public getMetricsInRange(name: string, startTime: Date, endTime: Date): MetricPoint[] {
    const series = this.metrics.get(name);
    if (!series) {
      return [];
    }

    return series.points.filter((p) => p.timestamp >= startTime && p.timestamp <= endTime);
  }

  /**
   * Get all metrics
   */
  public getAllMetrics(): MetricSeries[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metric names
   */
  public getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clear metric
   */
  public clearMetric(name: string): void {
    this.metrics.delete(name);
    logger.debug(`Metric cleared: ${name}`);
  }

  /**
   * Get collector stats
   */
  public getStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {
      totalMetrics: this.metrics.size,
      totalDataPoints: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.points.length, 0),
    };

    return stats;
  }

  /**
   * Clear all metrics
   */
  public clear(): void {
    this.metrics.clear();
    logger.info('All metrics cleared');
  }
}

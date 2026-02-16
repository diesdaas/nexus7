import { createLogger } from '../utils/logger';

const logger = createLogger('SLOTracker');

/**
 * SLO Definition
 */
export interface SLODefinition {
  name: string;
  target: number; // percentage (0-100)
  window: number; // milliseconds
  description: string;
}

/**
 * SLI Measurement
 */
export interface SLIMeasurement {
  name: string;
  value: number;
  timestamp: Date;
}

/**
 * SLO Status
 */
export interface SLOStatus {
  name: string;
  target: number;
  current: number;
  status: 'healthy' | 'warning' | 'violated';
  errorBudget: number; // percentage remaining
}

/**
 * SLO Tracker - Monitors Service Level Objectives
 */
export class SLOTracker {
  private slos: Map<string, SLODefinition> = new Map();
  private measurements: SLIMeasurement[] = [];
  private maxMeasurements: number = 100000;
  private warningThreshold: number = 95; // 95% of target

  /**
   * Register SLO
   */
  public registerSLO(definition: SLODefinition): void {
    this.slos.set(definition.name, definition);
    logger.info(`SLO registered: ${definition.name}`, { target: definition.target });
  }

  /**
   * Record measurement
   */
  public recordMeasurement(name: string, value: number): void {
    const measurement: SLIMeasurement = {
      name,
      value,
      timestamp: new Date(),
    };

    this.measurements.push(measurement);

    // Trim old measurements
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements = this.measurements.slice(
        this.measurements.length - this.maxMeasurements
      );
    }

    logger.debug(`SLI measured: ${name}`, { value });
  }

  /**
   * Get SLO status
   */
  public getStatus(name: string): SLOStatus | undefined {
    const slo = this.slos.get(name);
    if (!slo) {
      return undefined;
    }

    const current = this.calculateCurrentSLI(name, slo.window);
    const errorBudget = ((current - slo.target) / (100 - slo.target)) * 100;

    let status: 'healthy' | 'warning' | 'violated';
    if (current >= slo.target) {
      status = 'healthy';
    } else if (current >= this.warningThreshold) {
      status = 'warning';
    } else {
      status = 'violated';
    }

    return {
      name,
      target: slo.target,
      current,
      status,
      errorBudget: Math.max(0, errorBudget),
    };
  }

  /**
   * Get all SLO statuses
   */
  public getAllStatuses(): SLOStatus[] {
    const statuses: SLOStatus[] = [];

    for (const [name, slo] of this.slos) {
      const status = this.getStatus(name);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  /**
   * Calculate current SLI
   */
  private calculateCurrentSLI(name: string, window: number): number {
    const now = Date.now();
    const windowStart = new Date(now - window);

    const windowMeasurements = this.measurements.filter(
      (m) => m.name === name && m.timestamp >= windowStart
    );

    if (windowMeasurements.length === 0) {
      return 0;
    }

    const avg =
      windowMeasurements.reduce((sum, m) => sum + m.value, 0) / windowMeasurements.length;
    return Math.round(avg * 100) / 100;
  }

  /**
   * Get SLO health report
   */
  public getHealthReport(): Record<string, unknown> {
    const statuses = this.getAllStatuses();
    const healthy = statuses.filter((s) => s.status === 'healthy').length;
    const warning = statuses.filter((s) => s.status === 'warning').length;
    const violated = statuses.filter((s) => s.status === 'violated').length;

    const avgErrorBudget =
      statuses.length > 0
        ? statuses.reduce((sum, s) => sum + s.errorBudget, 0) / statuses.length
        : 0;

    return {
      totalSLOs: statuses.length,
      healthy,
      warning,
      violated,
      healthPercentage: statuses.length > 0 ? (healthy / statuses.length) * 100 : 0,
      avgErrorBudget: avgErrorBudget.toFixed(2),
      slos: statuses.map((s) => ({
        name: s.name,
        status: s.status,
        target: s.target,
        current: s.current,
      })),
    };
  }

  /**
   * Get error budget for SLO
   */
  public getErrorBudget(name: string): number | undefined {
    const status = this.getStatus(name);
    return status ? status.errorBudget : undefined;
  }

  /**
   * Check if SLO is violated
   */
  public isViolated(name: string): boolean {
    const status = this.getStatus(name);
    return status ? status.status === 'violated' : false;
  }

  /**
   * Clear measurements
   */
  public clear(): void {
    this.measurements = [];
    logger.info('SLO measurements cleared');
  }
}

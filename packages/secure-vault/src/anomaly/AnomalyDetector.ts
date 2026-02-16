import { createLogger } from '@nexus/shared';

const logger = createLogger('AnomalyDetector');

/**
 * Anomaly alert
 */
export interface AnomalyAlert {
  id: string;
  timestamp: Date;
  userId: string;
  anomalyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, unknown>;
}

/**
 * Anomaly Detector - Identifies suspicious behavior
 */
export class AnomalyDetector {
  private userActivity: Map<string, { count: number; lastSeen: Date }> = new Map();
  private alerts: AnomalyAlert[] = [];
  private thresholds = {
    failureRateThreshold: 0.5, // 50% failure rate
    activityBurst: 100, // requests in 1 minute
    rapidRoleChange: 10, // scope changes in 1 minute
  };

  /**
   * Detect failed authentication attempts
   */
  public detectFailedAuth(userId: string, failureCount: number): AnomalyAlert | null {
    if (failureCount > 5) {
      return this.createAlert(userId, 'excessive_failed_auth', 'critical', 'Too many failed auth attempts', {
        failureCount,
      });
    }
    return null;
  }

  /**
   * Detect activity burst
   */
  public detectActivityBurst(userId: string, requestCount: number, timeWindowMs: number): AnomalyAlert | null {
    const requestsPerMin = (requestCount / timeWindowMs) * 60000;

    if (requestsPerMin > this.thresholds.activityBurst) {
      return this.createAlert(userId, 'activity_burst', 'high', 'Unusual activity spike detected', {
        requestsPerMinute: requestsPerMin,
        threshold: this.thresholds.activityBurst,
      });
    }
    return null;
  }

  /**
   * Detect rapid scope/permission changes
   */
  public detectRapidPermissionChange(userId: string, changeCount: number): AnomalyAlert | null {
    if (changeCount > this.thresholds.rapidRoleChange) {
      return this.createAlert(
        userId,
        'rapid_permission_change',
        'high',
        'Rapid permission/scope changes detected',
        { changeCount }
      );
    }
    return null;
  }

  /**
   * Detect geographic anomalies (simplified)
   */
  public detectGeographicAnomaly(userId: string, previousLocation: string, newLocation: string): AnomalyAlert | null {
    // Simplified: in production would use IP geolocation
    if (previousLocation && previousLocation !== newLocation) {
      const timeSinceLastLogin = this.getTimeSinceLastActivity(userId);
      if (timeSinceLastLogin && timeSinceLastLogin < 3600000) {
        // 1 hour
        return this.createAlert(userId, 'impossible_travel', 'medium', 'Impossible travel detected', {
          from: previousLocation,
          to: newLocation,
        });
      }
    }
    return null;
  }

  /**
   * Record user activity
   */
  public recordActivity(userId: string): void {
    if (!this.userActivity.has(userId)) {
      this.userActivity.set(userId, { count: 0, lastSeen: new Date() });
    }
    const activity = this.userActivity.get(userId)!;
    activity.count++;
    activity.lastSeen = new Date();
  }

  /**
   * Get time since last activity
   */
  private getTimeSinceLastActivity(userId: string): number | null {
    const activity = this.userActivity.get(userId);
    if (!activity) {
      return null;
    }
    return Date.now() - activity.lastSeen.getTime();
  }

  /**
   * Create alert
   */
  private createAlert(
    userId: string,
    anomalyType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    evidence: Record<string, unknown>
  ): AnomalyAlert {
    const alert: AnomalyAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      anomalyType,
      severity,
      description,
      evidence,
    };

    this.alerts.push(alert);
    logger.warn(`[ANOMALY] ${anomalyType}`, { userId, severity, evidence });

    return alert;
  }

  /**
   * Get alerts by user
   */
  public getAlertsByUser(userId: string): AnomalyAlert[] {
    return this.alerts.filter((a) => a.userId === userId);
  }

  /**
   * Get critical alerts
   */
  public getCriticalAlerts(): AnomalyAlert[] {
    return this.alerts.filter((a) => a.severity === 'critical');
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(count: number = 50): AnomalyAlert[] {
    return this.alerts.slice(Math.max(0, this.alerts.length - count));
  }

  /**
   * Get all alerts
   */
  public getAllAlerts(): AnomalyAlert[] {
    return [...this.alerts];
  }

  /**
   * Get anomaly stats
   */
  public getStats(): Record<string, unknown> {
    const bySeverity = {
      low: this.alerts.filter((a) => a.severity === 'low').length,
      medium: this.alerts.filter((a) => a.severity === 'medium').length,
      high: this.alerts.filter((a) => a.severity === 'high').length,
      critical: this.alerts.filter((a) => a.severity === 'critical').length,
    };

    const byType: Record<string, number> = {};
    for (const alert of this.alerts) {
      byType[alert.anomalyType] = (byType[alert.anomalyType] || 0) + 1;
    }

    return {
      totalAlerts: this.alerts.length,
      bySeverity,
      byType,
      uniqueUsers: new Set(this.alerts.map((a) => a.userId)).size,
    };
  }

  /**
   * Clear alerts
   */
  public clear(): void {
    this.alerts = [];
    this.userActivity.clear();
  }
}

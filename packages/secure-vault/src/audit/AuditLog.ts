import { createLogger } from '@nexus/shared';

const logger = createLogger('AuditLog');

/**
 * Audit log entry
 */
export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  status: 'success' | 'failure';
  details?: Record<string, unknown>;
}

/**
 * Audit Log - Records all security-relevant events
 */
export class AuditLog {
  private entries: AuditEntry[] = [];
  private maxEntries: number = 100000;

  /**
   * Log an event
   */
  public log(
    userId: string,
    action: string,
    resource: string,
    status: 'success' | 'failure' = 'success',
    details?: Record<string, unknown>
  ): AuditEntry {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      action,
      resource,
      status,
      details,
    };

    this.entries.push(entry);

    // Trim old entries if exceeding max
    if (this.entries.length > this.maxEntries) {
      const removed = this.entries.splice(0, this.entries.length - this.maxEntries);
      logger.debug(`Trimmed ${removed.length} old audit entries`);
    }

    const logLevel = status === 'success' ? 'debug' : 'warn';
    logger[logLevel as 'debug' | 'warn'](`[AUDIT] ${action}: ${resource}`, {
      userId,
      status,
    });

    return entry;
  }

  /**
   * Get audit entries by user
   */
  public getEntriesByUser(userId: string): AuditEntry[] {
    return this.entries.filter((e) => e.userId === userId);
  }

  /**
   * Get audit entries by action
   */
  public getEntriesByAction(action: string): AuditEntry[] {
    return this.entries.filter((e) => e.action === action);
  }

  /**
   * Get audit entries by resource
   */
  public getEntriesByResource(resource: string): AuditEntry[] {
    return this.entries.filter((e) => e.resource === resource);
  }

  /**
   * Get entries in time range
   */
  public getEntriesByTimeRange(startTime: Date, endTime: Date): AuditEntry[] {
    return this.entries.filter((e) => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  /**
   * Get failed entries
   */
  public getFailedEntries(): AuditEntry[] {
    return this.entries.filter((e) => e.status === 'failure');
  }

  /**
   * Get all entries
   */
  public getAllEntries(): AuditEntry[] {
    return [...this.entries];
  }

  /**
   * Get recent entries
   */
  public getRecentEntries(count: number = 100): AuditEntry[] {
    return this.entries.slice(Math.max(0, this.entries.length - count));
  }

  /**
   * Clear audit log
   */
  public clear(): void {
    this.entries = [];
    logger.warn('Audit log cleared');
  }

  /**
   * Get entry count
   */
  public getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * Get audit stats
   */
  public getStats(): Record<string, unknown> {
    const failureCount = this.getFailedEntries().length;
    const successCount = this.entries.length - failureCount;

    const userActivity: Record<string, number> = {};
    for (const entry of this.entries) {
      userActivity[entry.userId] = (userActivity[entry.userId] || 0) + 1;
    }

    return {
      totalEntries: this.entries.length,
      successCount,
      failureCount,
      failureRate: this.entries.length > 0 ? (failureCount / this.entries.length) * 100 : 0,
      uniqueUsers: Object.keys(userActivity).length,
      topUsers: Object.entries(userActivity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([user, count]) => ({ user, count })),
    };
  }
}

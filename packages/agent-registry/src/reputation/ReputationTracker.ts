import { DEFAULTS, createLogger } from '@nexus/shared';

const logger = createLogger('ReputationTracker');

export interface ReputationRecord {
  agentId: string;
  score: number;
  successCount: number;
  failureCount: number;
  lastUpdated: Date;
}

/**
 * Reputation Tracker - Manages agent reputation scoring
 */
export class ReputationTracker {
  private reputation: Map<string, ReputationRecord> = new Map();

  /**
   * Initialize reputation for agent
   */
  public initializeAgent(agentId: string, initialScore: number = 1.0): void {
    if (!this.reputation.has(agentId)) {
      this.reputation.set(agentId, {
        agentId,
        score: Math.max(0, Math.min(1, initialScore)),
        successCount: 0,
        failureCount: 0,
        lastUpdated: new Date(),
      });
      logger.debug(`Reputation initialized: ${agentId}`, { score: initialScore });
    }
  }

  /**
   * Record successful task completion
   */
  public recordSuccess(agentId: string): void {
    const record = this.getOrCreateRecord(agentId);
    record.successCount++;
    record.score = Math.min(1, record.score + DEFAULTS.REPUTATION_INCREMENT_SUCCESS);
    record.lastUpdated = new Date();
    logger.debug(`Success recorded: ${agentId}`, { newScore: record.score });
  }

  /**
   * Record task failure
   */
  public recordFailure(agentId: string): void {
    const record = this.getOrCreateRecord(agentId);
    record.failureCount++;
    record.score = Math.max(0, record.score - DEFAULTS.REPUTATION_DECREMENT_FAILURE);
    record.lastUpdated = new Date();
    logger.debug(`Failure recorded: ${agentId}`, { newScore: record.score });

    if (record.score < DEFAULTS.REPUTATION_THRESHOLD_QUARANTINE) {
      logger.warn(`Agent below quarantine threshold: ${agentId}`, { score: record.score });
    }
  }

  /**
   * Get reputation record
   */
  public getReputation(agentId: string): ReputationRecord | undefined {
    return this.reputation.get(agentId);
  }

  /**
   * Get agent score
   */
  public getScore(agentId: string): number {
    return this.getOrCreateRecord(agentId).score;
  }

  /**
   * Check if agent should be quarantined
   */
  public shouldQuarantine(agentId: string): boolean {
    const score = this.getScore(agentId);
    return score < DEFAULTS.REPUTATION_THRESHOLD_QUARANTINE;
  }

  /**
   * Get all reputation records
   */
  public getAllRecords(): ReputationRecord[] {
    return Array.from(this.reputation.values());
  }

  /**
   * Get agents below threshold
   */
  public getQuarantineList(): ReputationRecord[] {
    return this.getAllRecords().filter(
      (r) => r.score < DEFAULTS.REPUTATION_THRESHOLD_QUARANTINE
    );
  }

  /**
   * Get reputation stats
   */
  public getStats(): Record<string, unknown> {
    const records = this.getAllRecords();
    if (records.length === 0) {
      return { agents: 0, avgScore: 0, highestScore: 0, lowestScore: 0 };
    }

    const scores = records.map((r) => r.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    return {
      agents: records.length,
      avgScore: parseFloat(avgScore.toFixed(3)),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      quarantined: this.getQuarantineList().length,
    };
  }

  /**
   * Private helper
   */
  private getOrCreateRecord(agentId: string): ReputationRecord {
    if (!this.reputation.has(agentId)) {
      this.initializeAgent(agentId);
    }
    return this.reputation.get(agentId)!;
  }
}

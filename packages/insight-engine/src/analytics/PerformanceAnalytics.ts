import { createLogger } from '@nexus/shared';

const logger = createLogger('PerformanceAnalytics');

/**
 * Performance sample
 */
export interface PerformanceSample {
  taskId: string;
  agentId: string;
  duration: number; // milliseconds
  successRate: number; // 0-1
  resourceUsage: {
    cpu: number; // percentage
    memory: number; // bytes
  };
  timestamp: Date;
}

/**
 * Agent performance metrics
 */
export interface AgentPerformance {
  agentId: string;
  tasksCompleted: number;
  tasksFailed: number;
  avgDuration: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  successRate: number;
  lastUpdated: Date;
}

/**
 * Performance Analytics - Analyzes task and agent performance
 */
export class PerformanceAnalytics {
  private samples: PerformanceSample[] = [];
  private agentMetrics: Map<string, AgentPerformance> = new Map();
  private maxSamples: number = 50000;

  /**
   * Record performance sample
   */
  public recordSample(sample: PerformanceSample): void {
    this.samples.push(sample);

    // Update agent metrics
    this.updateAgentMetrics(sample);

    // Trim old samples
    if (this.samples.length > this.maxSamples) {
      this.samples = this.samples.slice(this.samples.length - this.maxSamples);
    }

    logger.debug(`Performance sample recorded: ${sample.taskId}`, {
      agentId: sample.agentId,
      duration: sample.duration,
    });
  }

  /**
   * Update agent metrics
   */
  private updateAgentMetrics(sample: PerformanceSample): void {
    if (!this.agentMetrics.has(sample.agentId)) {
      this.agentMetrics.set(sample.agentId, {
        agentId: sample.agentId,
        tasksCompleted: 0,
        tasksFailed: 0,
        avgDuration: 0,
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        successRate: 1.0,
        lastUpdated: new Date(),
      });
    }

    const metrics = this.agentMetrics.get(sample.agentId)!;
    const isSuccess = sample.successRate > 0.95;

    if (isSuccess) {
      metrics.tasksCompleted++;
    } else {
      metrics.tasksFailed++;
    }

    const totalTasks = metrics.tasksCompleted + metrics.tasksFailed;
    metrics.avgDuration =
      (metrics.avgDuration * (totalTasks - 1) + sample.duration) / totalTasks;
    metrics.avgCpuUsage =
      (metrics.avgCpuUsage * (totalTasks - 1) + sample.resourceUsage.cpu) / totalTasks;
    metrics.avgMemoryUsage =
      (metrics.avgMemoryUsage * (totalTasks - 1) + sample.resourceUsage.memory) / totalTasks;
    metrics.successRate = metrics.tasksCompleted / totalTasks;
    metrics.lastUpdated = new Date();
  }

  /**
   * Get agent performance
   */
  public getAgentPerformance(agentId: string): AgentPerformance | undefined {
    return this.agentMetrics.get(agentId);
  }

  /**
   * Get all agent performance metrics
   */
  public getAllAgentMetrics(): AgentPerformance[] {
    return Array.from(this.agentMetrics.values()).sort(
      (a, b) => b.successRate - a.successRate
    );
  }

  /**
   * Get top performing agents
   */
  public getTopAgents(count: number = 10): AgentPerformance[] {
    return this.getAllAgentMetrics().slice(0, count);
  }

  /**
   * Get bottom performing agents
   */
  public getBottomAgents(count: number = 10): AgentPerformance[] {
    return this.getAllAgentMetrics()
      .reverse()
      .slice(0, count);
  }

  /**
   * Get samples by agent
   */
  public getSamplesByAgent(agentId: string): PerformanceSample[] {
    return this.samples.filter((s) => s.agentId === agentId);
  }

  /**
   * Get samples in time range
   */
  public getSamplesInRange(startTime: Date, endTime: Date): PerformanceSample[] {
    return this.samples.filter((s) => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  /**
   * Get overall performance summary
   */
  public getSummary(): Record<string, unknown> {
    if (this.samples.length === 0) {
      return {
        totalSamples: 0,
        avgDuration: 0,
        overallSuccessRate: 0,
        agentCount: 0,
      };
    }

    const durations = this.samples.map((s) => s.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const successCount = this.samples.filter((s) => s.successRate > 0.95).length;
    const overallSuccessRate = successCount / this.samples.length;

    return {
      totalSamples: this.samples.length,
      avgDuration,
      overallSuccessRate,
      agentCount: this.agentMetrics.size,
      topAgent: this.getTopAgents(1)[0]?.agentId || 'none',
    };
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.samples = [];
    this.agentMetrics.clear();
    logger.info('Performance analytics cleared');
  }
}

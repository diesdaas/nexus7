import { Task, createLogger } from '@nexus/shared';
import { PerformanceAnalytics, PerformanceSample } from '@nexus/insight-engine';

const logger = createLogger('TaskOptimizer');

/**
 * Optimization strategy
 */
export interface OptimizationStrategy {
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  taskId: string;
  improvements: string[];
  estimatedDurationReduction: number; // percentage
  estimatedCostReduction: number; // percentage
}

/**
 * Task Optimizer - Optimizes task execution for performance and cost
 */
export class TaskOptimizer {
  private performanceAnalytics: PerformanceAnalytics;
  private strategies: Map<string, OptimizationStrategy> = new Map([
    ['parallel_execution', { name: 'parallel_execution', enabled: true, config: {} }],
    ['agent_pooling', { name: 'agent_pooling', enabled: true, config: { poolSize: 5 } }],
    ['resource_caching', {
      name: 'resource_caching',
      enabled: true,
      config: { ttl: 3600000 },
    }],
  ]);

  constructor(performanceAnalytics: PerformanceAnalytics) {
    this.performanceAnalytics = performanceAnalytics;
  }

  /**
   * Optimize task execution plan
   */
  public optimizeTask(task: Task): OptimizationResult {
    const improvements: string[] = [];
    let durationReduction = 0;
    let costReduction = 0;

    // Check if task can be parallelized
    if (this.canParallelizeTask(task)) {
      improvements.push('parallelization');
      durationReduction += 20; // Estimated 20% reduction
    }

    // Check if agent pooling would help
    if (this.shouldUseAgentPooling(task)) {
      improvements.push('agent_pooling');
      costReduction += 15; // Estimated 15% cost reduction
    }

    // Check if caching would help
    if (this.canCacheResources(task)) {
      improvements.push('resource_caching');
      durationReduction += 30; // Estimated 30% reduction
    }

    // Load balancing optimization
    if (this.shouldLoadBalance(task)) {
      improvements.push('load_balancing');
      durationReduction += 10;
    }

    logger.info(`Task optimization complete: ${task.id}`, {
      improvements,
      estimatedDurationReduction: durationReduction,
      estimatedCostReduction: costReduction,
    });

    return {
      taskId: task.id,
      improvements,
      estimatedDurationReduction: durationReduction,
      estimatedCostReduction: costReduction,
    };
  }

  /**
   * Check if task can be parallelized
   */
  private canParallelizeTask(task: Task): boolean {
    // Check if task has independent sub-tasks
    if (task.metadata.parallelizable === true) {
      return true;
    }

    // Check if dependencies allow parallelization
    return task.dependencies.length === 0;
  }

  /**
   * Check if agent pooling would help
   */
  private shouldUseAgentPooling(task: Task): boolean {
    // Use pooling for high-volume tasks
    return task.metadata.expectedFrequency && task.metadata.expectedFrequency > 10;
  }

  /**
   * Check if resources can be cached
   */
  private canCacheResources(task: Task): boolean {
    // Cache static resources
    return task.metadata.staticResources === true;
  }

  /**
   * Check if load balancing would help
   */
  private shouldLoadBalance(task: Task): boolean {
    // Check performance metrics
    const stats = this.performanceAnalytics.getSummary();
    return stats.agentCount && stats.agentCount > 1;
  }

  /**
   * Enable optimization strategy
   */
  public enableStrategy(name: string): void {
    const strategy = this.strategies.get(name);
    if (strategy) {
      strategy.enabled = true;
      logger.info(`Strategy enabled: ${name}`);
    }
  }

  /**
   * Disable optimization strategy
   */
  public disableStrategy(name: string): void {
    const strategy = this.strategies.get(name);
    if (strategy) {
      strategy.enabled = false;
      logger.info(`Strategy disabled: ${name}`);
    }
  }

  /**
   * Get optimization stats
   */
  public getStats(): Record<string, unknown> {
    const enabledCount = Array.from(this.strategies.values()).filter((s) => s.enabled)
      .length;

    return {
      totalStrategies: this.strategies.size,
      enabledStrategies: enabledCount,
      strategies: Array.from(this.strategies.entries()).map(([name, strategy]) => ({
        name,
        enabled: strategy.enabled,
      })),
    };
  }
}

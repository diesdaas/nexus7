import { Task, createLogger } from '@nexus/shared';
import { TaskOrchestrator } from '../orchestrator/TaskOrchestrator';
import { TaskRouter } from '../routing/TaskRouter';

const logger = createLogger('ResilientOrchestrator');

/**
 * Circuit breaker state
 */
type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Resilient Orchestrator - Adds resilience patterns to task orchestration
 */
export class ResilientOrchestrator {
  private orchestrator: TaskOrchestrator;
  private router: TaskRouter;
  private circuitBreaker: Map<string, CircuitBreakerState> = new Map();
  private failureCount: Map<string, number> = new Map();
  private failureThreshold: number = 5;
  private resetTimeout: number = 60000; // 1 minute

  constructor(orchestrator: TaskOrchestrator, router: TaskRouter) {
    this.orchestrator = orchestrator;
    this.router = router;
  }

  /**
   * Execute task with resilience
   */
  public async executeTask(task: Task): Promise<unknown> {
    let lastError: Error | null = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Find best agent
        const decision = this.router.findBestAgent(task);
        if (!decision) {
          throw new Error('No suitable agents found');
        }

        // Check circuit breaker
        if (this.isCircuitOpen(decision.agentId)) {
          logger.warn(`Circuit breaker open for agent: ${decision.agentId}`);
          const alternative = this.router.findAlternativeAgent(task, decision.agentId);
          if (!alternative) {
            throw new Error('No alternative agents available');
          }
          decision.agentId = alternative.agentId;
        }

        // Assign task
        this.orchestrator.assignTask(task.id, decision.agentId);
        logger.info(`Task assigned: ${task.id} to ${decision.agentId} (attempt ${attempt})`);

        // TODO: Simulate execution (would normally be async)
        return { status: 'success', taskId: task.id, agentId: decision.agentId };
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Task execution attempt ${attempt} failed: ${task.id}`, {
          error: (error as Error).message,
        });

        if (attempt < maxAttempts) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await this.sleep(delay);
        }
      }
    }

    logger.error(`Task execution failed after ${maxAttempts} attempts: ${task.id}`, {
      error: lastError?.message,
    });
    throw lastError || new Error('Task execution failed');
  }

  /**
   * Record agent failure
   */
  public recordAgentFailure(agentId: string): void {
    const count = (this.failureCount.get(agentId) || 0) + 1;
    this.failureCount.set(agentId, count);

    if (count >= this.failureThreshold) {
      this.circuitBreaker.set(agentId, 'open');
      logger.warn(`Circuit breaker opened for agent: ${agentId}`, { failureCount: count });

      // Schedule reset
      setTimeout(() => {
        this.circuitBreaker.set(agentId, 'half-open');
        this.failureCount.set(agentId, 0);
        logger.info(`Circuit breaker half-open for agent: ${agentId}`);
      }, this.resetTimeout);
    }
  }

  /**
   * Record agent success
   */
  public recordAgentSuccess(agentId: string): void {
    this.failureCount.set(agentId, 0);

    if (this.circuitBreaker.get(agentId) === 'half-open') {
      this.circuitBreaker.set(agentId, 'closed');
      logger.info(`Circuit breaker closed for agent: ${agentId}`);
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(agentId: string): boolean {
    const state = this.circuitBreaker.get(agentId) || 'closed';
    return state === 'open';
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get resilience stats
   */
  public getStats(): Record<string, unknown> {
    const openCircuits = Array.from(this.circuitBreaker.entries())
      .filter(([_, state]) => state === 'open')
      .map(([id, _]) => id);

    return {
      circuitBreakers: {
        open: openCircuits.length,
        list: openCircuits,
      },
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout,
      agentFailures: Object.fromEntries(
        Array.from(this.failureCount.entries()).filter(([_, count]) => count > 0)
      ),
    };
  }
}

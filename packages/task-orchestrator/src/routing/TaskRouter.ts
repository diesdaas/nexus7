import { Task, createLogger, NexusError, ErrorCode } from '@nexus/shared';
import { AgentRegistry } from '@nexus/agent-registry';
import { AgentMetadata, AgentCapability } from '@nexus/shared';

const logger = createLogger('TaskRouter');

/**
 * Routing decision
 */
export interface RoutingDecision {
  taskId: string;
  agentId: string;
  confidence: number;
  reason: string;
}

/**
 * Task Router - Intelligent routing of tasks to agents
 */
export class TaskRouter {
  private agentRegistry: AgentRegistry;
  private retryAttempts: number = 3;
  private backoffMultiplier: number = 2;

  constructor(agentRegistry: AgentRegistry) {
    this.agentRegistry = agentRegistry;
  }

  /**
   * Find best agent for task
   */
  public findBestAgent(task: Task): RoutingDecision | null {
    const candidates = this.findCandidateAgents(task);

    if (candidates.length === 0) {
      logger.warn(`No suitable agents found for task: ${task.id}`, {
        objective: task.objective,
      });
      return null;
    }

    // Score candidates
    const scoredCandidates = candidates.map((agent) => ({
      agent,
      score: this.scoreAgent(agent, task),
    }));

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);
    const best = scoredCandidates[0];

    logger.debug(`Best agent selected: ${best.agent.id}`, {
      taskId: task.id,
      score: best.score,
    });

    return {
      taskId: task.id,
      agentId: best.agent.id,
      confidence: best.score,
      reason: `Score: ${best.score.toFixed(3)}`,
    };
  }

  /**
   * Find candidate agents for task
   */
  private findCandidateAgents(task: Task): AgentMetadata[] {
    const allAgents = this.agentRegistry.getAllAgents();

    // Filter for online agents
    let candidates = allAgents.filter(
      (a) => a.status === 'online' && a.reputationScore > 0.3
    );

    if (candidates.length === 0) {
      return [];
    }

    // If task specifies required agent type, filter by it
    if (task.metadata.requiredType) {
      candidates = candidates.filter((a) => a.type === task.metadata.requiredType);
    }

    // If task specifies required capability, filter by it
    if (task.metadata.requiredCapability) {
      candidates = candidates.filter((a) =>
        a.capabilities.some((c) => c.name === task.metadata.requiredCapability)
      );
    }

    return candidates;
  }

  /**
   * Score agent for task (0-1)
   */
  private scoreAgent(agent: AgentMetadata, task: Task): number {
    let score = 0.5; // baseline

    // Reputation score (weight: 40%)
    score += agent.reputationScore * 0.4;

    // Capability match (weight: 30%)
    if (task.metadata.requiredCapability) {
      const hasCapability = agent.capabilities.some(
        (c) => c.name === task.metadata.requiredCapability
      );
      if (hasCapability) {
        score += 0.3;
      } else {
        return 0; // Disqualify
      }
    } else {
      score += 0.3; // No specific requirement
    }

    // Status bonus (weight: 20%)
    if (agent.status === 'online') {
      score += 0.2;
    }

    // Availability bonus (weight: 10%)
    const lastHeartbeatAge = Date.now() - agent.lastHeartbeat.getTime();
    if (lastHeartbeatAge < 60000) {
      score += 0.1; // Recent heartbeat
    }

    return Math.min(1, score);
  }

  /**
   * Find alternative agent (for fallback)
   */
  public findAlternativeAgent(task: Task, excludeAgentId: string): RoutingDecision | null {
    const candidates = this.findCandidateAgents(task).filter(
      (a) => a.id !== excludeAgentId
    );

    if (candidates.length === 0) {
      return null;
    }

    const decision = {
      taskId: task.id,
      agentId: candidates[0].id,
      confidence: 0.5,
      reason: 'Fallback agent',
    };

    logger.info(`Fallback agent selected: ${decision.agentId}`, { taskId: task.id });
    return decision;
  }

  /**
   * Get routing stats
   */
  public getStats(): Record<string, unknown> {
    return {
      totalAgents: this.agentRegistry.getAgentCount(),
      onlineAgents: this.agentRegistry
        .getAllAgents()
        .filter((a) => a.status === 'online').length,
      retryAttempts: this.retryAttempts,
      backoffMultiplier: this.backoffMultiplier,
    };
  }
}

import { Agent } from './Agent';
import { AgentMetadata, createLogger } from '@nexus/shared';

const logger = createLogger('AgentLifecycle');

/**
 * Agent Lifecycle Manager - Handles agent registration, deregistration, and state transitions
 */
export class AgentLifecycle {
  private agents: Map<string, Agent> = new Map();
  private healthCheckInterval: NodeJS.Timer | null = null;
  private healthCheckIntervalMs: number = 30000; // 30 seconds

  /**
   * Register agent
   */
  public registerAgent(agent: Agent): void {
    const id = agent.getId();
    if (this.agents.has(id)) {
      logger.warn(`Agent already registered: ${id}, replacing`);
    }
    this.agents.set(id, agent);
    logger.info(`Agent registered: ${id}`, { type: agent.getType() });
  }

  /**
   * Deregister agent
   */
  public async deregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      logger.warn(`Agent not found for deregistration: ${agentId}`);
      return;
    }

    await agent.cleanup();
    this.agents.delete(agentId);
    logger.info(`Agent deregistered: ${agentId}`);
  }

  /**
   * Get agent
   */
  public getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Start health checks
   */
  public startHealthChecks(): void {
    if (this.healthCheckInterval) {
      logger.warn('Health checks already running');
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckIntervalMs);

    logger.info('Health checks started', { intervalMs: this.healthCheckIntervalMs });
  }

  /**
   * Stop health checks
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health checks stopped');
    }
  }

  /**
   * Perform health checks on all agents
   */
  private async performHealthChecks(): Promise<void> {
    const agents = this.getAllAgents();

    for (const agent of agents) {
      try {
        const healthy = await agent.isHealthy();
        const currentStatus = agent.getMetadata().status;

        if (healthy && currentStatus !== 'online') {
          agent.getMetadata().status = 'online';
          logger.debug(`Agent recovered: ${agent.getId()}`);
        } else if (!healthy && currentStatus === 'online') {
          agent.getMetadata().status = 'degraded';
          logger.warn(`Agent degraded: ${agent.getId()}`);
        }
      } catch (error) {
        logger.error(`Health check failed: ${agent.getId()}`, { error });
        agent.getMetadata().status = 'degraded';
      }
    }
  }

  /**
   * Get agent count
   */
  public getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Cleanup all agents and stop health checks
   */
  public async cleanup(): Promise<void> {
    this.stopHealthChecks();

    const agents = this.getAllAgents();
    for (const agent of agents) {
      await agent.cleanup();
    }

    this.agents.clear();
    logger.info('Lifecycle manager cleaned up');
  }
}

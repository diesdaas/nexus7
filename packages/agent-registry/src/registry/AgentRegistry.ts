import { AgentMetadata, createLogger, NexusError, ErrorCode } from '@nexus/shared';

const logger = createLogger('AgentRegistry');

/**
 * Agent Registry - Manages agent registration and discovery
 */
export class AgentRegistry {
  private agents: Map<string, AgentMetadata> = new Map();

  /**
   * Register an agent
   */
  public register(agent: AgentMetadata): void {
    if (this.agents.has(agent.id)) {
      logger.warn(`Agent already registered, updating: ${agent.id}`);
    }
    this.agents.set(agent.id, agent);
    logger.info(`Agent registered: ${agent.id}`, { type: agent.type });
  }

  /**
   * Unregister an agent
   */
  public unregister(agentId: string): void {
    if (!this.agents.has(agentId)) {
      logger.warn(`Agent not found for unregistration: ${agentId}`);
      return;
    }
    this.agents.delete(agentId);
    logger.info(`Agent unregistered: ${agentId}`);
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: string): AgentMetadata {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new NexusError(ErrorCode.AGENT_NOT_FOUND, `Agent not found: ${agentId}`);
    }
    return agent;
  }

  /**
   * Get all agents
   */
  public getAllAgents(): AgentMetadata[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by type
   */
  public getAgentsByType(type: string): AgentMetadata[] {
    return Array.from(this.agents.values()).filter((agent) => agent.type === type);
  }

  /**
   * Get agents with specific capability
   */
  public getAgentsByCapability(capabilityName: string): AgentMetadata[] {
    return Array.from(this.agents.values()).filter((agent) =>
      agent.capabilities.some((cap) => cap.name === capabilityName)
    );
  }

  /**
   * Update agent reputation
   */
  public updateReputation(agentId: string, delta: number): void {
    const agent = this.getAgent(agentId);
    agent.reputationScore = Math.max(0, Math.min(1, agent.reputationScore + delta));
    logger.debug(`Agent reputation updated: ${agentId}`, {
      newScore: agent.reputationScore,
    });
  }

  /**
   * Update agent status
   */
  public updateStatus(agentId: string, status: string): void {
    const agent = this.getAgent(agentId);
    agent.status = status as any;
    logger.info(`Agent status updated: ${agentId}`, { status });
  }

  /**
   * Get agent count
   */
  public getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Clear all agents
   */
  public clear(): void {
    this.agents.clear();
    logger.info('Agent registry cleared');
  }
}

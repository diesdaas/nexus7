import { AgentMetadata, Message, createLogger } from '@nexus/shared';

const logger = createLogger('AgentDiscovery');

/**
 * Agent Discovery Service - Handles agent discovery in distributed network
 */
export class AgentDiscovery {
  private discoveredAgents: Map<string, AgentMetadata> = new Map();
  private nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  /**
   * Discover agents via heartbeat/broadcast
   */
  public registerDiscoveredAgent(agent: AgentMetadata): void {
    if (this.discoveredAgents.has(agent.id)) {
      logger.debug(`Agent re-discovered: ${agent.id}`);
    } else {
      logger.info(`New agent discovered: ${agent.id}`, { type: agent.type });
    }
    this.discoveredAgents.set(agent.id, agent);
  }

  /**
   * Handle agent going offline
   */
  public removeAgent(agentId: string): void {
    this.discoveredAgents.delete(agentId);
    logger.info(`Agent removed from discovery: ${agentId}`);
  }

  /**
   * Get discovered agents
   */
  public getDiscoveredAgents(): AgentMetadata[] {
    return Array.from(this.discoveredAgents.values());
  }

  /**
   * Find agents matching criteria
   */
  public findAgents(criteria: {
    type?: string;
    capability?: string;
    minReputation?: number;
    status?: string;
  }): AgentMetadata[] {
    let results = this.getDiscoveredAgents();

    if (criteria.type) {
      results = results.filter((a) => a.type === criteria.type);
    }
    if (criteria.capability) {
      results = results.filter((a) =>
        a.capabilities.some((c) => c.name === criteria.capability)
      );
    }
    if (criteria.minReputation !== undefined) {
      results = results.filter((a) => a.reputationScore >= criteria.minReputation);
    }
    if (criteria.status) {
      results = results.filter((a) => a.status === criteria.status);
    }

    return results;
  }

  /**
   * Get agent count
   */
  public getAgentCount(): number {
    return this.discoveredAgents.size;
  }
}

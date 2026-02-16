import { AgentCapability, createLogger } from '@nexus/shared';

const logger = createLogger('CapabilityIndex');

/**
 * Capability Index - Fast lookup of agents by capability
 */
export class CapabilityIndex {
  private capabilityIndex: Map<string, Set<string>> = new Map(); // capability -> agentIds
  private agentCapabilities: Map<string, AgentCapability[]> = new Map(); // agentId -> capabilities

  /**
   * Index agent capabilities
   */
  public indexAgent(agentId: string, capabilities: AgentCapability[]): void {
    this.agentCapabilities.set(agentId, capabilities);

    for (const capability of capabilities) {
      if (!this.capabilityIndex.has(capability.name)) {
        this.capabilityIndex.set(capability.name, new Set());
      }
      this.capabilityIndex.get(capability.name)!.add(agentId);
    }

    logger.debug(`Indexed agent capabilities: ${agentId}`, {
      capabilities: capabilities.length,
    });
  }

  /**
   * Remove agent from index
   */
  public removeAgent(agentId: string): void {
    const capabilities = this.agentCapabilities.get(agentId) || [];

    for (const capability of capabilities) {
      const agents = this.capabilityIndex.get(capability.name);
      if (agents) {
        agents.delete(agentId);
        if (agents.size === 0) {
          this.capabilityIndex.delete(capability.name);
        }
      }
    }

    this.agentCapabilities.delete(agentId);
    logger.debug(`Removed agent from index: ${agentId}`);
  }

  /**
   * Get agents with capability
   */
  public getAgentsWithCapability(capabilityName: string): string[] {
    const agents = this.capabilityIndex.get(capabilityName);
    return agents ? Array.from(agents) : [];
  }

  /**
   * Get all capabilities
   */
  public getAllCapabilities(): string[] {
    return Array.from(this.capabilityIndex.keys());
  }

  /**
   * Get agent capabilities
   */
  public getAgentCapabilities(agentId: string): AgentCapability[] {
    return this.agentCapabilities.get(agentId) || [];
  }

  /**
   * Search capabilities by pattern
   */
  public searchCapabilities(pattern: string): string[] {
    const regex = new RegExp(pattern, 'i');
    return this.getAllCapabilities().filter((cap) => regex.test(cap));
  }

  /**
   * Get index stats
   */
  public getStats(): Record<string, unknown> {
    return {
      totalCapabilities: this.capabilityIndex.size,
      totalAgents: this.agentCapabilities.size,
      capabilityDistribution: Array.from(this.capabilityIndex.entries()).map(([cap, agents]) => ({
        capability: cap,
        agentCount: agents.size,
      })),
    };
  }
}

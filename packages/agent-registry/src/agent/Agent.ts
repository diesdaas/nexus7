import { AgentMetadata, AgentCapability, Message, createLogger } from '@nexus/shared';

const logger = createLogger('Agent');

/**
 * Base Agent Interface - Unified interface for all agent types
 */
export abstract class Agent {
  protected metadata: AgentMetadata;
  protected readonly nodeId: string;

  constructor(nodeId: string, metadata: AgentMetadata) {
    this.nodeId = nodeId;
    this.metadata = metadata;
  }

  /**
   * Get agent metadata
   */
  public getMetadata(): AgentMetadata {
    return this.metadata;
  }

  /**
   * Get agent ID
   */
  public getId(): string {
    return this.metadata.id;
  }

  /**
   * Get agent name
   */
  public getName(): string {
    return this.metadata.name;
  }

  /**
   * Get agent type
   */
  public getType(): string {
    return this.metadata.type;
  }

  /**
   * Get agent capabilities
   */
  public getCapabilities(): AgentCapability[] {
    return this.metadata.capabilities;
  }

  /**
   * Check if agent has capability
   */
  public hasCapability(capabilityName: string): boolean {
    return this.metadata.capabilities.some((cap) => cap.name === capabilityName);
  }

  /**
   * Get reputation score
   */
  public getReputation(): number {
    return this.metadata.reputationScore;
  }

  /**
   * Get agent status
   */
  public getStatus(): string {
    return this.metadata.status;
  }

  /**
   * Update heartbeat
   */
  public updateHeartbeat(): void {
    this.metadata.lastHeartbeat = new Date();
    logger.debug(`Heartbeat updated: ${this.getId()}`);
  }

  /**
   * Process a task/message
   */
  abstract execute(input: unknown): Promise<unknown>;

  /**
   * Check agent health
   */
  abstract isHealthy(): Promise<boolean>;

  /**
   * Cleanup resources
   */
  abstract cleanup(): Promise<void>;

  /**
   * Lifecycle hook - Called when agent goes online
   */
  protected onOnline(): void {
    logger.info(`Agent online: ${this.getId()}`);
  }

  /**
   * Lifecycle hook - Called when agent goes offline
   */
  protected onOffline(): void {
    logger.info(`Agent offline: ${this.getId()}`);
  }
}

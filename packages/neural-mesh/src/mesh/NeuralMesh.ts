import { Message, createLogger } from '@nexus/shared';
import { ConnectionPool } from '../transport/ConnectionPool';
import { RoutingTable } from '../routing/RoutingTable';
import { FlowController } from '../flow-control/FlowController';
import { StateStore } from '../synchronization/StateStore';
import { SerializerFactory, ISerializer } from '../serialization/Serializer';

const logger = createLogger('NeuralMesh');

/**
 * Neural Mesh Configuration
 */
export interface NeuralMeshConfig {
  nodeId: string;
  maxConnections?: number;
  serializationFormat?: string;
}

/**
 * Neural Mesh - High-speed communication fabric for NEXUS
 */
export class NeuralMesh {
  private nodeId: string;
  private connectionPool: ConnectionPool;
  private routingTable: RoutingTable;
  private flowController: FlowController;
  private stateStore: StateStore;
  private serializer: ISerializer;
  private messageHandlers: Map<string, (msg: Message) => Promise<void>> = new Map();

  constructor(config: NeuralMeshConfig) {
    this.nodeId = config.nodeId;
    this.connectionPool = new ConnectionPool({
      maxConnections: config.maxConnections || 100,
    });
    this.routingTable = new RoutingTable(this.nodeId);
    this.flowController = new FlowController();
    this.stateStore = new StateStore(this.nodeId);
    this.serializer = SerializerFactory.getSerializer(config.serializationFormat || 'json');

    logger.info(`Neural Mesh initialized: ${this.nodeId}`, {
      serializationFormat: this.serializer.getFormat(),
    });
  }

  /**
   * Start the mesh
   */
  public start(): void {
    this.connectionPool.startCleanup();
    logger.info('Neural Mesh started');
  }

  /**
   * Stop the mesh
   */
  public async stop(): Promise<void> {
    await this.connectionPool.cleanup();
    logger.info('Neural Mesh stopped');
  }

  /**
   * Register a peer node
   */
  public registerPeer(peerId: string): void {
    this.routingTable.addRoute(peerId, peerId, 1);
    logger.info(`Peer registered: ${peerId}`);
  }

  /**
   * Send message to peer
   */
  public async sendMessage(message: Message): Promise<void> {
    if (!message.to) {
      throw new Error('Message destination not specified');
    }

    const nextHop = this.routingTable.getNextHop(message.to);
    if (!nextHop) {
      throw new Error(`No route to ${message.to}`);
    }

    const connection = await this.connectionPool.getConnection(nextHop);
    const serialized = this.serializer.serialize(message);

    if (!this.flowController.write(serialized.length)) {
      logger.warn('Backpressure: pausing sends', { destination: message.to });
    }

    await connection.send(message);
    logger.debug(`Message sent to ${message.to}`, { messageId: message.id });
  }

  /**
   * Register message handler
   */
  public onMessage(messageType: string, handler: (msg: Message) => Promise<void>): void {
    this.messageHandlers.set(messageType, handler);
    logger.debug(`Message handler registered: ${messageType}`);
  }

  /**
   * Handle incoming message
   */
  public async handleMessage(message: Message): Promise<void> {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      await handler(message);
    } else {
      logger.warn(`No handler for message type: ${message.type}`);
    }
  }

  /**
   * Publish state update
   */
  public publishState(key: string, value: unknown): void {
    this.stateStore.setState(key, value);
  }

  /**
   * Get state
   */
  public getState(key: string): unknown {
    return this.stateStore.getState(key);
  }

  /**
   * Subscribe to state changes
   */
  public onStateChange(callback: (change: any) => void): () => void {
    return this.stateStore.onChange(callback);
  }

  /**
   * Get mesh stats
   */
  public getStats(): Record<string, unknown> {
    return {
      nodeId: this.nodeId,
      connections: this.connectionPool.getStats(),
      routing: this.routingTable.getStats(),
      flowControl: this.flowController.getStats(),
      state: {
        keys: this.stateStore.getSize(),
      },
    };
  }

  /**
   * Get node ID
   */
  public getNodeId(): string {
    return this.nodeId;
  }
}

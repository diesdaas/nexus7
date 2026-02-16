import { Message, createLogger } from '@nexus/shared';
import { EventEmitter } from 'events';

const logger = createLogger('Connection');

/**
 * Connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Connection interface for network communication
 */
export abstract class Connection extends EventEmitter {
  protected remoteId: string;
  protected state: ConnectionState = 'disconnected';
  protected readonly timeout: number = 30000; // 30 seconds

  constructor(remoteId: string) {
    super();
    this.remoteId = remoteId;
  }

  /**
   * Connect to remote peer
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from remote peer
   */
  abstract disconnect(): Promise<void>;

  /**
   * Send message to remote peer
   */
  abstract send(message: Message): Promise<void>;

  /**
   * Get connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Get remote peer ID
   */
  public getRemoteId(): string {
    return this.remoteId;
  }

  /**
   * Handle message received
   */
  protected emitMessage(message: Message): void {
    this.emit('message', message);
    logger.debug(`Message received from ${this.remoteId}`, {
      messageType: message.type,
      messageId: message.id,
    });
  }

  /**
   * Handle connection error
   */
  protected emitError(error: Error): void {
    this.state = 'error';
    this.emit('error', error);
    logger.error(`Connection error with ${this.remoteId}`, { error: error.message });
  }

  /**
   * Handle connection close
   */
  protected emitClose(): void {
    this.state = 'disconnected';
    this.emit('close');
    logger.info(`Connection closed with ${this.remoteId}`);
  }
}

/**
 * In-memory connection for testing
 */
export class MockConnection extends Connection {
  private messageQueue: Message[] = [];

  async connect(): Promise<void> {
    this.state = 'connecting';
    this.state = 'connected';
    logger.debug(`Mock connection established: ${this.remoteId}`);
  }

  async disconnect(): Promise<void> {
    this.state = 'disconnected';
    this.messageQueue = [];
  }

  async send(message: Message): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Connection not established');
    }
    this.messageQueue.push(message);
  }

  public getQueuedMessages(): Message[] {
    return [...this.messageQueue];
  }

  public clearQueue(): void {
    this.messageQueue = [];
  }
}

import { Message, createLogger } from '@nexus/shared';

const logger = createLogger('MessageBroker');

/**
 * Base class for message broker implementations
 */
export abstract class MessageBroker {
  protected readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  /**
   * Initialize the message broker
   */
  abstract connect(): Promise<void>;

  /**
   * Publish a message to a topic/channel
   */
  abstract publish(channel: string, message: Message): Promise<void>;

  /**
   * Subscribe to messages on a channel
   */
  abstract subscribe(
    channel: string,
    callback: (message: Message) => Promise<void>
  ): Promise<void>;

  /**
   * Unsubscribe from a channel
   */
  abstract unsubscribe(channel: string): Promise<void>;

  /**
   * Disconnect from the message broker
   */
  abstract disconnect(): Promise<void>;

  /**
   * Get broker status
   */
  abstract isConnected(): boolean;
}

import { createLogger } from '@nexus/shared';
import { Connection, MockConnection } from './Connection';

const logger = createLogger('ConnectionPool');

/**
 * Pool configuration
 */
export interface PoolConfig {
  maxConnections: number;
  maxConnectionIdleTime: number; // milliseconds
  connectionTimeout: number; // milliseconds
}

/**
 * Connection Pool - Manages connection reuse and pooling
 */
export class ConnectionPool {
  private connections: Map<string, Connection> = new Map();
  private lastAccessTime: Map<string, number> = new Map();
  private config: PoolConfig;
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      maxConnections: config.maxConnections || 100,
      maxConnectionIdleTime: config.maxConnectionIdleTime || 300000, // 5 minutes
      connectionTimeout: config.connectionTimeout || 30000, // 30 seconds
    };
  }

  /**
   * Get or create connection to remote peer
   */
  public async getConnection(remoteId: string): Promise<Connection> {
    const existing = this.connections.get(remoteId);

    if (existing && existing.isConnected()) {
      this.lastAccessTime.set(remoteId, Date.now());
      logger.debug(`Reusing connection: ${remoteId}`);
      return existing;
    }

    if (this.connections.size >= this.config.maxConnections) {
      await this.evictIdleConnection();
    }

    const connection = new MockConnection(remoteId);
    await connection.connect();
    this.connections.set(remoteId, connection);
    this.lastAccessTime.set(remoteId, Date.now());

    logger.info(`New connection created: ${remoteId}`, {
      poolSize: this.connections.size,
    });

    return connection;
  }

  /**
   * Return connection to pool
   */
  public releaseConnection(remoteId: string): void {
    this.lastAccessTime.set(remoteId, Date.now());
    logger.debug(`Connection released: ${remoteId}`);
  }

  /**
   * Close connection
   */
  public async closeConnection(remoteId: string): Promise<void> {
    const connection = this.connections.get(remoteId);
    if (connection) {
      await connection.disconnect();
      this.connections.delete(remoteId);
      this.lastAccessTime.delete(remoteId);
      logger.info(`Connection closed: ${remoteId}`);
    }
  }

  /**
   * Start cleanup of idle connections
   */
  public startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Check every minute

    logger.info('Connection pool cleanup started');
  }

  /**
   * Stop cleanup
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Connection pool cleanup stopped');
    }
  }

  /**
   * Cleanup idle connections
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = Date.now();
    const toClose: string[] = [];

    for (const [remoteId, lastAccess] of this.lastAccessTime) {
      if (now - lastAccess > this.config.maxConnectionIdleTime) {
        toClose.push(remoteId);
      }
    }

    for (const remoteId of toClose) {
      await this.closeConnection(remoteId);
      logger.debug(`Idle connection evicted: ${remoteId}`);
    }
  }

  /**
   * Evict oldest idle connection
   */
  private async evictIdleConnection(): Promise<void> {
    let oldestRemoteId: string | null = null;
    let oldestTime = Date.now();

    for (const [remoteId, lastAccess] of this.lastAccessTime) {
      if (lastAccess < oldestTime) {
        oldestTime = lastAccess;
        oldestRemoteId = remoteId;
      }
    }

    if (oldestRemoteId) {
      await this.closeConnection(oldestRemoteId);
      logger.debug(`Oldest connection evicted: ${oldestRemoteId}`);
    }
  }

  /**
   * Get pool stats
   */
  public getStats(): Record<string, unknown> {
    return {
      activeConnections: this.connections.size,
      maxConnections: this.config.maxConnections,
      utilization: (this.connections.size / this.config.maxConnections) * 100,
    };
  }

  /**
   * Cleanup all connections
   */
  public async cleanup(): Promise<void> {
    this.stopCleanup();

    const remoteIds = Array.from(this.connections.keys());
    for (const remoteId of remoteIds) {
      await this.closeConnection(remoteId);
    }

    logger.info('Connection pool cleaned up');
  }
}

import { createLogger } from '@nexus/shared';

const logger = createLogger('StateStore');

/**
 * State change event
 */
export interface StateChange {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: Date;
  source: string;
}

/**
 * State change listener
 */
export type StateChangeListener = (change: StateChange) => void;

/**
 * Distributed State Store - Manages shared state across nodes
 */
export class StateStore {
  private state: Map<string, unknown> = new Map();
  private listeners: Set<StateChangeListener> = new Set();
  private version: Map<string, number> = new Map(); // For conflict resolution
  private nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  /**
   * Set state value
   */
  public setState(key: string, value: unknown): void {
    const oldValue = this.state.get(key);
    const currentVersion = this.version.get(key) || 0;

    this.state.set(key, value);
    this.version.set(key, currentVersion + 1);

    const change: StateChange = {
      key,
      oldValue,
      newValue: value,
      timestamp: new Date(),
      source: this.nodeId,
    };

    this.notifyListeners(change);
    logger.debug(`State updated: ${key}`, { version: currentVersion + 1 });
  }

  /**
   * Get state value
   */
  public getState(key: string): unknown {
    return this.state.get(key);
  }

  /**
   * Get state with version
   */
  public getStateWithVersion(key: string): { value: unknown; version: number } | undefined {
    const value = this.state.get(key);
    if (value === undefined) {
      return undefined;
    }
    return {
      value,
      version: this.version.get(key) || 0,
    };
  }

  /**
   * Delete state value
   */
  public deleteState(key: string): void {
    const oldValue = this.state.get(key);
    if (oldValue === undefined) {
      return;
    }

    this.state.delete(key);
    this.version.delete(key);

    const change: StateChange = {
      key,
      oldValue,
      newValue: undefined,
      timestamp: new Date(),
      source: this.nodeId,
    };

    this.notifyListeners(change);
    logger.debug(`State deleted: ${key}`);
  }

  /**
   * Apply remote state change (with conflict resolution)
   */
  public applyRemoteChange(change: StateChange): boolean {
    const localVersion = this.version.get(change.key) || 0;
    const remoteVersion = (this.version.get(change.key) || 0) + 1;

    // Simple last-write-wins strategy
    if (change.timestamp.getTime() > (Date.now() - 60000)) {
      // Accept if recent
      this.setState(change.key, change.newValue);
      return true;
    }

    return false;
  }

  /**
   * Subscribe to state changes
   */
  public onChange(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    logger.debug(`State change listener added (total: ${this.listeners.size})`);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify listeners of state change
   */
  private notifyListeners(change: StateChange): void {
    for (const listener of this.listeners) {
      try {
        listener(change);
      } catch (error) {
        logger.error('Error in state change listener', { error });
      }
    }
  }

  /**
   * Get all state
   */
  public getAllState(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.state) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Get state size
   */
  public getSize(): number {
    return this.state.size;
  }

  /**
   * Clear all state
   */
  public clear(): void {
    this.state.clear();
    this.version.clear();
    logger.info('State store cleared');
  }
}

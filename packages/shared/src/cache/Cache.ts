import { createLogger } from '../utils/logger';

const logger = createLogger('Cache');

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt: Date;
  hits: number;
  createdAt: Date;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number;
  ttl: number; // milliseconds
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
}

/**
 * LRU Cache - Least Recently Used eviction
 */
export class Cache<K, V> {
  private entries: Map<K, CacheEntry<V>> = new Map();
  private accessOrder: K[] = [];
  private config: CacheConfig;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      ttl: config.ttl || 3600000, // 1 hour
      evictionPolicy: config.evictionPolicy || 'LRU',
    };
  }

  /**
   * Get value from cache
   */
  public get(key: K): V | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (entry.expiresAt < new Date()) {
      this.entries.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      this.misses++;
      return undefined;
    }

    // Update access
    entry.hits++;
    this.updateAccessOrder(key);
    this.hits++;

    logger.debug(`Cache hit: ${String(key)}`);
    return entry.value;
  }

  /**
   * Set value in cache
   */
  public set(key: K, value: V): void {
    // Check if needs eviction
    if (this.entries.size >= this.config.maxSize && !this.entries.has(key)) {
      this.evict();
    }

    const entry: CacheEntry<V> = {
      value,
      expiresAt: new Date(Date.now() + this.config.ttl),
      hits: 0,
      createdAt: new Date(),
    };

    this.entries.set(key, entry);
    this.updateAccessOrder(key);

    logger.debug(`Cache set: ${String(key)}`);
  }

  /**
   * Delete from cache
   */
  public delete(key: K): boolean {
    const deleted = this.entries.delete(key);
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    return deleted;
  }

  /**
   * Check if key exists
   */
  public has(key: K): boolean {
    const entry = this.entries.get(key);
    if (!entry) {
      return false;
    }

    if (entry.expiresAt < new Date()) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear cache
   */
  public clear(): void {
    this.entries.clear();
    this.accessOrder = [];
    logger.info('Cache cleared');
  }

  /**
   * Update access order
   */
  private updateAccessOrder(key: K): void {
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);
  }

  /**
   * Evict entry based on policy
   */
  private evict(): void {
    let keyToEvict: K | undefined;

    if (this.config.evictionPolicy === 'LRU') {
      keyToEvict = this.accessOrder[0];
    } else if (this.config.evictionPolicy === 'LFU') {
      let minHits = Infinity;
      for (const key of this.entries.keys()) {
        const hits = this.entries.get(key)?.hits || 0;
        if (hits < minHits) {
          minHits = hits;
          keyToEvict = key;
        }
      }
    } else if (this.config.evictionPolicy === 'FIFO') {
      keyToEvict = Array.from(this.entries.keys())[0];
    }

    if (keyToEvict !== undefined) {
      this.delete(keyToEvict);
      logger.debug(`Cache evicted: ${String(keyToEvict)}`, {
        policy: this.config.evictionPolicy,
      });
    }
  }

  /**
   * Get cache stats
   */
  public getStats(): Record<string, unknown> {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      size: this.entries.size,
      maxSize: this.config.maxSize,
      utilization: (this.entries.size / this.config.maxSize) * 100,
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(2),
      total,
      ttl: this.config.ttl,
      policy: this.config.evictionPolicy,
    };
  }

  /**
   * Get size
   */
  public size(): number {
    return this.entries.size;
  }
}

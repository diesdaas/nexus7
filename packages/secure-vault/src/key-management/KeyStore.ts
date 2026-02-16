import { createLogger } from '@nexus/shared';
import { CryptoManager } from '../crypto/CryptoManager';

const logger = createLogger('KeyStore');

/**
 * Key entry
 */
export interface KeyEntry {
  id: string;
  key: Buffer;
  createdAt: Date;
  expiresAt?: Date;
  purpose: 'encryption' | 'signing' | 'authentication';
  active: boolean;
}

/**
 * Key Store - Manages encryption keys with rotation
 */
export class KeyStore {
  private keys: Map<string, KeyEntry> = new Map();
  private currentKeyId: Map<string, string> = new Map(); // purpose -> current keyId
  private cryptoManager: CryptoManager;
  private rotationInterval: NodeJS.Timer | null = null;
  private rotationCheckMs: number = 86400000; // 24 hours

  constructor() {
    this.cryptoManager = new CryptoManager();
  }

  /**
   * Generate and store new key
   */
  public generateKey(purpose: 'encryption' | 'signing' | 'authentication'): KeyEntry {
    const keyId = `${purpose}-${Date.now()}`;
    const key = this.cryptoManager.generateKey();

    const entry: KeyEntry = {
      id: keyId,
      key,
      createdAt: new Date(),
      purpose,
      active: true,
    };

    this.keys.set(keyId, entry);
    this.currentKeyId.set(purpose, keyId);

    logger.info(`Key generated: ${keyId}`, { purpose });
    return entry;
  }

  /**
   * Get current key for purpose
   */
  public getCurrentKey(purpose: string): KeyEntry | undefined {
    const keyId = this.currentKeyId.get(purpose);
    if (!keyId) {
      return undefined;
    }
    return this.keys.get(keyId);
  }

  /**
   * Get key by ID
   */
  public getKey(keyId: string): KeyEntry | undefined {
    return this.keys.get(keyId);
  }

  /**
   * Rotate key for purpose
   */
  public rotateKey(purpose: 'encryption' | 'signing' | 'authentication'): KeyEntry {
    const oldKeyId = this.currentKeyId.get(purpose);
    const oldKey = oldKeyId ? this.keys.get(oldKeyId) : undefined;

    if (oldKey) {
      oldKey.active = false;
      logger.info(`Key deactivated: ${oldKeyId}`);
    }

    return this.generateKey(purpose);
  }

  /**
   * Start automatic key rotation
   */
  public startRotation(rotationIntervalMs?: number): void {
    if (this.rotationInterval) {
      logger.warn('Key rotation already running');
      return;
    }

    if (rotationIntervalMs) {
      this.rotationCheckMs = rotationIntervalMs;
    }

    this.rotationInterval = setInterval(() => {
      this.checkExpiredKeys();
    }, this.rotationCheckMs);

    logger.info('Key rotation started', { intervalMs: this.rotationCheckMs });
  }

  /**
   * Stop automatic key rotation
   */
  public stopRotation(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
      logger.info('Key rotation stopped');
    }
  }

  /**
   * Check and rotate expired keys
   */
  private checkExpiredKeys(): void {
    const now = new Date();
    const purposes: Array<'encryption' | 'signing' | 'authentication'> = [
      'encryption',
      'signing',
      'authentication',
    ];

    for (const purpose of purposes) {
      const currentKey = this.getCurrentKey(purpose);
      if (!currentKey) {
        this.generateKey(purpose);
        continue;
      }

      if (currentKey.expiresAt && currentKey.expiresAt < now) {
        this.rotateKey(purpose);
        logger.info(`Key rotated automatically: ${currentKey.id}`);
      }
    }
  }

  /**
   * Get all keys for purpose
   */
  public getKeysByPurpose(purpose: string): KeyEntry[] {
    return Array.from(this.keys.values()).filter((k) => k.purpose === purpose);
  }

  /**
   * Revoke key
   */
  public revokeKey(keyId: string): void {
    const key = this.keys.get(keyId);
    if (key) {
      key.active = false;
      logger.warn(`Key revoked: ${keyId}`);
    }
  }

  /**
   * Get key count
   */
  public getKeyCount(): number {
    return this.keys.size;
  }

  /**
   * Get key stats
   */
  public getStats(): Record<string, unknown> {
    const activeCount = Array.from(this.keys.values()).filter((k) => k.active).length;
    const purposeCounts = {
      encryption: this.getKeysByPurpose('encryption').length,
      signing: this.getKeysByPurpose('signing').length,
      authentication: this.getKeysByPurpose('authentication').length,
    };

    return {
      totalKeys: this.keys.size,
      activeKeys: activeCount,
      byPurpose: purposeCounts,
    };
  }

  /**
   * Clear all keys (WARNING: irreversible)
   */
  public clear(): void {
    this.stopRotation();
    this.keys.clear();
    this.currentKeyId.clear();
    logger.warn('All keys cleared');
  }
}

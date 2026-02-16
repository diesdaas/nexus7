import { createLogger } from '@nexus/shared';
import { CryptoManager, EncryptionResult } from '../crypto/CryptoManager';
import { KeyStore } from '../key-management/KeyStore';
import { AuthManager, Credentials } from '../auth/AuthManager';
import { AuditLog } from '../audit/AuditLog';
import { AnomalyDetector } from '../anomaly/AnomalyDetector';

const logger = createLogger('SecureVault');

/**
 * Secure Vault - Central security module for NEXUS
 */
export class SecureVault {
  private cryptoManager: CryptoManager;
  private keyStore: KeyStore;
  private authManager: AuthManager;
  private auditLog: AuditLog;
  private anomalyDetector: AnomalyDetector;

  constructor() {
    this.cryptoManager = new CryptoManager();
    this.keyStore = new KeyStore();
    this.authManager = new AuthManager();
    this.auditLog = new AuditLog();
    this.anomalyDetector = new AnomalyDetector();

    // Initialize default keys
    this.keyStore.generateKey('encryption');
    this.keyStore.generateKey('signing');
    this.keyStore.generateKey('authentication');

    logger.info('Secure Vault initialized');
  }

  /**
   * Encrypt sensitive data
   */
  public encryptData(plaintext: Buffer): EncryptionResult {
    const key = this.keyStore.getCurrentKey('encryption');
    if (!key) {
      throw new Error('No encryption key available');
    }
    return this.cryptoManager.encrypt(plaintext, key.key);
  }

  /**
   * Decrypt sensitive data
   */
  public decryptData(encryptionResult: EncryptionResult): Buffer {
    const key = this.keyStore.getCurrentKey('encryption');
    if (!key) {
      throw new Error('No encryption key available');
    }
    return this.cryptoManager.decrypt(encryptionResult, key.key);
  }

  /**
   * Authenticate user
   */
  public authenticate(userId: string, password: string): Credentials {
    const credentials = this.authManager.authenticate(userId, password);
    this.auditLog.log(userId, 'authenticate', 'auth', 'success');
    this.anomalyDetector.recordActivity(userId);
    return credentials;
  }

  /**
   * Verify token
   */
  public verifyToken(token: string): Credentials {
    return this.authManager.verifyToken(token);
  }

  /**
   * Refresh token
   */
  public refreshToken(token: string): Credentials {
    const oldCreds = this.authManager.verifyToken(token);
    const newCreds = this.authManager.refreshToken(token);
    this.auditLog.log(oldCreds.userId, 'refresh_token', 'auth', 'success');
    return newCreds;
  }

  /**
   * Revoke token
   */
  public revokeToken(token: string): void {
    this.authManager.revokeToken(token);
    this.auditLog.log('system', 'revoke_token', 'auth', 'success');
  }

  /**
   * Rotate encryption key
   */
  public rotateEncryptionKey(): void {
    this.keyStore.rotateKey('encryption');
    this.auditLog.log('system', 'rotate_key', 'encryption', 'success');
    logger.info('Encryption key rotated');
  }

  /**
   * Get vault stats
   */
  public getStats(): Record<string, unknown> {
    return {
      keyStore: this.keyStore.getStats(),
      credentials: this.authManager.getCredentialCount(),
      auditLog: this.auditLog.getStats(),
      anomalies: this.anomalyDetector.getStats(),
    };
  }

  /**
   * Get security report
   */
  public getSecurityReport(): Record<string, unknown> {
    const auditStats = this.auditLog.getStats();
    const anomalyStats = this.anomalyDetector.getStats();
    const keyStats = this.keyStore.getStats();

    return {
      timestamp: new Date().toISOString(),
      keys: keyStats,
      audit: auditStats,
      anomalies: anomalyStats,
      criticalAlerts: this.anomalyDetector.getCriticalAlerts().length,
      failureRate: auditStats.failureRate,
    };
  }

  /**
   * Start key rotation
   */
  public startKeyRotation(intervalMs?: number): void {
    this.keyStore.startRotation(intervalMs);
  }

  /**
   * Stop key rotation
   */
  public stopKeyRotation(): void {
    this.keyStore.stopRotation();
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.stopKeyRotation();
    this.keyStore.clear();
    logger.info('Secure Vault cleaned up');
  }
}

import { NexusError, ErrorCode, createLogger } from '@nexus/shared';
import { CryptoManager } from '../crypto/CryptoManager';

const logger = createLogger('AuthManager');

/**
 * Authentication credentials
 */
export interface Credentials {
  userId: string;
  token: string;
  expiresAt: Date;
  scopes: string[];
}

/**
 * Auth Manager - Handles authentication and token management
 */
export class AuthManager {
  private credentials: Map<string, Credentials> = new Map();
  private cryptoManager: CryptoManager;
  private tokenTTL: number = 3600000; // 1 hour

  constructor(tokenTTLMs?: number) {
    this.cryptoManager = new CryptoManager();
    if (tokenTTLMs) {
      this.tokenTTL = tokenTTLMs;
    }
  }

  /**
   * Authenticate with username/password
   */
  public authenticate(userId: string, password: string): Credentials {
    // Simplified: in production use bcrypt or similar
    const token = this.cryptoManager.generateToken();
    const expiresAt = new Date(Date.now() + this.tokenTTL);

    const credentials: Credentials = {
      userId,
      token,
      expiresAt,
      scopes: ['read', 'write'],
    };

    this.credentials.set(token, credentials);
    logger.info(`Authentication successful: ${userId}`);

    return credentials;
  }

  /**
   * Verify token
   */
  public verifyToken(token: string): Credentials {
    const credentials = this.credentials.get(token);

    if (!credentials) {
      throw new NexusError(ErrorCode.AUTHENTICATION_ERROR, 'Invalid token');
    }

    if (credentials.expiresAt < new Date()) {
      this.credentials.delete(token);
      throw new NexusError(ErrorCode.AUTHENTICATION_ERROR, 'Token expired');
    }

    return credentials;
  }

  /**
   * Refresh token
   */
  public refreshToken(token: string): Credentials {
    const credentials = this.verifyToken(token);
    this.credentials.delete(token);

    const newToken = this.cryptoManager.generateToken();
    const newExpiresAt = new Date(Date.now() + this.tokenTTL);

    const newCredentials: Credentials = {
      ...credentials,
      token: newToken,
      expiresAt: newExpiresAt,
    };

    this.credentials.set(newToken, newCredentials);
    logger.info(`Token refreshed: ${credentials.userId}`);

    return newCredentials;
  }

  /**
   * Revoke token
   */
  public revokeToken(token: string): void {
    const credentials = this.credentials.get(token);
    if (credentials) {
      this.credentials.delete(token);
      logger.info(`Token revoked: ${credentials.userId}`);
    }
  }

  /**
   * Check permission
   */
  public hasPermission(credentials: Credentials, requiredScope: string): boolean {
    return credentials.scopes.includes(requiredScope);
  }

  /**
   * Grant scope to user
   */
  public grantScope(token: string, scope: string): void {
    const credentials = this.credentials.get(token);
    if (credentials && !credentials.scopes.includes(scope)) {
      credentials.scopes.push(scope);
      logger.info(`Scope granted: ${scope} to ${credentials.userId}`);
    }
  }

  /**
   * Revoke scope from user
   */
  public revokeScope(token: string, scope: string): void {
    const credentials = this.credentials.get(token);
    if (credentials) {
      credentials.scopes = credentials.scopes.filter((s) => s !== scope);
      logger.info(`Scope revoked: ${scope} from ${credentials.userId}`);
    }
  }

  /**
   * Get credentials count
   */
  public getCredentialCount(): number {
    return this.credentials.size;
  }

  /**
   * Clear all credentials
   */
  public clear(): void {
    this.credentials.clear();
    logger.warn('All credentials cleared');
  }
}

import { NexusConfig } from '@nexus/shared';
import { createLogger } from '@nexus/shared';

const logger = createLogger('ConfigManager');

/**
 * Manages NEXUS system configuration
 */
export class ConfigManager {
  private config: NexusConfig;
  private static instance: ConfigManager;

  private constructor(config: NexusConfig) {
    this.config = config;
    this.validate();
  }

  /**
   * Initialize ConfigManager with configuration
   */
  public static initialize(config: NexusConfig): void {
    if (ConfigManager.instance) {
      logger.warn('ConfigManager already initialized, replacing configuration');
    }
    ConfigManager.instance = new ConfigManager(config);
  }

  /**
   * Get ConfigManager instance
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      throw new Error('ConfigManager not initialized. Call initialize() first.');
    }
    return ConfigManager.instance;
  }

  /**
   * Get complete configuration
   */
  public getConfig(): NexusConfig {
    return this.config;
  }

  /**
   * Get specific configuration value
   */
  public get<T = unknown>(key: string): T {
    const keys = key.split('.');
    let value: unknown = this.config;

    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        throw new Error(`Configuration key not found: ${key}`);
      }
    }

    return value as T;
  }

  /**
   * Set configuration value
   */
  public set(key: string, value: unknown): void {
    const keys = key.split('.');
    const lastKey = keys.pop();

    if (!lastKey) {
      throw new Error('Invalid configuration key');
    }

    let target: unknown = this.config;
    for (const k of keys) {
      if (typeof target === 'object' && target !== null && k in target) {
        target = (target as Record<string, unknown>)[k];
      } else {
        throw new Error(`Configuration path not found: ${key}`);
      }
    }

    if (typeof target === 'object' && target !== null) {
      (target as Record<string, unknown>)[lastKey] = value;
      logger.info(`Configuration updated: ${key}`);
    }
  }

  /**
   * Validate configuration
   */
  private validate(): void {
    const required = ['nodeId', 'environment', 'messagebroker', 'database', 'api'];
    for (const field of required) {
      if (!(field in this.config)) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }
    logger.info('Configuration validated successfully');
  }

  /**
   * Get environment
   */
  public getEnvironment(): string {
    return this.config.environment;
  }

  /**
   * Get node ID
   */
  public getNodeId(): string {
    return this.config.nodeId;
  }

  /**
   * Is production environment
   */
  public isProduction(): boolean {
    return this.config.environment === 'production';
  }
}

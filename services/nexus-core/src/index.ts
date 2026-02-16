import { ConfigManager } from '@nexus/core';
import { NeuralMesh } from '@nexus/neural-mesh';
import { AgentRegistry, AgentDiscovery, AgentLifecycle } from '@nexus/agent-registry';
import { TaskOrchestrator, TaskRouter, ResilientOrchestrator } from '@nexus/task-orchestrator';
import { SecureVault } from '@nexus/secure-vault';
import { MetricsCollector, PerformanceAnalytics } from '@nexus/insight-engine';
import { createLogger } from '@nexus/shared';

const logger = createLogger('NexusCoreService');

/**
 * NEXUS Core Service - Main entry point
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting NEXUS Core Service');

    // Initialize configuration
    const config = {
      nodeId: process.env.NEXUS_NODE_ID || 'nexus-core-1',
      environment: (process.env.NODE_ENV || 'development') as any,
      logLevel: (process.env.LOG_LEVEL || 'info') as any,
      messagebroker: {
        type: 'redis' as const,
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        options: {},
      },
      database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost/nexus',
        maxConnections: 20,
      },
      api: {
        port: parseInt(process.env.PORT || '8080', 10),
        host: process.env.HOST || '0.0.0.0',
      },
      security: {
        enableEncryption: true,
        keyRotationInterval: 604800000, // 7 days
      },
    };

    ConfigManager.initialize(config);
    logger.info('Configuration initialized', { nodeId: config.nodeId });

    // Initialize security
    const secureVault = new SecureVault();
    secureVault.startKeyRotation(config.security.keyRotationInterval);
    logger.info('Secure Vault initialized');

    // Initialize Neural Mesh
    const mesh = new NeuralMesh({ nodeId: config.nodeId });
    mesh.start();
    logger.info('Neural Mesh started');

    // Initialize Agent Ecosystem
    const agentRegistry = new AgentRegistry();
    const agentDiscovery = new AgentDiscovery(config.nodeId);
    const agentLifecycle = new AgentLifecycle();
    agentLifecycle.startHealthChecks();
    logger.info('Agent Ecosystem initialized');

    // Initialize Task Orchestration
    const taskOrchestrator = new TaskOrchestrator(agentRegistry);
    const taskRouter = new TaskRouter(agentRegistry);
    const resilientOrchestrator = new ResilientOrchestrator(taskOrchestrator, taskRouter);
    logger.info('Task Orchestration initialized');

    // Initialize Insights
    const metricsCollector = new MetricsCollector();
    const performanceAnalytics = new PerformanceAnalytics();
    logger.info('Insight Engine initialized');

    // Setup graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, shutting down gracefully`);

      agentLifecycle.stopHealthChecks();
      mesh.stop();
      secureVault.stopKeyRotation();
      secureVault.cleanup();
      await agentLifecycle.cleanup();

      logger.info('NEXUS Core Service shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    logger.info('NEXUS Core Service started successfully', {
      environment: config.environment,
      port: config.api.port,
    });

    // Keep process running
    await new Promise(() => {
      // Process will be kept alive by the event loop
    });
  } catch (error) {
    logger.error('Failed to start NEXUS Core Service', { error });
    process.exit(1);
  }
}

// Start the service
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

import { ConfigManager } from '@nexus/core';
import { NeuralMesh } from '@nexus/neural-mesh';
import { AgentRegistry, AgentDiscovery, Agent, AgentLifecycle } from '@nexus/agent-registry';
import { TaskOrchestrator, TaskRouter, ResilientOrchestrator } from '@nexus/task-orchestrator';
import { SecureVault } from '@nexus/secure-vault';
import { MetricsCollector, PerformanceAnalytics } from '@nexus/insight-engine';
import { AgentMetadata } from '@nexus/shared';

describe('NEXUS Integration Tests', () => {
  let configManager: ConfigManager;
  let mesh: NeuralMesh;
  let agentRegistry: AgentRegistry;
  let taskOrchestrator: TaskOrchestrator;
  let taskRouter: TaskRouter;
  let secureVault: SecureVault;
  let metricsCollector: MetricsCollector;

  beforeAll(() => {
    const config = {
      nodeId: 'test-node',
      environment: 'test' as const,
      logLevel: 'error' as const,
      messagebroker: {
        type: 'redis' as const,
        url: 'redis://localhost:6379',
        options: {},
      },
      database: {
        url: 'postgresql://localhost/nexus',
        maxConnections: 10,
      },
      api: {
        port: 8080,
        host: 'localhost',
      },
      security: {
        enableEncryption: true,
        keyRotationInterval: 604800000,
      },
    };

    ConfigManager.initialize(config);
    configManager = ConfigManager.getInstance();

    mesh = new NeuralMesh({ nodeId: 'test-node' });
    agentRegistry = new AgentRegistry();
    taskOrchestrator = new TaskOrchestrator(agentRegistry);
    taskRouter = new TaskRouter(agentRegistry);
    secureVault = new SecureVault();
    metricsCollector = new MetricsCollector();
  });

  afterAll(() => {
    mesh.stop();
    secureVault.cleanup();
  });

  describe('System Integration', () => {
    it('should initialize all components', () => {
      expect(configManager.getNodeId()).toBe('test-node');
      expect(mesh.getNodeId()).toBe('test-node');
      expect(agentRegistry.getAgentCount()).toBe(0);
    });

    it('should register and discover agents', () => {
      const agent: AgentMetadata = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'llm',
        capabilities: [
          {
            name: 'test-capability',
            version: '1.0',
            description: 'Test',
            inputSchema: {},
            outputSchema: {},
          },
        ],
        reputationScore: 1.0,
        lastHeartbeat: new Date(),
        status: 'online',
      };

      agentRegistry.register(agent);
      expect(agentRegistry.getAgentCount()).toBe(1);
      expect(agentRegistry.getAgent('agent-1')).toBeDefined();
    });

    it('should route tasks to agents', () => {
      const task = taskOrchestrator.createJob('user-1', 'Test Job', 'Test objective');
      const decomposed = taskOrchestrator.decomposeTasks(task.id, [
        {
          name: 'Subtask 1',
          objective: 'Do something',
        },
      ]);

      expect(decomposed).toHaveLength(1);

      const decision = taskRouter.findBestAgent(decomposed[0]);
      expect(decision).not.toBeNull();
      expect(decision?.agentId).toBe('agent-1');
    });

    it('should handle encryption/decryption', () => {
      const plaintext = Buffer.from('sensitive data');
      const encrypted = secureVault.encryptData(plaintext);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      const decrypted = secureVault.decryptData(encrypted);
      expect(decrypted.toString()).toBe('sensitive data');
    });

    it('should collect metrics', () => {
      metricsCollector.recordMetric('task.duration', 1000);
      metricsCollector.recordMetric('task.duration', 1500);
      metricsCollector.recordMetric('task.duration', 1200);

      const stats = metricsCollector.getStatistics('task.duration');
      expect(stats?.count).toBe(3);
      expect(stats?.avg).toBeGreaterThan(1000);
      expect(stats?.max).toBe(1500);
    });

    it('should authenticate users', () => {
      const creds = secureVault.authenticate('testuser', 'password');
      expect(creds.userId).toBe('testuser');
      expect(creds.token).toBeDefined();

      const verified = secureVault.verifyToken(creds.token);
      expect(verified.userId).toBe('testuser');
    });
  });

  describe('End-to-End Task Execution', () => {
    it('should complete task workflow', async () => {
      // Create job
      const job = taskOrchestrator.createJob('user-1', 'E2E Test', 'Complete workflow');

      // Decompose tasks
      const tasks = taskOrchestrator.decomposeTasks(job.id, [
        { name: 'Task 1', objective: 'Do work' },
        { name: 'Task 2', objective: 'Verify' },
      ]);

      expect(tasks).toHaveLength(2);

      // Assign to agent
      taskOrchestrator.assignTask(tasks[0].id, 'agent-1');
      expect(taskOrchestrator.getTask(tasks[0].id).status).toBe('queued');

      // Complete task
      taskOrchestrator.completeTask(tasks[0].id, { result: 'success' });
      expect(taskOrchestrator.getTask(tasks[0].id).status).toBe('completed');
    });
  });

  describe('Security & Compliance', () => {
    it('should audit actions', () => {
      secureVault.authenticate('audit-test', 'pass');
      const report = secureVault.getSecurityReport();

      expect(report.audit).toBeDefined();
      expect(report.audit?.totalEntries).toBeGreaterThan(0);
    });

    it('should track anomalies', () => {
      const report = secureVault.getSecurityReport();
      expect(report.anomalies).toBeDefined();
    });

    it('should provide security stats', () => {
      const stats = secureVault.getStats();

      expect(stats.keyStore).toBeDefined();
      expect(stats.auditLog).toBeDefined();
      expect(stats.anomalies).toBeDefined();
    });
  });

  describe('Performance & Load Testing', () => {
    it('should handle multiple tasks', () => {
      const job = taskOrchestrator.createJob('user-1', 'Load Test', 'Process many tasks');

      const taskDefs = Array.from({ length: 100 }, (_, i) => ({
        name: `Task ${i}`,
        objective: 'Process',
      }));

      const tasks = taskOrchestrator.decomposeTasks(job.id, taskDefs);
      expect(tasks).toHaveLength(100);

      // Assign all to same agent
      for (const task of tasks) {
        taskOrchestrator.assignTask(task.id, 'agent-1');
      }

      expect(taskOrchestrator.getJobTasks(job.id)).toHaveLength(100);
    });

    it('should handle rapid authentication', () => {
      const users = Array.from({ length: 50 }, (_, i) => `user-${i}`);

      for (const userId of users) {
        const creds = secureVault.authenticate(userId, 'password');
        expect(creds.token).toBeDefined();
      }

      const stats = secureVault.getStats();
      expect(stats.credentials).toBeGreaterThan(0);
    });
  });
});

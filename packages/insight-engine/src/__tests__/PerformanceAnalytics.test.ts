import { PerformanceAnalytics } from '../analytics/PerformanceAnalytics';

describe('PerformanceAnalytics', () => {
  let analytics: PerformanceAnalytics;

  beforeEach(() => {
    analytics = new PerformanceAnalytics();
  });

  describe('sample recording', () => {
    it('should record performance sample', () => {
      const sample = {
        taskId: 'task-1',
        agentId: 'agent-1',
        duration: 1000,
        successRate: 0.99,
        resourceUsage: { cpu: 50, memory: 1024000 },
        timestamp: new Date(),
      };

      analytics.recordSample(sample);
      const metrics = analytics.getAgentPerformance('agent-1');

      expect(metrics).toBeDefined();
      expect(metrics?.tasksCompleted).toBe(1);
    });

    it('should track success and failure', () => {
      const successSample = {
        taskId: 'task-1',
        agentId: 'agent-1',
        duration: 1000,
        successRate: 0.99,
        resourceUsage: { cpu: 50, memory: 1024000 },
        timestamp: new Date(),
      };

      const failureSample = {
        taskId: 'task-2',
        agentId: 'agent-1',
        duration: 500,
        successRate: 0.5,
        resourceUsage: { cpu: 60, memory: 2048000 },
        timestamp: new Date(),
      };

      analytics.recordSample(successSample);
      analytics.recordSample(failureSample);

      const metrics = analytics.getAgentPerformance('agent-1');
      expect(metrics?.tasksCompleted).toBe(1);
      expect(metrics?.tasksFailed).toBe(1);
    });
  });

  describe('agent metrics', () => {
    it('should calculate average metrics', () => {
      for (let i = 0; i < 3; i++) {
        analytics.recordSample({
          taskId: `task-${i}`,
          agentId: 'agent-1',
          duration: 1000 + i * 100,
          successRate: 0.99,
          resourceUsage: { cpu: 50 + i * 5, memory: 1000000 + i * 100000 },
          timestamp: new Date(),
        });
      }

      const metrics = analytics.getAgentPerformance('agent-1');
      expect(metrics?.avgDuration).toBeGreaterThan(1000);
      expect(metrics?.avgCpuUsage).toBeGreaterThan(50);
    });

    it('should rank agents by performance', () => {
      // Good agent
      analytics.recordSample({
        taskId: 'task-1',
        agentId: 'agent-1',
        duration: 500,
        successRate: 0.99,
        resourceUsage: { cpu: 30, memory: 500000 },
        timestamp: new Date(),
      });

      // Poor agent
      analytics.recordSample({
        taskId: 'task-2',
        agentId: 'agent-2',
        duration: 5000,
        successRate: 0.5,
        resourceUsage: { cpu: 90, memory: 5000000 },
        timestamp: new Date(),
      });

      const topAgents = analytics.getTopAgents(1);
      expect(topAgents[0].agentId).toBe('agent-1');
    });
  });

  describe('filtering', () => {
    it('should filter samples by agent', () => {
      analytics.recordSample({
        taskId: 'task-1',
        agentId: 'agent-1',
        duration: 1000,
        successRate: 0.99,
        resourceUsage: { cpu: 50, memory: 1000000 },
        timestamp: new Date(),
      });

      analytics.recordSample({
        taskId: 'task-2',
        agentId: 'agent-2',
        duration: 2000,
        successRate: 0.95,
        resourceUsage: { cpu: 60, memory: 2000000 },
        timestamp: new Date(),
      });

      const agent1Samples = analytics.getSamplesByAgent('agent-1');
      expect(agent1Samples).toHaveLength(1);
      expect(agent1Samples[0].agentId).toBe('agent-1');
    });

    it('should filter samples by time range', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 60000);
      const future = new Date(now.getTime() + 60000);

      analytics.recordSample({
        taskId: 'task-1',
        agentId: 'agent-1',
        duration: 1000,
        successRate: 0.99,
        resourceUsage: { cpu: 50, memory: 1000000 },
        timestamp: now,
      });

      const samples = analytics.getSamplesInRange(past, future);
      expect(samples).toHaveLength(1);
    });
  });

  describe('summary', () => {
    it('should provide performance summary', () => {
      analytics.recordSample({
        taskId: 'task-1',
        agentId: 'agent-1',
        duration: 1000,
        successRate: 0.99,
        resourceUsage: { cpu: 50, memory: 1000000 },
        timestamp: new Date(),
      });

      const summary = analytics.getSummary();
      expect(summary.totalSamples).toBe(1);
      expect(summary.agentCount).toBe(1);
      expect(summary.overallSuccessRate).toBeGreaterThan(0.9);
    });
  });
});

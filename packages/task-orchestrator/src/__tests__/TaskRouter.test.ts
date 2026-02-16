import { TaskRouter } from '../routing/TaskRouter';
import { AgentRegistry } from '@nexus/agent-registry';
import { Task } from '@nexus/shared';

describe('TaskRouter', () => {
  let router: TaskRouter;
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
    router = new TaskRouter(registry);
  });

  describe('agent selection', () => {
    it('should find best agent for task', () => {
      registry.register({
        id: 'agent-1',
        name: 'Agent 1',
        type: 'llm',
        capabilities: [
          {
            name: 'nlp',
            version: '1.0',
            description: 'NLP',
            inputSchema: {},
            outputSchema: {},
          },
        ],
        reputationScore: 0.9,
        lastHeartbeat: new Date(),
        status: 'online',
      });

      const task: Task = {
        id: 'task-1',
        name: 'Test Task',
        description: 'Test',
        objective: 'Process text',
        status: 'pending',
        priority: 1,
        dependencies: [],
        createdAt: new Date(),
        metadata: { requiredCapability: 'nlp' },
      };

      const decision = router.findBestAgent(task);
      expect(decision).not.toBeNull();
      expect(decision?.agentId).toBe('agent-1');
      expect(decision?.confidence).toBeGreaterThan(0);
    });

    it('should return null when no agents available', () => {
      const task: Task = {
        id: 'task-1',
        name: 'Test Task',
        description: 'Test',
        objective: 'Process text',
        status: 'pending',
        priority: 1,
        dependencies: [],
        createdAt: new Date(),
        metadata: {},
      };

      const decision = router.findBestAgent(task);
      expect(decision).toBeNull();
    });

    it('should prefer agents with higher reputation', () => {
      registry.register({
        id: 'agent-1',
        name: 'Agent 1',
        type: 'llm',
        capabilities: [],
        reputationScore: 0.5,
        lastHeartbeat: new Date(),
        status: 'online',
      });

      registry.register({
        id: 'agent-2',
        name: 'Agent 2',
        type: 'llm',
        capabilities: [],
        reputationScore: 0.9,
        lastHeartbeat: new Date(),
        status: 'online',
      });

      const task: Task = {
        id: 'task-1',
        name: 'Test Task',
        description: 'Test',
        objective: 'Process text',
        status: 'pending',
        priority: 1,
        dependencies: [],
        createdAt: new Date(),
        metadata: {},
      };

      const decision = router.findBestAgent(task);
      expect(decision?.agentId).toBe('agent-2');
    });
  });

  describe('filtering', () => {
    it('should skip offline agents', () => {
      registry.register({
        id: 'agent-1',
        name: 'Agent 1',
        type: 'llm',
        capabilities: [],
        reputationScore: 0.9,
        lastHeartbeat: new Date(),
        status: 'offline',
      });

      const task: Task = {
        id: 'task-1',
        name: 'Test Task',
        description: 'Test',
        objective: 'Process text',
        status: 'pending',
        priority: 1,
        dependencies: [],
        createdAt: new Date(),
        metadata: {},
      };

      const decision = router.findBestAgent(task);
      expect(decision).toBeNull();
    });

    it('should skip low reputation agents', () => {
      registry.register({
        id: 'agent-1',
        name: 'Agent 1',
        type: 'llm',
        capabilities: [],
        reputationScore: 0.2, // Below threshold
        lastHeartbeat: new Date(),
        status: 'online',
      });

      const task: Task = {
        id: 'task-1',
        name: 'Test Task',
        description: 'Test',
        objective: 'Process text',
        status: 'pending',
        priority: 1,
        dependencies: [],
        createdAt: new Date(),
        metadata: {},
      };

      const decision = router.findBestAgent(task);
      expect(decision).toBeNull();
    });
  });

  describe('fallback', () => {
    it('should find alternative agent', () => {
      registry.register({
        id: 'agent-1',
        name: 'Agent 1',
        type: 'llm',
        capabilities: [],
        reputationScore: 0.9,
        lastHeartbeat: new Date(),
        status: 'online',
      });

      registry.register({
        id: 'agent-2',
        name: 'Agent 2',
        type: 'llm',
        capabilities: [],
        reputationScore: 0.8,
        lastHeartbeat: new Date(),
        status: 'online',
      });

      const task: Task = {
        id: 'task-1',
        name: 'Test Task',
        description: 'Test',
        objective: 'Process text',
        status: 'pending',
        priority: 1,
        dependencies: [],
        createdAt: new Date(),
        metadata: {},
      };

      const alternative = router.findAlternativeAgent(task, 'agent-1');
      expect(alternative?.agentId).toBe('agent-2');
    });
  });
});

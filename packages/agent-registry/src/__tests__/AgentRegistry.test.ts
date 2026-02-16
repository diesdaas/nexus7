import { AgentRegistry } from '../registry/AgentRegistry';
import { AgentMetadata } from '@nexus/shared';
import { ErrorCode } from '@nexus/shared';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('register', () => {
    it('should register an agent', () => {
      const agent: AgentMetadata = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'llm',
        capabilities: [],
        reputationScore: 1.0,
        lastHeartbeat: new Date(),
        status: 'online',
      };

      registry.register(agent);
      const retrieved = registry.getAgent('agent-1');
      expect(retrieved.id).toBe('agent-1');
    });

    it('should update existing agent', () => {
      const agent1: AgentMetadata = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'llm',
        capabilities: [],
        reputationScore: 1.0,
        lastHeartbeat: new Date(),
        status: 'online',
      };

      const agent2: AgentMetadata = {
        ...agent1,
        status: 'offline',
      };

      registry.register(agent1);
      registry.register(agent2);

      expect(registry.getAgentCount()).toBe(1);
      expect(registry.getAgent('agent-1').status).toBe('offline');
    });
  });

  describe('unregister', () => {
    it('should remove an agent', () => {
      const agent: AgentMetadata = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'llm',
        capabilities: [],
        reputationScore: 1.0,
        lastHeartbeat: new Date(),
        status: 'online',
      };

      registry.register(agent);
      expect(registry.getAgentCount()).toBe(1);

      registry.unregister('agent-1');
      expect(registry.getAgentCount()).toBe(0);
    });
  });

  describe('getAgent', () => {
    it('should throw when agent not found', () => {
      expect(() => registry.getAgent('nonexistent')).toThrow();
    });
  });

  describe('getAgentsByType', () => {
    it('should filter agents by type', () => {
      const llmAgent: AgentMetadata = {
        id: 'agent-1',
        name: 'LLM Agent',
        type: 'llm',
        capabilities: [],
        reputationScore: 1.0,
        lastHeartbeat: new Date(),
        status: 'online',
      };

      const toolAgent: AgentMetadata = {
        id: 'agent-2',
        name: 'Tool Agent',
        type: 'tool',
        capabilities: [],
        reputationScore: 1.0,
        lastHeartbeat: new Date(),
        status: 'online',
      };

      registry.register(llmAgent);
      registry.register(toolAgent);

      const llms = registry.getAgentsByType('llm');
      expect(llms).toHaveLength(1);
      expect(llms[0].id).toBe('agent-1');
    });
  });
});

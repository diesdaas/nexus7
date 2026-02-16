import { CapabilityIndex } from '../capability/CapabilityIndex';
import { AgentCapability } from '@nexus/shared';

describe('CapabilityIndex', () => {
  let index: CapabilityIndex;

  beforeEach(() => {
    index = new CapabilityIndex();
  });

  describe('indexAgent', () => {
    it('should index agent capabilities', () => {
      const capabilities: AgentCapability[] = [
        {
          name: 'nlp',
          version: '1.0',
          description: 'Natural language processing',
          inputSchema: {},
          outputSchema: {},
        },
        {
          name: 'translation',
          version: '1.0',
          description: 'Language translation',
          inputSchema: {},
          outputSchema: {},
        },
      ];

      index.indexAgent('agent-1', capabilities);

      expect(index.getAgentsWithCapability('nlp')).toContain('agent-1');
      expect(index.getAgentsWithCapability('translation')).toContain('agent-1');
    });
  });

  describe('getAgentsWithCapability', () => {
    it('should return agents with capability', () => {
      const capability: AgentCapability = {
        name: 'nlp',
        version: '1.0',
        description: 'NLP',
        inputSchema: {},
        outputSchema: {},
      };

      index.indexAgent('agent-1', [capability]);
      index.indexAgent('agent-2', [capability]);

      const agents = index.getAgentsWithCapability('nlp');
      expect(agents).toHaveLength(2);
    });

    it('should return empty array for unknown capability', () => {
      const agents = index.getAgentsWithCapability('unknown');
      expect(agents).toEqual([]);
    });
  });

  describe('removeAgent', () => {
    it('should remove agent from index', () => {
      const capability: AgentCapability = {
        name: 'nlp',
        version: '1.0',
        description: 'NLP',
        inputSchema: {},
        outputSchema: {},
      };

      index.indexAgent('agent-1', [capability]);
      expect(index.getAgentsWithCapability('nlp')).toHaveLength(1);

      index.removeAgent('agent-1');
      expect(index.getAgentsWithCapability('nlp')).toHaveLength(0);
    });
  });

  describe('searchCapabilities', () => {
    it('should search capabilities by pattern', () => {
      const capabilities: AgentCapability[] = [
        { name: 'nlp-sentiment', version: '1.0', description: '', inputSchema: {}, outputSchema: {} },
        { name: 'nlp-ner', version: '1.0', description: '', inputSchema: {}, outputSchema: {} },
        { name: 'translation', version: '1.0', description: '', inputSchema: {}, outputSchema: {} },
      ];

      index.indexAgent('agent-1', capabilities);

      const results = index.searchCapabilities('nlp');
      expect(results).toHaveLength(2);
    });
  });
});

import { NeuralMesh } from '../mesh/NeuralMesh';

describe('NeuralMesh', () => {
  let mesh: NeuralMesh;

  beforeEach(() => {
    mesh = new NeuralMesh({ nodeId: 'node-1' });
  });

  afterEach(() => {
    mesh.stop();
  });

  describe('initialization', () => {
    it('should initialize with node ID', () => {
      expect(mesh.getNodeId()).toBe('node-1');
    });

    it('should start and stop', async () => {
      mesh.start();
      await mesh.stop();
      expect(mesh.getNodeId()).toBe('node-1');
    });
  });

  describe('peer registration', () => {
    it('should register a peer', () => {
      mesh.registerPeer('node-2');
      const stats = mesh.getStats();
      expect(stats.routing).toBeDefined();
    });
  });

  describe('state management', () => {
    it('should set and get state', () => {
      mesh.publishState('key1', 'value1');
      expect(mesh.getState('key1')).toBe('value1');
    });

    it('should notify on state changes', (done) => {
      const unsubscribe = mesh.onStateChange((change) => {
        expect(change.key).toBe('key1');
        expect(change.newValue).toBe('value1');
        unsubscribe();
        done();
      });

      mesh.publishState('key1', 'value1');
    });
  });

  describe('message handlers', () => {
    it('should register and call message handler', async () => {
      const handler = jest.fn();
      mesh.onMessage('test', handler);

      const message: any = {
        id: '1',
        type: 'test',
        from: 'node-2',
        to: 'node-1',
        timestamp: new Date(),
        payload: {},
        priority: 'normal',
      };

      await mesh.handleMessage(message);
      expect(handler).toHaveBeenCalledWith(message);
    });
  });

  describe('stats', () => {
    it('should return mesh stats', () => {
      mesh.registerPeer('node-2');
      const stats = mesh.getStats();

      expect(stats.nodeId).toBe('node-1');
      expect(stats.connections).toBeDefined();
      expect(stats.routing).toBeDefined();
      expect(stats.flowControl).toBeDefined();
    });
  });
});

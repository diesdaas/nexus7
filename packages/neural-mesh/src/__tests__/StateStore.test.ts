import { StateStore } from '../synchronization/StateStore';

describe('StateStore', () => {
  let store: StateStore;

  beforeEach(() => {
    store = new StateStore('node-1');
  });

  describe('state management', () => {
    it('should set and get state', () => {
      store.setState('key1', 'value1');
      expect(store.getState('key1')).toBe('value1');
    });

    it('should delete state', () => {
      store.setState('key1', 'value1');
      store.deleteState('key1');
      expect(store.getState('key1')).toBeUndefined();
    });

    it('should track version', () => {
      store.setState('key1', 'value1');
      const { value, version } = store.getStateWithVersion('key1') || {};
      expect(value).toBe('value1');
      expect(version).toBe(1);
    });
  });

  describe('change listeners', () => {
    it('should notify listeners on state change', (done) => {
      const listener = jest.fn((change) => {
        expect(change.key).toBe('key1');
        expect(change.newValue).toBe('value1');
        expect(change.source).toBe('node-1');
        done();
      });

      store.onChange(listener);
      store.setState('key1', 'value1');
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = store.onChange(listener);

      unsubscribe();
      store.setState('key1', 'value1');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      store.onChange(listener1);
      store.onChange(listener2);

      store.setState('key1', 'value1');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('conflict resolution', () => {
    it('should apply recent remote changes', () => {
      const change = {
        key: 'key1',
        oldValue: undefined,
        newValue: 'remote-value',
        timestamp: new Date(),
        source: 'node-2',
      };

      const applied = store.applyRemoteChange(change);
      expect(applied).toBe(true);
      expect(store.getState('key1')).toBe('remote-value');
    });
  });

  describe('utilities', () => {
    it('should get all state', () => {
      store.setState('key1', 'value1');
      store.setState('key2', 'value2');

      const all = store.getAllState();
      expect(all).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should clear all state', () => {
      store.setState('key1', 'value1');
      store.clear();
      expect(store.getSize()).toBe(0);
    });
  });
});

import { Cache } from '../cache/Cache';

describe('Cache', () => {
  let cache: Cache<string, string>;

  beforeEach(() => {
    cache = new Cache({ maxSize: 5, ttl: 60000 });
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should delete values', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('eviction policy', () => {
    it('should evict LRU entry when full', () => {
      for (let i = 1; i <= 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      expect(cache.size()).toBe(5);

      // Access key1 to make it recently used
      cache.get('key1');

      // Add new entry - should evict key2 (least recently used)
      cache.set('key6', 'value6');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key6')).toBe(true);
    });

    it('should track hit rate', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');
      cache.get('missing');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });
  });

  describe('expiration', () => {
    it('should expire entries after TTL', (done) => {
      const shortCache = new Cache<string, string>({ maxSize: 10, ttl: 100 });

      shortCache.set('key1', 'value1');
      expect(shortCache.get('key1')).toBe('value1');

      setTimeout(() => {
        expect(shortCache.get('key1')).toBeUndefined();
        done();
      }, 150);
    });
  });

  describe('stats', () => {
    it('should provide cache statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');
      cache.get('missing');

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(5);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit rate', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');
      cache.get('missing');

      const stats = cache.getStats();
      const hitRate = parseFloat(stats.hitRate as string);
      expect(hitRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
    });
  });
});

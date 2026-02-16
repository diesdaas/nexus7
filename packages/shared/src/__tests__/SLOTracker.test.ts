import { SLOTracker } from '../slo/SLOTracker';

describe('SLOTracker', () => {
  let tracker: SLOTracker;

  beforeEach(() => {
    tracker = new SLOTracker();
  });

  describe('SLO registration', () => {
    it('should register SLO', () => {
      tracker.registerSLO({
        name: 'availability',
        target: 99.9,
        window: 86400000, // 1 day
        description: 'System availability target',
      });

      const status = tracker.getStatus('availability');
      expect(status).toBeDefined();
      expect(status?.target).toBe(99.9);
    });
  });

  describe('measurements', () => {
    it('should record measurements', () => {
      tracker.registerSLO({
        name: 'latency',
        target: 95.0,
        window: 300000, // 5 minutes
        description: 'Latency SLI',
      });

      for (let i = 0; i < 10; i++) {
        tracker.recordMeasurement('latency', 90 + Math.random() * 10);
      }

      const status = tracker.getStatus('latency');
      expect(status?.current).toBeGreaterThan(0);
      expect(status?.current).toBeLessThanOrEqual(100);
    });

    it('should calculate SLI correctly', () => {
      tracker.registerSLO({
        name: 'availability',
        target: 99.0,
        window: 300000,
        description: 'Availability SLI',
      });

      tracker.recordMeasurement('availability', 100);
      tracker.recordMeasurement('availability', 98);
      tracker.recordMeasurement('availability', 99);

      const status = tracker.getStatus('availability');
      expect(status?.current).toBe(99);
    });
  });

  describe('SLO status', () => {
    it('should report healthy status', () => {
      tracker.registerSLO({
        name: 'test',
        target: 95.0,
        window: 300000,
        description: 'Test SLO',
      });

      tracker.recordMeasurement('test', 99);
      const status = tracker.getStatus('test');

      expect(status?.status).toBe('healthy');
    });

    it('should report warning status', () => {
      tracker.registerSLO({
        name: 'test',
        target: 95.0,
        window: 300000,
        description: 'Test SLO',
      });

      tracker.recordMeasurement('test', 96);
      const status = tracker.getStatus('test');

      expect(status?.status).toBe('warning');
    });

    it('should report violated status', () => {
      tracker.registerSLO({
        name: 'test',
        target: 95.0,
        window: 300000,
        description: 'Test SLO',
      });

      tracker.recordMeasurement('test', 90);
      const status = tracker.getStatus('test');

      expect(status?.status).toBe('violated');
    });
  });

  describe('error budget', () => {
    it('should calculate error budget', () => {
      tracker.registerSLO({
        name: 'availability',
        target: 99.0,
        window: 300000,
        description: 'Availability',
      });

      tracker.recordMeasurement('availability', 99.5);
      const budget = tracker.getErrorBudget('availability');

      expect(budget).toBeGreaterThan(0);
    });
  });

  describe('health report', () => {
    it('should provide comprehensive health report', () => {
      tracker.registerSLO({
        name: 'availability',
        target: 99.0,
        window: 300000,
        description: 'Availability',
      });

      tracker.registerSLO({
        name: 'latency',
        target: 95.0,
        window: 300000,
        description: 'Latency',
      });

      tracker.recordMeasurement('availability', 99.5);
      tracker.recordMeasurement('latency', 96);

      const report = tracker.getHealthReport();

      expect(report.totalSLOs).toBe(2);
      expect(report.healthy).toBeGreaterThanOrEqual(0);
      expect(report.healthPercentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('violation detection', () => {
    it('should detect SLO violations', () => {
      tracker.registerSLO({
        name: 'test',
        target: 95.0,
        window: 300000,
        description: 'Test',
      });

      tracker.recordMeasurement('test', 90);
      expect(tracker.isViolated('test')).toBe(true);
    });

    it('should return false for non-violations', () => {
      tracker.registerSLO({
        name: 'test',
        target: 95.0,
        window: 300000,
        description: 'Test',
      });

      tracker.recordMeasurement('test', 98);
      expect(tracker.isViolated('test')).toBe(false);
    });
  });
});

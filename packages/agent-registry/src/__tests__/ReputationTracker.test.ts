import { ReputationTracker } from '../reputation/ReputationTracker';
import { DEFAULTS } from '@nexus/shared';

describe('ReputationTracker', () => {
  let tracker: ReputationTracker;

  beforeEach(() => {
    tracker = new ReputationTracker();
  });

  describe('initializeAgent', () => {
    it('should initialize agent with default score', () => {
      tracker.initializeAgent('agent-1');
      expect(tracker.getScore('agent-1')).toBe(1.0);
    });

    it('should clamp score between 0 and 1', () => {
      tracker.initializeAgent('agent-1', 1.5);
      expect(tracker.getScore('agent-1')).toBe(1.0);

      tracker.initializeAgent('agent-2', -0.5);
      expect(tracker.getScore('agent-2')).toBe(0);
    });
  });

  describe('recordSuccess', () => {
    it('should increment score', () => {
      tracker.initializeAgent('agent-1', 0.8);
      tracker.recordSuccess('agent-1');

      const score = tracker.getScore('agent-1');
      expect(score).toBe(0.8 + DEFAULTS.REPUTATION_INCREMENT_SUCCESS);
    });

    it('should increment success count', () => {
      tracker.initializeAgent('agent-1');
      tracker.recordSuccess('agent-1');

      const record = tracker.getReputation('agent-1');
      expect(record?.successCount).toBe(1);
    });
  });

  describe('recordFailure', () => {
    it('should decrement score', () => {
      tracker.initializeAgent('agent-1', 0.8);
      tracker.recordFailure('agent-1');

      const score = tracker.getScore('agent-1');
      expect(score).toBe(0.8 - DEFAULTS.REPUTATION_DECREMENT_FAILURE);
    });

    it('should increment failure count', () => {
      tracker.initializeAgent('agent-1');
      tracker.recordFailure('agent-1');

      const record = tracker.getReputation('agent-1');
      expect(record?.failureCount).toBe(1);
    });
  });

  describe('shouldQuarantine', () => {
    it('should return true when below threshold', () => {
      tracker.initializeAgent('agent-1', DEFAULTS.REPUTATION_THRESHOLD_QUARANTINE - 0.01);
      expect(tracker.shouldQuarantine('agent-1')).toBe(true);
    });

    it('should return false when above threshold', () => {
      tracker.initializeAgent('agent-1', DEFAULTS.REPUTATION_THRESHOLD_QUARANTINE + 0.01);
      expect(tracker.shouldQuarantine('agent-1')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should calculate correct statistics', () => {
      tracker.initializeAgent('agent-1', 0.8);
      tracker.initializeAgent('agent-2', 0.6);

      const stats = tracker.getStats();
      expect(stats.agents).toBe(2);
      expect(stats.avgScore).toBeCloseTo(0.7, 2);
    });
  });
});

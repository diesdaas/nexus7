/**
 * NEXUS Shared Constants
 */

export const MESSAGE_TYPES = {
  TASK_ASSIGNMENT: 'task_assignment',
  TASK_RESULT: 'task_result',
  TASK_ERROR: 'task_error',
  HEARTBEAT: 'heartbeat',
  STATE_SYNC: 'state_sync',
  DISCOVERY: 'discovery',
  AUTH: 'auth',
  ERROR: 'error',
} as const;

export const AGENT_TYPES = {
  LLM: 'llm',
  TOOL: 'tool',
  SERVICE: 'service',
  HUMAN: 'human',
} as const;

export const AGENT_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  DEGRADED: 'degraded',
  QUARANTINED: 'quarantined',
} as const;

export const TASK_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying',
} as const;

export const MESSAGE_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const DEFAULT_TIMEOUTS = {
  TASK_EXECUTION: 300000, // 5 minutes
  HEARTBEAT: 30000, // 30 seconds
  MESSAGE_TTL: 3600000, // 1 hour
  STATE_SYNC: 5000, // 5 seconds
} as const;

export const DEFAULTS = {
  MAX_RETRIES: 3,
  BACKOFF_MULTIPLIER: 2,
  INITIAL_BACKOFF: 1000,
  MAX_BACKOFF: 30000,
  REPUTATION_THRESHOLD_QUARANTINE: 0.3,
  REPUTATION_INCREMENT_SUCCESS: 0.1,
  REPUTATION_DECREMENT_FAILURE: 0.2,
} as const;

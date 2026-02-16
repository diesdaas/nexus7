/**
 * NEXUS Shared Types
 * Core type definitions used across all NEXUS packages
 */

/**
 * Agent capabilities and metadata
 */
export interface AgentCapability {
  name: string;
  version: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface AgentMetadata {
  id: string;
  name: string;
  type: 'llm' | 'tool' | 'service' | 'human';
  capabilities: AgentCapability[];
  reputationScore: number;
  lastHeartbeat: Date;
  status: 'online' | 'offline' | 'degraded' | 'quarantined';
}

/**
 * Task and job definitions
 */
export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'retrying';

export interface Task {
  id: string;
  parentId?: string;
  name: string;
  description: string;
  objective: string;
  status: TaskStatus;
  priority: number;
  assignedAgentId?: string;
  dependencies: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface Job {
  id: string;
  userId: string;
  title: string;
  objective: string;
  status: TaskStatus;
  tasks: Task[];
  createdAt: Date;
  completedAt?: Date;
  estimatedCompletionTime?: number;
  metrics: JobMetrics;
}

export interface JobMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  totalDuration?: number;
}

/**
 * Message and communication
 */
export type MessageType =
  | 'task_assignment'
  | 'task_result'
  | 'task_error'
  | 'heartbeat'
  | 'state_sync'
  | 'discovery'
  | 'auth'
  | 'error';

export interface Message {
  id: string;
  type: MessageType;
  from: string;
  to?: string;
  timestamp: Date;
  payload: Record<string, unknown>;
  correlationId?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  ttl?: number;
}

/**
 * Configuration
 */
export interface NexusConfig {
  nodeId: string;
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  messagebroker: {
    type: 'redis' | 'rabbitmq';
    url: string;
    options?: Record<string, unknown>;
  };
  database: {
    url: string;
    maxConnections: number;
  };
  api: {
    port: number;
    host: string;
  };
  security: {
    enableEncryption: boolean;
    keyRotationInterval: number;
  };
}

/**
 * Errors
 */
export enum ErrorCode {
  INVALID_TASK = 'INVALID_TASK',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  TASK_ASSIGNMENT_FAILED = 'TASK_ASSIGNMENT_FAILED',
  COMMUNICATION_ERROR = 'COMMUNICATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface NexusError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

import { ErrorCode, NexusError as INexusError } from '../types';

/**
 * Custom error class for NEXUS system
 */
export class NexusError extends Error implements INexusError {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    Object.setPrototypeOf(this, NexusError.prototype);
  }

  public toJSON(): INexusError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

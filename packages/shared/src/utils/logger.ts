/**
 * Simple logger utility for NEXUS
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
}

class Logger {
  private logLevel: LogLevel = 'info';
  private module: string;

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(module: string, logLevel?: LogLevel) {
    this.module = module;
    if (logLevel) {
      this.logLevel = logLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.logLevel];
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, module, message, data } = entry;
    const time = timestamp.toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${time}] [${level.toUpperCase()}] [${module}] ${message}${dataStr}`;
  }

  public debug(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      const entry: LogEntry = { timestamp: new Date(), level: 'debug', module: this.module, message, data };
      console.log(this.formatMessage(entry));
    }
  }

  public info(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      const entry: LogEntry = { timestamp: new Date(), level: 'info', module: this.module, message, data };
      console.log(this.formatMessage(entry));
    }
  }

  public warn(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      const entry: LogEntry = { timestamp: new Date(), level: 'warn', module: this.module, message, data };
      console.warn(this.formatMessage(entry));
    }
  }

  public error(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      const entry: LogEntry = { timestamp: new Date(), level: 'error', module: this.module, message, data };
      console.error(this.formatMessage(entry));
    }
  }
}

export function createLogger(module: string, logLevel?: LogLevel): Logger {
  return new Logger(module, logLevel);
}

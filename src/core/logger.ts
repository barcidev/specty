export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? "info";
    this.prefix = options.prefix ?? "[specty]";
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private shouldLog(targetLevel: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      silent: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
    };
    return levels[this.level] >= levels[targetLevel];
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.log(`${this.prefix} ${message}`, ...args);
    }
  }

  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.log(`${this.prefix} ✓ ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(`${this.prefix} ⚠ ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(`${this.prefix} ✖ ${message}`, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.debug(`${this.prefix} [debug] ${message}`, ...args);
    }
  }
}

export const logger = new Logger();

export type LogLevel = 'trace' | 'debug' | 'info' | 'success' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  prefix: string;
  message: string;
  args: unknown[];
}

export interface LoggerOptions {
  level?: LogLevel;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  success: 35,
  warn: 40,
  error: 50,
};

const LEVEL_EMOJI: Record<LogLevel, string> = {
  trace: '🔍',
  debug: '🐛',
  info: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '❌',
};

const LEVEL_CONSOLE: Record<LogLevel, keyof Console> = {
  trace: 'debug',
  debug: 'debug',
  info: 'log',
  success: 'log',
  warn: 'warn',
  error: 'error',
};

const getRuntimeConfig = (): Record<string, string> | undefined => {
  const globalScope = typeof globalThis === 'object' ? (globalThis as Record<string, unknown>) : undefined;
  const candidate = globalScope?.['__LOG_CONFIG__'];
  if (candidate && typeof candidate === 'object') {
    return candidate as Record<string, string>;
  }
  return undefined;
};

const DEFAULT_LEVEL: LogLevel = (() => {
  const getEnv = (key: string): string | undefined => {
    if (typeof process !== 'undefined' && process.env) {
      const value = process.env[key];
      if (typeof value === 'string') {
        return value;
      }
    }

    const runtimeConfig = getRuntimeConfig();
    if (runtimeConfig) {
      return runtimeConfig[key];
    }

    return undefined;
  };

  const configured = getEnv('LOG_LEVEL');
  if (configured) {
    return normalizeLevel(configured);
  }

  const nodeEnv = getEnv('NODE_ENV');
  return nodeEnv === 'development' ? 'debug' : 'info';
})();

interface LoggerConfig {
  level: LogLevel;
  enableTimestamp: boolean;
}

const listeners = new Set<(entry: LogEntry) => void>();

let globalConfig: LoggerConfig = {
  level: DEFAULT_LEVEL,
  enableTimestamp: true,
};

function normalizeLevel(value: string): LogLevel {
  const normalized = value.toLowerCase();
  if (['trace', 'debug', 'info', 'success', 'warn', 'error'].includes(normalized)) {
    return normalized as LogLevel;
  }
  return 'info';
}

export const configureLogger = (options: Partial<LoggerConfig>): void => {
  globalConfig = { ...globalConfig, ...options };
};

export const setGlobalLogLevel = (level: LogLevel): void => {
  globalConfig.level = level;
};

export const getGlobalLogLevel = (): LogLevel => globalConfig.level;

export const addLogListener = (listener: (entry: LogEntry) => void): () => void => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const shouldLog = (level: LogLevel, instanceLevel: LogLevel): boolean => {
  const threshold = LEVEL_ORDER[instanceLevel] ?? LEVEL_ORDER.info;
  return LEVEL_ORDER[level] >= threshold;
};

const formatTimestamp = (timestamp: number): string => new Date(timestamp).toISOString();

class Logger {
  private readonly prefix: string;
  private readonly level: LogLevel;

  constructor(prefix: string, options?: LoggerOptions) {
    this.prefix = prefix;
    this.level = options?.level ?? globalConfig.level;
  }

  trace(message: string, ...args: unknown[]): void {
    this.log('trace', message, args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, args);
  }

  success(message: string, ...args: unknown[]): void {
    this.log('success', message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, args);
  }

  private log(level: LogLevel, message: string, args: unknown[]): void {
    if (!shouldLog(level, this.level)) {
      return;
    }

    const timestamp = Date.now();
    const emoji = LEVEL_EMOJI[level];
    const consoleMethod = LEVEL_CONSOLE[level];
    const prefix = `[${this.prefix}]`;
    const tsSegment = globalConfig.enableTimestamp ? `[${formatTimestamp(timestamp)}]` : '';
    const formattedMessage = `${prefix} ${tsSegment} ${emoji} ${message}`.trim();

  const method = (console[consoleMethod] ?? console.log) as (...logArgs: unknown[]) => void;
  method(formattedMessage, ...args);

    const entry: LogEntry = {
      timestamp,
      level,
      prefix: this.prefix,
      message,
      args,
    };

    listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (listenerError) {
        console.warn('[Logger] Failed to execute log listener', listenerError);
      }
    });
  }
}

export const createLogger = (prefix: string, options?: LoggerOptions): Logger => new Logger(prefix, options);

export default Logger;

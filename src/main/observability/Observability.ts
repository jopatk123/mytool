import type { App } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { toReportableError } from '../../shared/errors';
import type { LogEntry, LogLevel } from '../../shared/utils/logger';

export type LogOrigin = 'main' | 'renderer';

export interface StoredLogEntry extends LogEntry {
  origin: LogOrigin;
}

export interface StoredErrorEntry extends ReturnType<typeof toReportableError> {
  origin: LogOrigin;
}

interface ObservabilitySnapshot {
  logs: StoredLogEntry[];
  errors: StoredErrorEntry[];
}

class ObservabilityStore {
  private readonly maxEntries: number;
  private logs: StoredLogEntry[] = [];
  private errors: StoredErrorEntry[] = [];
  private logFilePath: string | null = null;
  private initialized = false;
  private alertListeners = new Set<(entry: StoredErrorEntry) => void>();

  constructor(maxEntries = 200) {
    this.maxEntries = maxEntries;
  }

  async initialize(app: App): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const logDir = path.join(app.getPath('userData'), 'logs');
      await fs.mkdir(logDir, { recursive: true });
      this.logFilePath = path.join(logDir, 'app.log');
      this.initialized = true;
    } catch (error) {
      console.warn('[Observability] Failed to initialize log directory', error);
    }
  }

  recordLog(entry: LogEntry, origin: LogOrigin): void {
    const stored: StoredLogEntry = { ...entry, origin };
    this.push(this.logs, stored);

    if (this.shouldPersistLog(entry.level)) {
      void this.appendToFile(JSON.stringify({ type: 'log', entry: stored }) + '\n');
    }
  }

  recordError(error: unknown, origin: LogOrigin): void {
    const payload = toReportableError(error, { environment: origin });
    const stored: StoredErrorEntry = { ...payload, origin };
    this.push(this.errors, stored);

    void this.appendToFile(JSON.stringify({ type: 'error', error: stored }) + '\n');

    this.alertListeners.forEach(listener => {
      try {
        listener(stored);
      } catch (listenerError) {
        console.warn('[Observability] Alert listener failed', listenerError);
      }
    });
  }

  getSnapshot(): ObservabilitySnapshot {
    return {
      logs: [...this.logs],
      errors: [...this.errors],
    };
  }

  addAlertListener(listener: (entry: StoredErrorEntry) => void): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  private shouldPersistLog(level: LogLevel): boolean {
    return level === 'warn' || level === 'error';
  }

  private push<T>(collection: T[], item: T): void {
    collection.push(item);
    if (collection.length > this.maxEntries) {
      collection.shift();
    }
  }

  private async appendToFile(content: string): Promise<void> {
    if (!this.logFilePath) {
      return;
    }

    try {
      await fs.appendFile(this.logFilePath, content, 'utf-8');
    } catch (error) {
      console.warn('[Observability] Failed to write log file', error);
    }
  }
}

export const observability = new ObservabilityStore();
export type { ObservabilitySnapshot };

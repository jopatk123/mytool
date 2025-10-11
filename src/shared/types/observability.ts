import type { LogEntry } from '../utils/logger';

export interface RendererErrorPayload {
  type: 'error' | 'unhandledrejection' | string;
  message?: string;
  stack?: string;
  reason?: string;
  details?: unknown;
}

export type LogOrigin = 'main' | 'renderer';

export interface ObservedLogEntry extends LogEntry {
  origin: LogOrigin;
}

export interface ObservedErrorEntry extends RendererErrorPayload {
  timestamp: number;
  environment?: LogOrigin;
  origin: LogOrigin;
}

export interface ObservabilitySnapshot {
  logs: ObservedLogEntry[];
  errors: ObservedErrorEntry[];
}

export type RendererLogPayload = LogEntry;

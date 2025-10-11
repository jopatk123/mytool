export type ErrorSeverity = 'info' | 'warn' | 'error' | 'fatal';

export enum AppErrorCode {
  UNKNOWN = 'ERR_UNKNOWN',
  INVALID_ARGUMENT = 'ERR_INVALID_ARGUMENT',
  NOT_FOUND = 'ERR_NOT_FOUND',
  NOT_READY = 'ERR_NOT_READY',
  EXECUTION_FAILED = 'ERR_EXECUTION_FAILED',
  IPC_CHANNEL_NOT_REGISTERED = 'ERR_IPC_CHANNEL_NOT_REGISTERED',
  IPC_INVOCATION_FAILED = 'ERR_IPC_INVOCATION_FAILED',
  FILE_SYSTEM = 'ERR_FILE_SYSTEM',
  IMAGE_PROCESS = 'ERR_IMAGE_PROCESS',
  CONFIG = 'ERR_CONFIG',
  SECURITY = 'ERR_SECURITY',
}

export interface AppErrorOptions {
  cause?: unknown;
  details?: unknown;
  recoverable?: boolean;
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
  stack?: string;
}

export interface SerializedAppError {
  code: string;
  message: string;
  stack?: string;
  details?: unknown;
  recoverable: boolean;
  severity: ErrorSeverity;
  timestamp: number;
  context?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly recoverable: boolean;
  readonly severity: ErrorSeverity;
  readonly timestamp: number;
  readonly context?: Record<string, unknown>;
  declare cause?: unknown;

  constructor(code: AppErrorCode | string, message: string, options: AppErrorOptions = {}) {
    super(message);

    this.name = 'AppError';
    this.code = code;
    this.details = options.details;
    this.recoverable = options.recoverable ?? true;
    this.severity = options.severity ?? 'error';
    this.timestamp = Date.now();
    this.context = options.context;

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }

    if (options.stack) {
      this.stack = options.stack;
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON(): SerializedAppError {
    return {
      code: this.code,
      message: this.message,
      stack: this.stack,
      details: this.details,
      recoverable: this.recoverable,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
    };
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;

export const createAppError = (
  error: unknown,
  fallback: { code?: AppErrorCode | string; message?: string } = {},
): AppError => {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(fallback.code ?? AppErrorCode.UNKNOWN, error.message, {
      cause: error,
      stack: error.stack,
      details: (error as Error & { details?: unknown }).details,
    });
  }

  return new AppError(fallback.code ?? AppErrorCode.UNKNOWN, fallback.message ?? String(error), {
    details: error,
  });
};

export interface IPCSuccessResponse<T> {
  success: true;
  data: T;
}

export interface IPCErrorPayload {
  code: string;
  message: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  timestamp: number;
  details?: unknown;
  context?: Record<string, unknown>;
}

export interface IPCErrorResponse {
  success: false;
  error: IPCErrorPayload;
}

export type IPCResponse<T> = IPCSuccessResponse<T> | IPCErrorResponse;

const sanitizeDetails = (details: unknown): unknown => {
  if (!details) return undefined;
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(details);
    }
  } catch {
    // ignore clone errors
  }

  if (typeof details === 'object') {
    try {
      return JSON.parse(JSON.stringify(details));
    } catch {
      return undefined;
    }
  }

  return details;
};

export const toIPCErrorResponse = (
  error: unknown,
  fallback?: { code?: string; message?: string },
): IPCErrorResponse => {
  const appError = createAppError(error, fallback);
  const serialized = appError.toJSON();

  return {
    success: false,
    error: {
      code: serialized.code,
      message: serialized.message,
      severity: serialized.severity,
      recoverable: serialized.recoverable,
      timestamp: serialized.timestamp,
      details: sanitizeDetails(serialized.details),
      context: serialized.context,
    },
  };
};

export const toIPCSuccessResponse = <T>(data: T): IPCSuccessResponse<T> => ({
  success: true,
  data,
});

type ReportableErrorPayload = {
  type: string;
  message?: string;
  stack?: string;
  reason?: string;
  details?: unknown;
} & { timestamp: number; environment?: 'main' | 'renderer' };

export const toReportableError = (
  error: unknown,
  overrides: Partial<ReportableErrorPayload> = {},
): ReportableErrorPayload => {
  const appError = createAppError(error);
  const { message, stack } = appError;

  return {
    type: overrides.type ?? 'error',
    message,
    stack,
    details: overrides.details ?? appError.details,
    reason: overrides.reason,
    timestamp: Date.now(),
    environment: overrides.environment,
  };
};

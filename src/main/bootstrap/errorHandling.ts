import type { Dialog } from 'electron';
import type Logger from '../../shared/utils/logger';
import type { ToSafeJson } from '../utils/toSafeJson';

interface ObservabilityLike {
  recordError(error: unknown, origin: 'main' | 'renderer'): void;
}

export interface ErrorHandlingDependencies {
  dialog: Pick<Dialog, 'showErrorBox'>;
  logger: Pick<Logger, 'error' | 'warn'>;
  observability: ObservabilityLike;
  toSafeJson: ToSafeJson;
}

interface FatalErrorController {
  notifyFatalError: (title: string, error: unknown) => void;
  setupProcessErrorHandling: () => void;
}

/**
 * Centralises fatal-error handling so that we can test the reaction logic in isolation and
 * keep the main bootstrap file focused on orchestration concerns.
 */
export const setupErrorHandling = (deps: ErrorHandlingDependencies): FatalErrorController => {
  const { dialog, logger, observability, toSafeJson } = deps;
  let hasShownFatalError = false;

  const notifyFatalError = (title: string, error: unknown): void => {
    if (hasShownFatalError) {
      return;
    }

    hasShownFatalError = true;
    observability.recordError(error, 'main');
    const message = error instanceof Error ? error.message : String(error);

    try {
      dialog.showErrorBox(title, message);
    } catch (dialogError) {
      logger.warn('Failed to show error dialog', { dialogError });
    }
  };

  const setupProcessErrorHandling = (): void => {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception in main process', { error });
      notifyFatalError('应用程序发生未捕获异常', error);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection in main process', {
        reason: toSafeJson(reason),
      });

      if (reason instanceof Error) {
        notifyFatalError('应用程序发生未处理的 Promise 拒绝', reason);
      } else {
        observability.recordError({
          type: 'unhandledrejection',
          message: String(reason),
          details: toSafeJson(reason),
        }, 'main');
      }
    });
  };

  return {
    notifyFatalError,
    setupProcessErrorHandling,
  };
};

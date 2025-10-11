import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { AppErrorCode, toIPCErrorResponse, toIPCSuccessResponse } from '../../shared/errors';
import type Logger from '../../shared/utils/logger';
import type { ToSafeJson } from '../utils/toSafeJson';
import { IPCChannel } from '../../shared/types';

interface ObservabilityLike {
  recordError(error: unknown, origin: 'main' | 'renderer'): void;
}

export interface IpcRegistrarDependencies {
  ipcMain: Pick<IpcMain, 'handle'>;
  logger: Pick<Logger, 'error'>;
  observability: ObservabilityLike;
  toSafeJson: ToSafeJson;
}

export type RegisteredIpcHandler<T extends unknown[]> = (
  event: IpcMainInvokeEvent,
  ...args: T
) => Promise<unknown> | unknown;

export type IpcRegistrar = <T extends unknown[]>(
  channel: IPCChannel,
  handler: RegisteredIpcHandler<T>,
) => void;

/**
 * Creates an IPC handler registrar around Electron's ipcMain so we can unit-test the handler logic
 * without needing a full Electron runtime. It wraps handler results into the standardised response
 * shape used by the renderer side of the application.
 */
export const createIpcRegistrar = (deps: IpcRegistrarDependencies): IpcRegistrar => {
  const { ipcMain, logger, observability, toSafeJson } = deps;

  return <T extends unknown[]>(channel: IPCChannel, handler: RegisteredIpcHandler<T>): void => {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        const result = await handler(event, ...(args as T));
        return toIPCSuccessResponse(result);
      } catch (error) {
        logger.error('IPC handler failed', {
          channel,
          args: toSafeJson(args),
          error,
        });

        observability.recordError({
          type: `ipc:${channel}`,
          message: `IPC handler failed for ${channel}`,
          details: {
            args: toSafeJson(args),
            error: toSafeJson(error),
          },
        }, 'main');

        return toIPCErrorResponse(error, {
          code: AppErrorCode.IPC_INVOCATION_FAILED,
          message: `IPC handler failed for ${channel}`,
        });
      }
    });
  };
};

import type {
  BrowserWindow,
  Dialog,
  IpcMain,
  IpcMainInvokeEvent,
  OpenDialogOptions,
  SaveDialogOptions,
} from 'electron';
import { IPCChannel } from '../../shared/types';
import type { ImageJobRequest, ImageScanRequest } from '../../shared/types';
import { toReportableError } from '../../shared/errors';
import type Logger from '../../shared/utils/logger';
import type { LogEntry } from '../../shared/utils/logger';
import type { ToolManager } from '../tools/ToolManager';
import type { ToSafeJson } from '../utils/toSafeJson';
import { createIpcRegistrar } from './createIpcRegistrar';

interface ObservabilityLike {
  recordError(error: unknown, origin: 'main' | 'renderer'): void;
  recordLog(entry: LogEntry, origin: 'main' | 'renderer'): void;
  getSnapshot(): unknown;
}

interface DialogLike {
  showOpenDialog: Dialog['showOpenDialog'];
  showSaveDialog: Dialog['showSaveDialog'];
}

export interface IpcInitializationDependencies {
  dialog: DialogLike;
  getMainWindow: () => BrowserWindow | null;
  ipcMain: IpcMain;
  logger: Logger;
  observability: ObservabilityLike;
  toSafeJson: ToSafeJson;
  toolManager: ToolManager;
}

/**
 * Registers all IPC handlers and listeners required by the main process. The logic lives in a
 * dedicated module so unit tests can exercise it with lightweight fakes.
 */
export const createIpcInitializer = (deps: IpcInitializationDependencies): (() => void) => {
  const { dialog, getMainWindow, ipcMain, logger, observability, toSafeJson, toolManager } = deps;
  const register = createIpcRegistrar({ ipcMain, logger, observability, toSafeJson });

  return () => {
    logger.info('Initializing IPC handlers...');

    ipcMain.on(IPCChannel.WINDOW_MINIMIZE, () => {
      getMainWindow()?.minimize();
    });

    ipcMain.on(IPCChannel.WINDOW_MAXIMIZE, () => {
      const window = getMainWindow();
      if (!window) return;

      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    });

    ipcMain.on(IPCChannel.WINDOW_CLOSE, () => {
      getMainWindow()?.close();
    });

    register(IPCChannel.TOOL_GET_LIST, async () => {
      return toolManager.getAllTools();
    });

    ipcMain.on(IPCChannel.RENDERER_ERROR, (_event, errorInfo) => {
      const payload = toReportableError(errorInfo, { environment: 'renderer' });
      logger.error('Renderer reported error', payload);
      observability.recordError(payload, 'renderer');
    });

    ipcMain.on(IPCChannel.LOG_EVENT, (_event, entry: LogEntry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const normalizedArgs = Array.isArray(entry.args)
        ? entry.args.map((arg) => toSafeJson(arg))
        : [];

      const normalizedEntry: LogEntry = {
        timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : Date.now(),
        level: entry.level ?? 'info',
        prefix: typeof entry.prefix === 'string' ? entry.prefix : 'Renderer',
        message: typeof entry.message === 'string' ? entry.message : String(entry.message),
        args: normalizedArgs,
      };

      observability.recordLog(normalizedEntry, 'renderer');
    });

    register(
      IPCChannel.TOOL_EXECUTE,
      async (event: IpcMainInvokeEvent, toolId: string, params: unknown) => {
        return toolManager.executeTool(toolId, params, { event, sender: event.sender });
      },
    );

    register(IPCChannel.FILE_SELECT, async (_event, options?: OpenDialogOptions) => {
      const window = getMainWindow();
      if (!window) return null;

      const result = await dialog.showOpenDialog(window, {
        properties: ['openFile'],
        ...options,
      });

      return result.canceled ? null : result.filePaths;
    });

    register(IPCChannel.FILE_SAVE, async (_event, options?: SaveDialogOptions) => {
      const window = getMainWindow();
      if (!window) return null;

      const result = await dialog.showSaveDialog(window, options || {});

      return result.canceled ? null : result.filePath;
    });

    register(
      IPCChannel.IMAGE_SCAN_DIRECTORY,
      async (event: IpcMainInvokeEvent, request: ImageScanRequest) => {
        return toolManager.executeTool(
          'image-tool',
          {
            action: 'scanDirectory',
            ...request,
          },
          { event, sender: event.sender },
        );
      },
    );

    register(
      IPCChannel.IMAGE_JOB_START,
      async (event: IpcMainInvokeEvent, request: ImageJobRequest) => {
        return toolManager.executeTool(
          'image-tool',
          {
            action: 'startBatchJob',
            ...request,
          },
          { event, sender: event.sender },
        );
      },
    );

    register(IPCChannel.IMAGE_JOB_CANCEL, async (event: IpcMainInvokeEvent, jobId: string) => {
      return toolManager.executeTool(
        'image-tool',
        {
          action: 'cancelJob',
          jobId,
        },
        { event, sender: event.sender },
      );
    });

    register(IPCChannel.OBSERVABILITY_GET_SNAPSHOT, async () => {
      return observability.getSnapshot();
    });

    logger.success('IPC handlers initialized');
  };
};

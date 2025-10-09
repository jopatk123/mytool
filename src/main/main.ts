import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AppErrorCode, toIPCErrorResponse, toIPCSuccessResponse, toReportableError } from '../shared/errors.js';
import { IPCChannel, ImageProcessOptions } from '../shared/types.js';
import { addLogListener, createLogger } from '../shared/utils/logger.js';
import type { LogEntry } from '../shared/utils/logger.js';
import { observability } from './observability/Observability.js';
import { ToolManager } from './tools/ToolManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('Main');

let mainWindow: BrowserWindow | null = null;
const toolManager = new ToolManager();
let hasShownFatalError = false;

addLogListener((entry) => {
  observability.recordLog(entry, 'main');
});

observability.addAlertListener((entry) => {
  logger.warn('Observability alert triggered', entry);
});

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
    logger.error('Failed to show error dialog', { dialogError });
  }
};

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

const toSafeJson = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 5).map(item => toSafeJson(item));
  }
  if (typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return { type: 'UnserializableObject' };
    }
  }
  return String(value);
};

const registerIpcHandler = <T extends unknown[]>(
  channel: IPCChannel,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: T) => Promise<unknown> | unknown
): void => {
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

/**
 * 创建主窗口
 */
function createWindow(): void {
  logger.info('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Desktop Toolkit',
    show: false,
  });

  // 监听渲染进程的异常，以便诊断崩溃或未响应的情况
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Renderer process gone:', details);
  });

  mainWindow.on('unresponsive', () => {
    logger.warn('Main window is unresponsive');
  });

  // 监听渲染进程崩溃（通过 webContents 的 crashed 事件）
  mainWindow.webContents.on('crashed', (event, killed) => {
    logger.error('Renderer process crashed', { event, killed });
  });

  // 加载页面
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // 在开发时暂时不要自动打开 devtools，避免 devtools 脚本影响全局环境
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    logger.success('Main window is ready');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 初始化 IPC 处理器
 */
function initializeIPC(): void {
  logger.info('Initializing IPC handlers...');

  // 窗口控制
  ipcMain.on(IPCChannel.WINDOW_MINIMIZE, () => {
    mainWindow?.minimize();
  });

  ipcMain.on(IPCChannel.WINDOW_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on(IPCChannel.WINDOW_CLOSE, () => {
    mainWindow?.close();
  });

  // 获取工具列表
  registerIpcHandler(IPCChannel.TOOL_GET_LIST, async () => {
    return toolManager.getAllTools();
  });

  // 渲染器错误上报
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
      ? entry.args.map(arg => toSafeJson(arg))
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

  // 执行工具
  registerIpcHandler(IPCChannel.TOOL_EXECUTE, async (_event, toolId: string, params: unknown) => {
    return toolManager.executeTool(toolId, params);
  });

  // 文件选择
  registerIpcHandler(IPCChannel.FILE_SELECT, async (_event, options?: Electron.OpenDialogOptions) => {
    if (!mainWindow) return null;
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      ...options,
    });
    
    return result.canceled ? null : result.filePaths;
  });

  // 文件保存
  registerIpcHandler(IPCChannel.FILE_SAVE, async (_event, options?: Electron.SaveDialogOptions) => {
    if (!mainWindow) return null;
    
    const result = await dialog.showSaveDialog(mainWindow, options || {});
    
    return result.canceled ? null : result.filePath;
  });

  // 图片处理
  registerIpcHandler(IPCChannel.IMAGE_PROCESS, async (_event, imagePath: string, options: ImageProcessOptions) => {
    return toolManager.executeTool('image-tool', {
      action: 'processImage',
      imagePath,
      options,
    });
  });

  registerIpcHandler(IPCChannel.OBSERVABILITY_GET_SNAPSHOT, async () => {
    return observability.getSnapshot();
  });

  logger.success('IPC handlers initialized');
}

/**
 * 应用初始化
 */
async function initialize(): Promise<void> {
  try {
    logger.info('Initializing application...');
    
    await toolManager.initialize();
    initializeIPC();
    
    logger.success('Application initialized');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    app.quit();
  }
}

// 应用生命周期
app.whenReady().then(async () => {
  await observability.initialize(app);
  await initialize();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  logger.info('Application is quitting...');
  toolManager.cleanup();
});

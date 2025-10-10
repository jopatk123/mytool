import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import * as path from 'path';
import { promises as fs } from 'fs';
import { AppErrorCode, toIPCErrorResponse, toIPCSuccessResponse, toReportableError } from '../shared/errors';
import { IPCChannel } from '../shared/types';
import type { ImageScanRequest, ImageJobRequest } from '../shared/types';
import { addLogListener, createLogger } from '../shared/utils/logger';
import type { LogEntry } from '../shared/utils/logger';
import { observability } from './observability/Observability';
import { ToolManager } from './tools/ToolManager';

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
  // 对少见的非对象原始类型做明确处理，避免对对象使用默认的字符串化（'[object Object]'）
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return '[Function]';

  // 最后回退到更明确的对象标签，而不是依赖 Object 的默认字符串化
  try {
    return Object.prototype.toString.call(value);
  } catch {
    return '[Unserializable]';
  }
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
 * 设置浏览器控制台日志捕获
 * 在开发模式下，将渲染进程的控制台输出保存到项目根目录
 */
function setupConsoleLogger(window: BrowserWindow): void {
  const logFilePath = path.join(app.getAppPath(), `console-${Date.now()}.log`);
  let logStream: fs.FileHandle | null = null;

  // 创建日志文件
  fs.open(logFilePath, 'w')
    .then(handle => {
      logStream = handle;
      logger.info(`Browser console log will be saved to: ${logFilePath}`);
      return handle.write(`=== Browser Console Log - ${new Date().toISOString()} ===\n\n`);
    })
    .catch(err => {
      logger.warn('Failed to create console log file', { err });
    });

  // 监听控制台消息
  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (!logStream) return;

    const levelNames = ['log', 'warning', 'error', 'debug', 'info'];
    const levelName = levelNames[level] || 'log';
    const timestamp = new Date().toISOString();
    
    let logEntry = `[${timestamp}] [${levelName.toUpperCase()}] ${message}\n`;
    if (sourceId && line) {
      logEntry += `  at ${sourceId}:${line}\n`;
    }
    
    // 异步写入，不阻塞事件处理
    void logStream.write(logEntry);
  });

  // 窗口关闭时关闭日志文件
  window.on('closed', () => {
    if (logStream) {
      logStream.close().catch(err => {
        logger.warn('Failed to close console log file', { err });
      });
      logStream = null;
    }
  });
}

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
    logger.error('Renderer process gone', { details });
  });

  mainWindow.on('unresponsive', () => {
    logger.warn('Main window is unresponsive');
  });

  // 监听渲染进程崩溃（通过 webContents 的 crashed 事件）
  mainWindow.webContents.on('crashed', (event, killed) => {
    logger.error('Renderer process crashed', { event, killed });
  });

  // 在开发模式下捕获浏览器控制台日志并保存到文件
  if (process.env.NODE_ENV === 'development') {
    setupConsoleLogger(mainWindow);
  }

  // 加载页面
  if (process.env.NODE_ENV === 'development') {
    void mainWindow.loadURL('http://localhost:5173');
    // 在开发时暂时不要自动打开 devtools，避免 devtools 脚本影响全局环境
    // 如果显式设置了 ELECTRON_SHOW_DEVTOOLS=1，则在开发时打开 DevTools，方便查看控制台
    try {
      const showDevtools = String(process.env.ELECTRON_SHOW_DEVTOOLS ?? '').trim() === '1';
      if (showDevtools) {
        // 使用 undocked 模式打开以显示控制台面板
        logger.info('ELECTRON_SHOW_DEVTOOLS=1 detected — opening DevTools');
        mainWindow.webContents.openDevTools({ mode: 'undocked' });
        logger.info('DevTools open requested');
      }
    } catch (err) {
      logger.warn('Failed to open DevTools automatically', { err });
    }
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
  registerIpcHandler(IPCChannel.TOOL_EXECUTE, async (event, toolId: string, params: unknown) => {
    return toolManager.executeTool(toolId, params, { event, sender: event.sender });
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
  registerIpcHandler(IPCChannel.IMAGE_SCAN_DIRECTORY, async (event, request: ImageScanRequest) => {
    return toolManager.executeTool('image-tool', {
      action: 'scanDirectory',
      ...request,
    }, { event, sender: event.sender });
  });

  registerIpcHandler(IPCChannel.IMAGE_JOB_START, async (event, request: ImageJobRequest) => {
    return toolManager.executeTool('image-tool', {
      action: 'startBatchJob',
      ...request,
    }, { event, sender: event.sender });
  });

  registerIpcHandler(IPCChannel.IMAGE_JOB_CANCEL, async (event, jobId: string) => {
    return toolManager.executeTool('image-tool', {
      action: 'cancelJob',
      jobId,
    }, { event, sender: event.sender });
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

/**
 * 注册本地文件协议，用于在渲染进程中安全加载本地图片
 */
function registerLocalFileProtocol(): void {
  protocol.registerFileProtocol('local-file', (request, callback) => {
    try {
      // 移除 'local-file://' 前缀，获取实际文件路径
      const url = request.url.substring('local-file://'.length);
      const decodedPath = decodeURIComponent(url);
      
      logger.debug('Loading local file via protocol', { url, decodedPath });
      
      callback({ path: decodedPath });
    } catch (error) {
      logger.error('Failed to load local file', { url: request.url, error });
      callback({ error: -2 }); // net::FAILED
    }
  });
  
  logger.success('Registered local-file:// protocol');
}

// 应用生命周期
void app
  .whenReady()
  .then(async () => {
    // 注册自定义协议以安全加载本地文件
    registerLocalFileProtocol();
    
    await observability.initialize(app);
    await initialize();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch(error => {
    logger.error('Failed during app readiness sequence', error);
    notifyFatalError('应用启动失败', error);
    app.quit();
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

  app.on('will-quit', () => {
    logger.info('Application will quit (will-quit event)');
  });

  // 记录窗口 close 事件以便调试为何应用退出
  app.on('browser-window-created', (_event, window) => {
    window.on('close', () => {
      logger.info('Browser window close event fired', { id: window.id });
    });
  });

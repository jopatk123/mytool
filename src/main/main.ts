import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { IPCChannel } from '../shared/types.js';
import { createLogger } from '../shared/utils/logger.js';
import { ToolManager } from './tools/ToolManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('Main');

let mainWindow: BrowserWindow | null = null;
const toolManager = new ToolManager();

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
  ipcMain.handle(IPCChannel.TOOL_GET_LIST, async () => {
    return toolManager.getAllTools();
  });

  // 渲染器错误上报
  ipcMain.on(IPCChannel.RENDERER_ERROR, (_event, errorInfo) => {
    logger.error('Renderer reported error:', errorInfo);
  });

  // 执行工具
  ipcMain.handle(IPCChannel.TOOL_EXECUTE, async (_event, toolId: string, params: unknown) => {
    return toolManager.executeTool(toolId, params);
  });

  // 文件选择
  ipcMain.handle(IPCChannel.FILE_SELECT, async (_event, options?: Electron.OpenDialogOptions) => {
    if (!mainWindow) return null;
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      ...options,
    });
    
    return result.canceled ? null : result.filePaths;
  });

  // 文件保存
  ipcMain.handle(IPCChannel.FILE_SAVE, async (_event, options?: Electron.SaveDialogOptions) => {
    if (!mainWindow) return null;
    
    const result = await dialog.showSaveDialog(mainWindow, options || {});
    
    return result.canceled ? null : result.filePath;
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

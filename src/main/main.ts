import { app, BrowserWindow, dialog, ipcMain, protocol } from 'electron';
import { addLogListener, createLogger } from '../shared/utils/logger';
import { observability } from './observability/Observability';
import { ToolManager } from './tools/ToolManager';
import { toSafeJson } from './utils/toSafeJson';
import { setupErrorHandling } from './bootstrap/errorHandling';
import { createMainWindow } from './bootstrap/createMainWindow';
import { setupAppMenu } from './bootstrap/appMenu';
import { registerLocalFileProtocol } from './protocols/registerLocalFileProtocol';
import { createIpcInitializer } from './ipc/initializeIpc';

const logger = createLogger('Main');
const toolManager = new ToolManager();

let mainWindow: BrowserWindow | null = null;

const { notifyFatalError, setupProcessErrorHandling } = setupErrorHandling({
  dialog,
  logger,
  observability,
  toSafeJson,
});

setupProcessErrorHandling();

addLogListener((entry) => {
  observability.recordLog(entry, 'main');
});

observability.addAlertListener((entry) => {
  logger.warn('Observability alert triggered', entry);
});

const setMainWindow = (window: BrowserWindow | null): void => {
  mainWindow = window;
};

const getMainWindow = (): BrowserWindow | null => mainWindow;

const attachMainWindow = (window: BrowserWindow): void => {
  setMainWindow(window);
  window.on('closed', () => {
    setMainWindow(null);
  });
};

const initializeIpc = createIpcInitializer({
  dialog,
  getMainWindow,
  ipcMain,
  logger,
  observability,
  toSafeJson,
  toolManager,
});

const bootstrapApplication = async (): Promise<void> => {
  logger.info('Initializing application...');
  await toolManager.initialize();
  initializeIpc();
  const window = createMainWindow({
    app,
    env: process.env,
    logger,
  });
  attachMainWindow(window);
  logger.success('Application initialized');
};

void app
  .whenReady()
  .then(async () => {
    registerLocalFileProtocol({ logger, protocol });
    await observability.initialize(app);
    await bootstrapApplication();
    // 设置应用菜单（中文）
    try {
      setupAppMenu(getMainWindow());
    } catch (err) {
      logger.warn('Failed to setup application menu', err);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const window = createMainWindow({
          app,
          env: process.env,
          logger,
        });
        attachMainWindow(window);
      }
    });
  })
  .catch((error) => {
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

app.on('browser-window-created', (_event, window) => {
  window.on('close', () => {
    logger.info('Browser window close event fired', { id: window.id });
  });
});

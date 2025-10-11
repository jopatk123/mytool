import { BrowserWindow } from 'electron';
import * as path from 'path';
import { existsSync, promises as fs } from 'fs';
import type { App } from 'electron';
import type Logger from '../../shared/utils/logger';

export interface CreateMainWindowOptions {
  app: App;
  logger: Logger;
  env: NodeJS.ProcessEnv;
  preloadPath?: string;
  productionHtmlPath?: string;
}

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

const resolvePreloadPath = (options: CreateMainWindowOptions): string => {
  if (options.preloadPath) {
    return options.preloadPath;
  }
  const compiledPreloadPath = path.join(__dirname, '../preload.js');
  if (existsSync(compiledPreloadPath)) {
    return compiledPreloadPath;
  }

  return path.join(__dirname, 'preload.js');
};

const resolveProductionHtmlPath = (options: CreateMainWindowOptions): string => {
  if (options.productionHtmlPath) {
    return options.productionHtmlPath;
  }
  return path.join(__dirname, '../dist/index.html');
};

const setupConsoleLogger = (window: BrowserWindow, options: CreateMainWindowOptions): void => {
  const { app, logger } = options;
  const logFilePath = path.join(app.getAppPath(), `console-${Date.now()}.log`);
  let logStream: fs.FileHandle | null = null;

  fs.open(logFilePath, 'w')
    .then(handle => {
      logStream = handle;
      logger.info(`Browser console log will be saved to: ${logFilePath}`);
      return handle.write(`=== Browser Console Log - ${new Date().toISOString()} ===\n\n`);
    })
    .catch(err => {
      logger.warn('Failed to create console log file', { err });
    });

  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (!logStream) return;

    const levelNames = ['log', 'warning', 'error', 'debug', 'info'];
    const levelName = levelNames[level] || 'log';
    const timestamp = new Date().toISOString();

    let logEntry = `[${timestamp}] [${levelName.toUpperCase()}] ${message}\n`;
    if (sourceId && line) {
      logEntry += `  at ${sourceId}:${line}\n`;
    }

    void logStream.write(logEntry);
  });

  window.on('closed', () => {
    if (logStream) {
      logStream.close().catch(err => {
        logger.warn('Failed to close console log file', { err });
      });
      logStream = null;
    }
  });
};

const shouldShowDevTools = (env: NodeJS.ProcessEnv): boolean => {
  const flag = String(env.ELECTRON_SHOW_DEVTOOLS ?? '').trim();
  return flag === '1';
};

const isDevelopmentEnvironment = (env: NodeJS.ProcessEnv): boolean => env.NODE_ENV === 'development';

/**
 * Creates and configures the main application window. All Electron-specific behaviour stays here so
 * other modules can focus on orchestration or business logic.
 */
export const createMainWindow = (options: CreateMainWindowOptions): BrowserWindow => {
  const { logger, env } = options;
  logger.info('Creating main window...');

  const window = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    webPreferences: {
      preload: resolvePreloadPath(options),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Desktop Toolkit',
    show: false,
  });

  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Renderer process gone', { details });
  });

  window.on('unresponsive', () => {
    logger.warn('Main window is unresponsive');
  });

  window.webContents.on('crashed', (event, killed) => {
    logger.error('Renderer process crashed', { event, killed });
  });

  if (isDevelopmentEnvironment(env)) {
    setupConsoleLogger(window, options);
  }

  if (isDevelopmentEnvironment(env)) {
    void window.loadURL('http://localhost:5173');
    if (shouldShowDevTools(env)) {
      try {
        logger.info('ELECTRON_SHOW_DEVTOOLS=1 detected — opening DevTools');
        window.webContents.openDevTools({ mode: 'undocked' });
        logger.info('DevTools open requested');
      } catch (err) {
        logger.warn('Failed to open DevTools automatically', { err });
      }
    }
  } else {
    void window.loadFile(resolveProductionHtmlPath(options));
  }

  window.once('ready-to-show', () => {
    window.show();
    logger.success('Main window is ready');
  });

  window.on('closed', () => {
    logger.debug('Main window closed');
  });

  return window;
};

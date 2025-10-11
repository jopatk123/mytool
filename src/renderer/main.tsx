import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { electronAPI, resolveElectronAPI } from '@renderer/api/electron';
import { addLogListener, createLogger } from '@shared/utils/logger';
import ErrorBoundary from '@renderer/components/ErrorBoundary';
import { ElectronAPIProvider } from '@renderer/hooks/useElectronAPI';
import App from './App';
import './styles/index.css';

const logger = createLogger('RendererBootstrap');

try {
  resolveElectronAPI();

  addLogListener((entry) => {
    if (entry.level === 'trace' || entry.level === 'debug') {
      return;
    }
    try {
      electronAPI.reportLog(entry);
    } catch (forwardError) {
      console.warn('Failed to forward log entry to main process:', forwardError);
    }
  });

  window.addEventListener('error', (event) => {
    try {
      electronAPI.reportError({
        type: 'error',
        message: String(event.error || event.message),
        stack: event.error?.stack,
      });
    } catch (reportError) {
      logger.warn('Failed to report renderer error to main process', reportError);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    try {
      electronAPI.reportError({
        type: 'unhandledrejection',
        reason: String(event.reason),
      });
    } catch (reportError) {
      logger.warn('Failed to report unhandled rejection to main process', reportError);
    }
  });
} catch (apiError) {
  logger.warn('electronAPI is unavailable. Running in a non-Electron environment?', apiError);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <ElectronAPIProvider value={electronAPI}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ElectronAPIProvider>
    </ConfigProvider>
  </React.StrictMode>,
);

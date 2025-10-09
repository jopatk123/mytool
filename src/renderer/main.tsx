import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { electronAPI, resolveElectronAPI } from '@renderer/api/electron';
import { ElectronAPIProvider } from '@renderer/hooks/useElectronAPI';
import App from './App';
import './styles/index.css';

try {
  resolveElectronAPI();

  window.addEventListener('error', (event) => {
    try {
      electronAPI.reportError({
        type: 'error',
        message: String(event.error || event.message),
        stack: event.error?.stack,
      });
    } catch (reportError) {
      console.warn('Failed to report renderer error to main process:', reportError);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    try {
      electronAPI.reportError({
        type: 'unhandledrejection',
        reason: String(event.reason),
      });
    } catch (reportError) {
      console.warn('Failed to report unhandled rejection to main process:', reportError);
    }
  });
} catch (apiError) {
  console.warn('electronAPI is unavailable. Running in a non-Electron environment?', apiError);
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
        <App />
      </ElectronAPIProvider>
    </ConfigProvider>
  </React.StrictMode>
);

// 测试环境设置
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { ELECTRON_API_VERSION } from '@shared/constants';
import type { ElectronAPI } from '@shared/types';

// 自动清理
afterEach(() => {
  cleanup();
});

// 全局变量
Object.assign(globalThis, { expect });

// Mock window.matchMedia for Ant Design components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Electron API
const unsubscribeMock = vi.fn();

const electronAPIMock: ElectronAPI = {
  version: ELECTRON_API_VERSION,
  windowMinimize: vi.fn(),
  windowMaximize: vi.fn(),
  windowClose: vi.fn(),
  getToolList: vi.fn(async () => []),
  executeTool: vi.fn(async () => ({ success: true })),
  selectFile: vi.fn(async () => null),
  saveFile: vi.fn(async () => null),
  scanImages: vi.fn(async () => ({
    scanId: 'test',
    directory: '/',
    assets: [],
    scannedFiles: 0,
    totalFiles: 0,
  })),
  startImageJob: vi.fn(async () => ({ jobId: 'job-1' })),
  cancelImageJob: vi.fn(async () => undefined),
  onImageJobEvent: vi.fn(() => unsubscribeMock),
  scanFiles: vi.fn(async () => ({
    scanId: 'fs-1',
    directory: '/tmp',
    files: [],
    totalFiles: 0,
    filteredFiles: 0,
  })),
  exportFilesToCSV: vi.fn(async () => undefined),
  importCSV: vi.fn(async () => ({ tasks: [], invalidRows: 0 })),
  renameFiles: vi.fn(async () => []),
  deleteFiles: vi.fn(async () => []),
  reportError: vi.fn(),
  reportLog: vi.fn(),
  getObservabilitySnapshot: vi.fn(async () => ({ logs: [], errors: [] })),
};

const windowWithAPI = globalThis.window as typeof window & { electronAPI?: ElectronAPI };
windowWithAPI.electronAPI = electronAPIMock;

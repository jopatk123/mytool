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

// Mock Electron API
const electronAPIMock: ElectronAPI = {
  version: ELECTRON_API_VERSION,
  windowMinimize: vi.fn(),
  windowMaximize: vi.fn(),
  windowClose: vi.fn(),
  getToolList: vi.fn(async () => []),
  executeTool: vi.fn(async () => ({ success: true })),
  selectFile: vi.fn(async () => null),
  saveFile: vi.fn(async () => null),
  processImage: vi.fn(async () => ({ success: true })),
  reportError: vi.fn(),
  reportLog: vi.fn(),
  getObservabilitySnapshot: vi.fn(async () => ({ logs: [], errors: [] })),
};

const windowWithAPI = globalThis.window as typeof window & { electronAPI?: ElectronAPI };
windowWithAPI.electronAPI = electronAPIMock;

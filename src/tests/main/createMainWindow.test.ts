import { describe, expect, it, beforeEach, vi } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

const existsSyncMock = vi.fn();
const openMock = vi.fn(async () => ({
  write: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');

  const mockedFs = {
    ...actual,
    existsSync: existsSyncMock,
    promises: {
      ...actual.promises,
      open: openMock,
    },
  };

  return {
    __esModule: true,
    ...mockedFs,
    default: mockedFs,
  };
});

vi.mock('electron', () => {
  class MockBrowserWindow {
    public options: unknown;
    public loadURL = vi.fn();
    public loadFile = vi.fn();
    public on = vi.fn();
    public show = vi.fn();
    public once = vi.fn((event: string, handler: () => void) => {
      if (event === 'ready-to-show') {
        handler();
      }
    });
    public webContents = {
      on: vi.fn(),
      openDevTools: vi.fn(),
    };

    constructor(options: unknown) {
      this.options = options;
    }
  }

  return {
    BrowserWindow: MockBrowserWindow,
  };
});

const createLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

const createApp = () => ({
  getAppPath: () => '/tmp/app',
});

describe('createMainWindow preload resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the compiled preload bundle when present', async () => {
    existsSyncMock.mockReturnValue(true);
    const { createMainWindow } = await import('../../main/bootstrap/createMainWindow');

    const options = {
      app: createApp(),
      env: { NODE_ENV: 'production' },
      logger: createLogger(),
    } as unknown as Parameters<typeof createMainWindow>[0];

    const window = createMainWindow(options) as unknown as {
      options: { webPreferences: { preload: string } };
    };

    expect(existsSyncMock).toHaveBeenCalledTimes(1);
    const [checkedPath] = existsSyncMock.mock.calls[0];
    expect(window.options.webPreferences.preload).toBe(checkedPath);
  });

  it('falls back to the local preload when the compiled bundle is missing', async () => {
    existsSyncMock.mockReturnValue(false);
    const { createMainWindow } = await import('../../main/bootstrap/createMainWindow');

    const options = {
      app: createApp(),
      env: { NODE_ENV: 'production' },
      logger: createLogger(),
    } as unknown as Parameters<typeof createMainWindow>[0];

    const window = createMainWindow(options) as unknown as {
      options: { webPreferences: { preload: string } };
    };

    const moduleDir = path.resolve(TEST_DIR, '../../main/bootstrap');
    const expectedFallback = path.join(moduleDir, 'preload.js');

    expect(window.options.webPreferences.preload).toBe(expectedFallback);
  });
});

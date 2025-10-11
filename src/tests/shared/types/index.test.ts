import { describe, expect, expectTypeOf, it } from 'vitest';
import { IPCChannel, ToolCategory } from '@shared/types';
import type {
  ElectronAPI,
  FileScanResult,
  ImageJobEvent,
  ImageScanResult,
  ObservabilitySnapshot,
  ToolConfig,
} from '@shared/types';

describe('shared types entry point', () => {
  it('exposes the electron api contract', async () => {
    const getToolList: ElectronAPI['getToolList'] = async () => [
      {
        id: 'demo',
        name: 'Demo',
        description: 'Demo tool',
        icon: 'demo',
        category: ToolCategory.FILE,
        enabled: true,
      },
    ];

    await expect(getToolList()).resolves.toHaveLength(1);

    expectTypeOf<Awaited<ReturnType<ElectronAPI['getToolList']>>>().toEqualTypeOf<ToolConfig[]>();
    expectTypeOf<Awaited<ReturnType<ElectronAPI['scanImages']>>>().toEqualTypeOf<ImageScanResult>();
    expectTypeOf<Awaited<ReturnType<ElectronAPI['scanFiles']>>>().toEqualTypeOf<FileScanResult>();
  });

  it('provides stable ipc channel values', () => {
    expect(IPCChannel.WINDOW_CLOSE).toBe('window:close');
  });

  it('allows constructing observability snapshots', () => {
    const snapshot: ObservabilitySnapshot = {
      logs: [
        {
          timestamp: 0,
          level: 'info',
          prefix: 'test',
          message: 'initialized',
          args: [],
          origin: 'main',
        },
      ],
      errors: [
        {
          type: 'error',
          timestamp: 0,
          origin: 'renderer',
        },
      ],
    };

    expect(snapshot.logs[0].origin).toBe('main');
    expect(snapshot.errors[0].type).toBe('error');
  });

  it('supports progress image job events', () => {
    const event: ImageJobEvent = {
      type: 'progress',
      payload: {
        jobId: 'job-1',
        total: 10,
        completed: 2,
        failed: 1,
        pending: 7,
        percent: 20,
      },
    };

    expect(event.payload.pending).toBe(7);
  });
});

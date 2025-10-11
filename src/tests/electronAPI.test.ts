import { describe, expect, it, vi } from 'vitest';
import { electronAPI, resolveElectronAPI } from '@renderer/api/electron';
import type { ElectronAPI } from '@shared/types';

function getMock(): ElectronAPI {
  return (window as unknown as { electronAPI: ElectronAPI }).electronAPI;
}

describe('electron API wrapper', () => {
  it('resolves the preload API without throwing', () => {
    expect(() => resolveElectronAPI()).not.toThrow();
  });

  it('delegates calls to the underlying preload implementation', async () => {
    const mock = getMock() as ElectronAPI & { version: string };
    const payload = { type: 'error', message: 'oops' };

    await electronAPI.getToolList();
    await electronAPI.executeTool('file-tool', {});
    await electronAPI.selectFile();
    await electronAPI.saveFile();
    await electronAPI.scanImages({ directory: '/tmp', options: { includeSubdirectories: true } });
    await electronAPI.startImageJob({ scanId: 'scan', assetIds: [], operations: [] });
    await electronAPI.cancelImageJob('job-123');
    const unsubscribe = electronAPI.onImageJobEvent(() => {});
    await electronAPI.scanFiles({ directory: '/tmp' });
    await electronAPI.exportFilesToCSV({ files: [], outputPath: '/tmp/out.csv' });
    await electronAPI.importCSV('/tmp/in.csv');
    await electronAPI.renameFiles([]);
    await electronAPI.deleteFiles([]);
    unsubscribe();
    electronAPI.windowMinimize();
    electronAPI.windowMaximize();
    electronAPI.windowClose();
    electronAPI.reportError(payload);
    electronAPI.reportLog({
      timestamp: Date.now(),
      level: 'info',
      prefix: 'test',
      message: 'delegation',
      args: [],
    });
    await electronAPI.getObservabilitySnapshot();

    expect(mock.getToolList).toHaveBeenCalledTimes(1);
    expect(mock.executeTool).toHaveBeenCalledWith('file-tool', {});
    expect(mock.selectFile).toHaveBeenCalledTimes(1);
    expect(mock.saveFile).toHaveBeenCalledTimes(1);
    expect(mock.scanImages).toHaveBeenCalledTimes(1);
    expect(mock.startImageJob).toHaveBeenCalledTimes(1);
    expect(mock.cancelImageJob).toHaveBeenCalledWith('job-123');
    expect(mock.onImageJobEvent).toHaveBeenCalledTimes(1);
    expect(mock.scanFiles).toHaveBeenCalledTimes(1);
    expect(mock.exportFilesToCSV).toHaveBeenCalledTimes(1);
    expect(mock.importCSV).toHaveBeenCalledTimes(1);
    expect(mock.renameFiles).toHaveBeenCalledTimes(1);
    expect(mock.deleteFiles).toHaveBeenCalledTimes(1);
    expect(mock.windowMinimize).toHaveBeenCalledTimes(1);
    expect(mock.windowMaximize).toHaveBeenCalledTimes(1);
    expect(mock.windowClose).toHaveBeenCalledTimes(1);
    expect(mock.reportError).toHaveBeenCalledWith(payload);
    expect(mock.reportLog).toHaveBeenCalledTimes(1);
    expect(mock.getObservabilitySnapshot).toHaveBeenCalledTimes(1);
  });

  it('warns on version mismatch', () => {
    const mock = getMock() as ElectronAPI & { version: string };
    const originalVersion = mock.version;
    mock.version = '9.9.9';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      expect(() => resolveElectronAPI()).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      mock.version = originalVersion;
      warnSpy.mockRestore();
    }
  });
});

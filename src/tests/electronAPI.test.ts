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
    await electronAPI.processImage('path', {});
    electronAPI.windowMinimize();
    electronAPI.windowMaximize();
    electronAPI.windowClose();
    electronAPI.reportError(payload);

    expect(mock.getToolList).toHaveBeenCalledTimes(1);
    expect(mock.executeTool).toHaveBeenCalledWith('file-tool', {});
    expect(mock.selectFile).toHaveBeenCalledTimes(1);
    expect(mock.saveFile).toHaveBeenCalledTimes(1);
    expect(mock.processImage).toHaveBeenCalledWith('path', {});
    expect(mock.windowMinimize).toHaveBeenCalledTimes(1);
    expect(mock.windowMaximize).toHaveBeenCalledTimes(1);
    expect(mock.windowClose).toHaveBeenCalledTimes(1);
    expect(mock.reportError).toHaveBeenCalledWith(payload);
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

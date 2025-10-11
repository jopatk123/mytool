import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import ImageTool from '@renderer/pages/tools/ImageTool';
import { ElectronAPIProvider } from '@renderer/hooks/useElectronAPI';
import type { ElectronAPI } from '@shared/types';

describe('ImageTool page', () => {
  it('gracefully handles missing image job events in non-Electron environments', async () => {
    const baseApi = (window as typeof window & { electronAPI: ElectronAPI }).electronAPI;
    const error = new Error('not available');
    const onImageJobEvent = vi.fn(() => {
      throw error;
    });

    const mockApi: ElectronAPI = {
      ...baseApi,
      onImageJobEvent,
    };

    expect(() =>
      render(
        <ElectronAPIProvider value={mockApi}>
          <ImageTool />
        </ElectronAPIProvider>,
      ),
    ).not.toThrow();

    await waitFor(() => {
      expect(onImageJobEvent).toHaveBeenCalledTimes(1);
    });
  });
});

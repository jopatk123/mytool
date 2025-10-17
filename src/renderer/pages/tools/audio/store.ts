import { create } from 'zustand';
import type { AudioScanResult, AudioFileInfo, AudioPreviewResult } from '@shared/types/audio';

interface AudioToolState {
  directory: string;
  scanResult: AudioScanResult | null;
  selectedIds: Set<string>;
  isScanning: boolean;
  isProcessing: boolean;
  preview: AudioPreviewResult | null;
  error: string | null;

  setDirectory: (directory: string) => void;
  setScanResult: (result: AudioScanResult | null) => void;
  toggleSelection: (id: string) => void;
  setSelected: (ids: string[]) => void;
  clearSelection: () => void;
  setIsScanning: (state: boolean) => void;
  setIsProcessing: (state: boolean) => void;
  setPreview: (preview: AudioPreviewResult | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  directory: '',
  scanResult: null,
  selectedIds: new Set<string>(),
  isScanning: false,
  isProcessing: false,
  preview: null,
  error: null,
};

export const useAudioToolStore = create<AudioToolState>((set) => ({
  ...initialState,
  setDirectory: (directory) => set({ directory }),
  setScanResult: (result) =>
    set(() => ({
      scanResult: result,
      selectedIds: new Set(),
      preview: null,
      error: null,
    })),
  toggleSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),
  setSelected: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),
  setIsScanning: (isScanning) => set({ isScanning }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setPreview: (preview) => set({ preview }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState, selectedIds: new Set() }),
}));

export const selectCurrentFiles = (state: AudioToolState): AudioFileInfo[] => {
  if (!state.scanResult) return [];
  return state.scanResult.files.filter((file) => state.selectedIds.has(file.id));
};

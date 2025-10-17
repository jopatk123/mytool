import type { VideoScanResult } from '@shared/types/video';
import { create } from 'zustand';

interface VideoToolStore {
  scanResult: VideoScanResult | null;
  isScanning: boolean;
  error: string | null;

  setScanResult: (result: VideoScanResult | null) => void;
  setIsScanning: (scanning: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * 视频工具Zustand store
 */
export const useVideoToolStore = create<VideoToolStore>((set) => ({
  scanResult: null,
  isScanning: false,
  error: null,

  setScanResult: (result) => set({ scanResult: result }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setError: (error) => set({ error }),
}));

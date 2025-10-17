import type { VideoFileInfo, VideoScanResult } from '@shared/types/video';
import { create } from 'zustand';

interface VideoPreview {
  fileUrl: string;
  fileName: string;
  fileInfo: VideoFileInfo;
}

interface VideoToolStore {
  scanResult: VideoScanResult | null;
  isScanning: boolean;
  error: string | null;
  preview: VideoPreview | null;

  setScanResult: (result: VideoScanResult | null) => void;
  setIsScanning: (scanning: boolean) => void;
  setError: (error: string | null) => void;
  setPreview: (preview: VideoPreview | null) => void;
}

/**
 * 视频工具Zustand store
 */
export const useVideoToolStore = create<VideoToolStore>((set) => ({
  scanResult: null,
  isScanning: false,
  error: null,
  preview: null,

  setScanResult: (result) => set({ scanResult: result }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setError: (error) => set({ error }),
  setPreview: (preview) => set({ preview }),
}));

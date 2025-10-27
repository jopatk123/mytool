import type { VideoFileInfo, VideoScanResult } from '@shared/types/video';
import { create } from 'zustand';

interface VideoPreview {
  fileUrl: string;
  fileName: string;
  fileInfo: VideoFileInfo;
}

interface BatchOperationResult {
  file: string;
  success: boolean;
  output?: string;
  error?: string;
  message?: string;
}

interface BatchOperationState {
  operation?: 'convert' | 'trim' | 'compress' | 'extractFrames';
  totalFiles: number;
  processedFiles: number;
  successFiles: number;
  failedFiles: number;
  isProcessing: boolean;
  progress: number; // 0-100
  results: BatchOperationResult[];
  currentFile?: string;
}

interface VideoToolStore {
  scanResult: VideoScanResult | null;
  isScanning: boolean;
  error: string | null;
  preview: VideoPreview | null;
  includeSubdirectories: boolean;
  overwriteOriginal: boolean;
  outputDirectory: string | null;
  batchState: BatchOperationState;

  setScanResult: (result: VideoScanResult | null) => void;
  setIsScanning: (scanning: boolean) => void;
  setError: (error: string | null) => void;
  setPreview: (preview: VideoPreview | null) => void;
  setIncludeSubdirectories: (value: boolean) => void;
  setOverwriteOriginal: (value: boolean) => void;
  setOutputDirectory: (directory: string | null) => void;
  setBatchState: (state: Partial<BatchOperationState>) => void;
  resetBatchState: () => void;
  updateBatchProgress: (processed: number, successCount: number, failedCount: number, currentFile?: string) => void;
  addBatchResult: (result: BatchOperationResult) => void;
}

/**
 * 视频工具Zustand store
 */
export const useVideoToolStore = create<VideoToolStore>((set) => ({
  scanResult: null,
  isScanning: false,
  error: null,
  preview: null,
  includeSubdirectories: false,
  overwriteOriginal: false,
  outputDirectory: null,
  batchState: {
    totalFiles: 0,
    processedFiles: 0,
    successFiles: 0,
    failedFiles: 0,
    isProcessing: false,
    progress: 0,
    results: [],
  },

  setScanResult: (result) => set({ scanResult: result }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setError: (error) => set({ error }),
  setPreview: (preview) => set({ preview }),
  setIncludeSubdirectories: (value) => set({ includeSubdirectories: value }),
  setOverwriteOriginal: (value) => set({ overwriteOriginal: value }),
  setOutputDirectory: (directory) => set({ outputDirectory: directory }),
  setBatchState: (state) => set((prevState) => ({
    batchState: { ...prevState.batchState, ...state },
  })),
  resetBatchState: () => set({
    batchState: {
      totalFiles: 0,
      processedFiles: 0,
      successFiles: 0,
      failedFiles: 0,
      isProcessing: false,
      progress: 0,
      results: [],
    },
  }),
  updateBatchProgress: (processed, successCount, failedCount, currentFile) => set((prevState) => ({
    batchState: {
      ...prevState.batchState,
      processedFiles: processed,
      successFiles: successCount,
      failedFiles: failedCount,
      currentFile,
      progress: prevState.batchState.totalFiles > 0
        ? Math.round((processed / prevState.batchState.totalFiles) * 100)
        : 0,
    },
  })),
  addBatchResult: (result) => set((prevState) => ({
    batchState: {
      ...prevState.batchState,
      results: [...prevState.batchState.results, result],
    },
  })),
}));

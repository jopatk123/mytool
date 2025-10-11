import { create } from 'zustand';
import type {
  ImageAsset,
  ImageJobProgress,
  ImageJobSummary,
  ImageJobEvent,
  ImageJobItemResult,
  ImageJobError,
} from '@shared/types';

export type ImageToolStatus = 'idle' | 'scanning' | 'ready' | 'running' | 'completed';

interface ImageToolState {
  directory: string | null;
  includeSubdirectories: boolean;
  scanId: string | null;
  assets: ImageAsset[];
  selectedAssetIds: string[];
  status: ImageToolStatus;
  jobId: string | null;
  progress: ImageJobProgress | null;
  summary: ImageJobSummary | null;
  results: ImageJobItemResult[];
  errors: ImageJobError[];
  setIncludeSubdirectories(include: boolean): void;
  setDirectory(directory: string | null): void;
  setScanResult(scanId: string, assets: ImageAsset[], directory: string): void;
  clearScan(): void;
  toggleAsset(assetId: string): void;
  selectAll(): void;
  clearSelection(): void;
  setStatus(status: ImageToolStatus): void;
  setJobId(jobId: string | null): void;
  updateFromEvent(event: ImageJobEvent): void;
}

const uniqueIds = (ids: string[]): string[] => Array.from(new Set(ids));

export const useImageToolStore = create<ImageToolState>()((set, get) => ({
  directory: null,
  includeSubdirectories: false,
  scanId: null,
  assets: [],
  selectedAssetIds: [],
  status: 'idle',
  jobId: null,
  progress: null,
  summary: null,
  results: [],
  errors: [],
  setIncludeSubdirectories(include) {
    set({ includeSubdirectories: include });
  },
  setDirectory(directory) {
    set({ directory });
  },
  setScanResult(scanId, assets, directory) {
    set({
      scanId,
      assets,
      directory,
      selectedAssetIds: assets.map((asset) => asset.id),
      status: assets.length > 0 ? 'ready' : 'idle',
    });
  },
  clearScan() {
    set({
      scanId: null,
      assets: [],
      selectedAssetIds: [],
      status: 'idle',
      progress: null,
      summary: null,
      results: [],
      errors: [],
      jobId: null,
    });
  },
  toggleAsset(assetId) {
    const { selectedAssetIds } = get();
    if (selectedAssetIds.includes(assetId)) {
      set({ selectedAssetIds: selectedAssetIds.filter((id) => id !== assetId) });
    } else {
      set({ selectedAssetIds: uniqueIds([...selectedAssetIds, assetId]) });
    }
  },
  selectAll() {
    const { assets } = get();
    set({ selectedAssetIds: assets.map((asset) => asset.id) });
  },
  clearSelection() {
    set({ selectedAssetIds: [] });
  },
  setStatus(status) {
    set({ status });
  },
  setJobId(jobId) {
    set({ jobId, status: jobId ? 'running' : get().status });
  },
  updateFromEvent(event) {
    set((state) => {
      if (event.type === 'start') {
        return {
          ...state,
          jobId: event.jobId,
          status: 'running',
          progress: {
            jobId: event.jobId,
            total: event.total,
            completed: 0,
            failed: 0,
            pending: event.total,
            percent: 0,
          },
          results: [],
          errors: [],
          summary: null,
        };
      }

      if (event.type === 'progress') {
        return {
          ...state,
          progress: event.payload,
        };
      }

      if (event.type === 'item') {
        return {
          ...state,
          results: [...state.results, event.result],
        };
      }

      if (event.type === 'error') {
        return {
          ...state,
          errors: [...state.errors, event.error],
        };
      }

      if (event.type === 'completed') {
        return {
          ...state,
          summary: event.summary,
          status: 'completed',
          jobId: null,
          progress: {
            jobId: event.summary.jobId,
            total: event.summary.total,
            completed: event.summary.completed,
            failed: event.summary.failed,
            pending: 0,
            percent: 100,
          },
        };
      }

      if (event.type === 'cancelled') {
        return {
          ...state,
          jobId: null,
          status: 'ready',
        };
      }

      return state;
    });
  },
}));

import { create } from 'zustand';
import type {
  FileInfo,
  FileScanOptions,
  FileFilterOptions,
  FileScanResult,
} from '@shared/types';

/**
 * 文件工具状态
 */
interface FileToolState {
  // 当前选中的目录
  selectedDirectory: string;
  // 扫描选项
  scanOptions: FileScanOptions;
  // 扫描结果
  scanResult: FileScanResult | null;
  // 选中的文件ID列表
  selectedFileIds: Set<string>;
  // 是否正在扫描
  isScanning: boolean;
  // 是否正在处理
  isProcessing: boolean;

  // Actions
  setSelectedDirectory: (directory: string) => void;
  setScanOptions: (options: FileScanOptions) => void;
  setFilter: (filter: FileFilterOptions) => void;
  setScanResult: (result: FileScanResult | null) => void;
  toggleFileSelection: (fileId: string) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;
  removeFiles: (fileIds: string[]) => void;
  setIsScanning: (isScanning: boolean) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  reset: () => void;
}

const initialState = {
  selectedDirectory: '',
  scanOptions: {
    includeSubdirectories: false,
    maxConcurrency: 32,
    followSymlinks: false,
    excludeHidden: true,
    filter: {
      enableSizeFilter: false,
      // 当未输入时使用 undefined 表示不限制
      minSize: undefined,
      maxSize: undefined,
      // 扩展名过滤的排除模式，默认 false（包含模式）
      excludeExtensions: false,
      enableExtensionFilter: false,
      extensions: ['.jpg', '.jpeg', '.png'],
      enableNameFilter: false,
      nameKeyword: '',
    },
  },
  scanResult: null,
  selectedFileIds: new Set<string>(),
  isScanning: false,
  isProcessing: false,
};

/**
 * 文件工具状态管理
 */
export const useFileToolStore = create<FileToolState>((set) => ({
  ...initialState,

  setSelectedDirectory: (directory) => set({ selectedDirectory: directory }),

  setScanOptions: (options) => set({ scanOptions: options }),

  setFilter: (filter) =>
    set((state) => ({
      scanOptions: {
        ...state.scanOptions,
        filter,
      },
    })),

  setScanResult: (result) => set({ scanResult: result, selectedFileIds: new Set() }),

  toggleFileSelection: (fileId) =>
    set((state) => {
      const newSet = new Set(state.selectedFileIds);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return { selectedFileIds: newSet };
    }),

  selectAllFiles: () =>
    set((state) => {
      if (!state.scanResult) return state;
      const allIds = new Set(state.scanResult.files.map((f) => f.id));
      return { selectedFileIds: allIds };
    }),

  clearSelection: () => set({ selectedFileIds: new Set() }),

  removeFiles: (fileIds) =>
    set((state) => {
      if (!state.scanResult) return state;

      const removedSet = new Set(fileIds);
      const newFiles = state.scanResult.files.filter((f) => !removedSet.has(f.id));
      const newSelectedIds = new Set(
        [...state.selectedFileIds].filter((id) => !removedSet.has(id))
      );

      return {
        scanResult: {
          ...state.scanResult,
          files: newFiles,
          filteredFiles: newFiles.length,
        },
        selectedFileIds: newSelectedIds,
      };
    }),

  setIsScanning: (isScanning) => set({ isScanning }),

  setIsProcessing: (isProcessing) => set({ isProcessing }),

  reset: () => set({ ...initialState, selectedFileIds: new Set() }),
}));

/**
 * 获取选中的文件
 */
export const getSelectedFiles = (state: FileToolState): FileInfo[] => {
  if (!state.scanResult) return [];
  return state.scanResult.files.filter((f) => state.selectedFileIds.has(f.id));
};

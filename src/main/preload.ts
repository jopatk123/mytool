import { contextBridge, ipcRenderer } from 'electron';
import type { OpenDialogOptions, SaveDialogOptions } from 'electron';
import { ELECTRON_API_VERSION } from '../shared/constants';
import { AppError } from '../shared/errors';
import {
  IPCChannel,
  ElectronAPI,
  RendererErrorPayload,
  IPCErrorResponse,
  IPCResponse,
  ToolConfig,
  RendererLogPayload,
  ObservabilitySnapshot,
  ImageScanRequest,
  ImageScanResult,
  ImageJobRequest,
  ImageJobEvent,
  FileScanRequest,
  FileScanResult,
  FileExportRequest,
  FileImportResult,
  FileRenameTask,
  FileRenameResult,
  FileDeleteResult,
} from '../shared/types';
import type {
  AudioScanRequest,
  AudioScanResult,
  AudioConvertRequest,
  AudioTrimRequest,
  AudioBatchRequest,
  AudioBatchResult,
  AudioMergeRequest,
  AudioPreviewRequest,
  AudioPreviewResult,
} from '../shared/types/audio';

const isIpcResponse = <T>(value: unknown): value is IPCResponse<T> =>
  typeof value === 'object' && value !== null && 'success' in value;

const unwrapResponse = <T>(channel: IPCChannel, response: unknown): T => {
  if (!isIpcResponse<T>(response)) {
    return response as T;
  }

  if (response.success) {
    return response.data as T;
  }

  const error = response as IPCErrorResponse;
  throw new AppError(error.error.code, error.error.message, {
    details: error.error.details,
    recoverable: error.error.recoverable,
    severity: error.error.severity,
    context: {
      channel,
      timestamp: error.error.timestamp,
    },
  });
};

const invoke = async <T>(channel: IPCChannel, ...args: unknown[]): Promise<T> => {
  const response = await ipcRenderer.invoke(channel, ...args);
  return unwrapResponse<T>(channel, response);
};

/**
 * Electron API 暴露给渲染进程
 */
const jobEventListeners = new Set<(event: ImageJobEvent) => void>();

ipcRenderer.on(IPCChannel.IMAGE_JOB_EVENT, (_event, payload: ImageJobEvent) => {
  jobEventListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error('[electronAPI] job event listener failed', error);
    }
  });
});

const electronAPI: ElectronAPI = Object.freeze({
  version: ELECTRON_API_VERSION,
  // 窗口控制
  windowMinimize: () => ipcRenderer.send(IPCChannel.WINDOW_MINIMIZE),
  windowMaximize: () => ipcRenderer.send(IPCChannel.WINDOW_MAXIMIZE),
  windowClose: () => ipcRenderer.send(IPCChannel.WINDOW_CLOSE),

  // 工具相关
  getToolList: () => invoke<ToolConfig[]>(IPCChannel.TOOL_GET_LIST),
  executeTool: (toolId: string, params: unknown) =>
    invoke<unknown>(IPCChannel.TOOL_EXECUTE, toolId, params),

  // 文件操作
  selectFile: (options?: OpenDialogOptions) =>
    invoke<string[] | null>(IPCChannel.FILE_SELECT, options),
  saveFile: (options?: SaveDialogOptions) => invoke<string | null>(IPCChannel.FILE_SAVE, options),

  // 图片处理
  scanImages: (request: ImageScanRequest) =>
    invoke<ImageScanResult>(IPCChannel.IMAGE_SCAN_DIRECTORY, request),
  startImageJob: (request: ImageJobRequest) =>
    invoke<{ jobId: string }>(IPCChannel.IMAGE_JOB_START, request),
  cancelImageJob: (jobId: string) => invoke<void>(IPCChannel.IMAGE_JOB_CANCEL, jobId),
  onImageJobEvent: (callback: (event: ImageJobEvent) => void) => {
    jobEventListeners.add(callback);
    return () => {
      jobEventListeners.delete(callback);
    };
  },

  // 文件工具
  scanFiles: (request: FileScanRequest) =>
    invoke<FileScanResult>(IPCChannel.TOOL_EXECUTE, 'file-tool', {
      action: 'scanFiles',
      ...request,
    }),
  exportFilesToCSV: (request: FileExportRequest) =>
    invoke<void>(IPCChannel.TOOL_EXECUTE, 'file-tool', { action: 'exportToCSV', ...request }),
  importCSV: (filePath: string) =>
    invoke<FileImportResult>(IPCChannel.TOOL_EXECUTE, 'file-tool', {
      action: 'importFromCSV',
      filePath,
    }),
  renameFiles: (tasks: FileRenameTask[]) =>
    invoke<FileRenameResult[]>(IPCChannel.TOOL_EXECUTE, 'file-tool', {
      action: 'renameFiles',
      tasks,
    }),
  deleteFiles: (filePaths: string[]) =>
    invoke<FileDeleteResult[]>(IPCChannel.TOOL_EXECUTE, 'file-tool', {
      action: 'deleteFiles',
      filePaths,
    }),

  // 音频工具
  scanAudio: (request: AudioScanRequest) =>
    invoke<AudioScanResult>(IPCChannel.TOOL_EXECUTE, 'audio-tool', { action: 'scan', ...request }),
  convertAudio: (request: AudioConvertRequest) =>
    invoke<string>(IPCChannel.TOOL_EXECUTE, 'audio-tool', { action: 'convert', ...request }),
  trimAudio: (request: AudioTrimRequest) =>
    invoke<string>(IPCChannel.TOOL_EXECUTE, 'audio-tool', { action: 'trim', ...request }),
  batchProcessAudio: (request: AudioBatchRequest) =>
    invoke<AudioBatchResult>(IPCChannel.TOOL_EXECUTE, 'audio-tool', {
      action: 'batchProcess',
      ...request,
    }),
  mergeAudio: (request: AudioMergeRequest) =>
    invoke<string>(IPCChannel.TOOL_EXECUTE, 'audio-tool', { action: 'merge', ...request }),
  previewAudio: (request: AudioPreviewRequest) =>
    invoke<AudioPreviewResult>(IPCChannel.TOOL_EXECUTE, 'audio-tool', {
      action: 'preview',
      ...request,
    }),

  // 错误和日志
  reportError: (errorInfo: RendererErrorPayload) =>
    ipcRenderer.send(IPCChannel.RENDERER_ERROR, errorInfo),
  reportLog: (entry: RendererLogPayload) => ipcRenderer.send(IPCChannel.LOG_EVENT, entry),
  getObservabilitySnapshot: () =>
    invoke<ObservabilitySnapshot>(IPCChannel.OBSERVABILITY_GET_SNAPSHOT),
});

// 暴露 API 到 window 对象
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export { electronAPI };

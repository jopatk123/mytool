import type { OpenDialogOptions, SaveDialogOptions } from 'electron';
import type { ToolConfig } from './tool';
import type {
  FileDeleteResult,
  FileExportRequest,
  FileImportResult,
  FileRenameResult,
  FileRenameTask,
  FileScanRequest,
  FileScanResult,
} from './file';
import type { ImageJobEvent, ImageJobRequest, ImageScanRequest, ImageScanResult } from './image';
import type {
  ObservabilitySnapshot,
  RendererErrorPayload,
  RendererLogPayload,
} from './observability';
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
} from './audio';

/**
 * preload 暴露给渲染进程的 API（只读）
 */
export interface ElectronAPI {
  readonly version: string;
  windowMinimize(): void;
  windowMaximize(): void;
  windowClose(): void;
  getToolList(): Promise<ToolConfig[]>;
  executeTool(toolId: string, params: unknown): Promise<unknown>;
  selectFile(options?: OpenDialogOptions): Promise<string[] | null>;
  saveFile(options?: SaveDialogOptions): Promise<string | null>;
  scanImages(request: ImageScanRequest): Promise<ImageScanResult>;
  startImageJob(request: ImageJobRequest): Promise<{ jobId: string }>;
  cancelImageJob(jobId: string): Promise<void>;
  onImageJobEvent(callback: (event: ImageJobEvent) => void): () => void;
  scanFiles(request: FileScanRequest): Promise<FileScanResult>;
  exportFilesToCSV(request: FileExportRequest): Promise<void>;
  importCSV(filePath: string): Promise<FileImportResult>;
  renameFiles(tasks: FileRenameTask[]): Promise<FileRenameResult[]>;
  deleteFiles(filePaths: string[]): Promise<FileDeleteResult[]>;
  scanAudio(request: AudioScanRequest): Promise<AudioScanResult>;
  convertAudio(request: AudioConvertRequest): Promise<string>;
  trimAudio(request: AudioTrimRequest): Promise<string>;
  batchProcessAudio(request: AudioBatchRequest): Promise<AudioBatchResult>;
  mergeAudio(request: AudioMergeRequest): Promise<string>;
  previewAudio(request: AudioPreviewRequest): Promise<AudioPreviewResult>;
  reportError(payload: RendererErrorPayload): void;
  reportLog(entry: RendererLogPayload): void;
  getObservabilitySnapshot(): Promise<ObservabilitySnapshot>;
}

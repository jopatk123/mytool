/**
 * 工具配置接口
 */
import type { OpenDialogOptions, SaveDialogOptions, IpcMainInvokeEvent, WebContents } from 'electron';
import type { LogEntry } from './utils/logger';

/**
 * 工具配置接口
 */
export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ToolCategory;
  enabled: boolean;
}

/**
 * 工具类别
 */
export enum ToolCategory {
  IMAGE = 'image',
  FILE = 'file',
  TEXT = 'text',
  SYSTEM = 'system',
  OTHER = 'other',
}

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
  // 文件工具相关
  scanFiles(request: FileScanRequest): Promise<FileScanResult>;
  exportFilesToCSV(request: FileExportRequest): Promise<void>;
  importCSV(filePath: string): Promise<FileImportResult>;
  renameFiles(tasks: FileRenameTask[]): Promise<FileRenameResult[]>;
  deleteFiles(filePaths: string[]): Promise<FileDeleteResult[]>;
  // 错误和日志
  reportError(payload: RendererErrorPayload): void;
  reportLog(entry: RendererLogPayload): void;
  getObservabilitySnapshot(): Promise<ObservabilitySnapshot>;
}

/**
 * 工具基础接口
 */
export interface ToolExecuteContext {
  event?: IpcMainInvokeEvent;
  sender?: WebContents;
}

export interface ITool {
  readonly config: ToolConfig;
  initialize(): Promise<void>;
  cleanup(): void;
  execute(action: string, params: unknown, context?: ToolExecuteContext): Promise<unknown>;
}

/**
 * IPC 通道定义
 */
export enum IPCChannel {
  // 窗口控制
  WINDOW_MINIMIZE = 'window:minimize',
  WINDOW_MAXIMIZE = 'window:maximize',
  WINDOW_CLOSE = 'window:close',
  
  // 工具相关
  TOOL_GET_LIST = 'tool:get-list',
  TOOL_EXECUTE = 'tool:execute',
  
  // 文件操作
  FILE_SELECT = 'file:select',
  FILE_SAVE = 'file:save',
  
  // 图片处理
  IMAGE_SCAN_DIRECTORY = 'image:scan-directory',
  IMAGE_JOB_START = 'image:job-start',
  IMAGE_JOB_CANCEL = 'image:job-cancel',
  IMAGE_JOB_EVENT = 'image:job-event',
  // 日志与观测
  LOG_EVENT = 'log:event',
  OBSERVABILITY_GET_SNAPSHOT = 'observability:get-snapshot',
  // 渲染器错误上报
  RENDERER_ERROR = 'renderer:error',
}

/**
 * 应用配置
 */
export interface AppConfig {
  windowSize: {
    width: number;
    height: number;
  };
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
}

/**
 * 图片处理选项
 */
export type ImageHashAlgorithm = 'md5' | 'sha1' | 'sha256';

export type ImageCropDirection = 'top' | 'bottom' | 'left' | 'right';

export interface ImageCropPixels {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export type ImageRotationMode = 'fixed' | 'random';

export type ImageBatchOperation =
  | {
      type: 'hashRename';
      algorithm?: ImageHashAlgorithm;
      keepExtension?: boolean;
      prefix?: string;
    }
  | {
      type: 'resize';
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      withoutEnlargement?: boolean;
      maintainAspectRatio?: boolean;
    }
  | {
      type: 'compress';
      quality: number; // 1-100
      targetFormat?: 'jpeg' | 'png' | 'webp';
    }
  | {
      type: 'crop';
      pixels: ImageCropPixels;
    }
  | {
      type: 'rotate';
      mode: 'fixed';
      angle: number;
      autoCrop?: boolean;
    }
  | {
      type: 'rotate';
      mode: 'random';
      minAngle?: number;
      maxAngle?: number;
      autoCrop?: boolean;
    };

export interface ImageAsset {
  id: string;
  name: string;
  filePath: string;
  fileUrl: string;
  size: number;
  mimeType: string;
  extension: string;
  modifiedAt: number;
  createdAt: number;
  relativePath: string;
}

export interface ImageScanOptions {
  includeSubdirectories?: boolean;
  limit?: number;
  supportedExtensions?: string[];
}

export interface ImageScanRequest {
  directory: string;
  options?: ImageScanOptions;
}

export interface ImageScanResult {
  scanId: string;
  directory: string;
  assets: ImageAsset[];
  totalFiles: number;
  scannedFiles: number;
}

export interface ImageJobRequest {
  jobId?: string;
  scanId: string;
  assetIds: string[];
  operations: ImageBatchOperation[];
  options?: {
    concurrency?: number;
    outputDirectory?: string | null;
    overwrite?: boolean;
    preserveMetadata?: boolean;
    dryRun?: boolean;
  };
}

export interface ImageJobProgress {
  jobId: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  percent: number;
  currentAssetId?: string;
  message?: string;
}

export interface ImageJobItemResult {
  assetId: string;
  originalPath: string;
  outputPath: string;
  operationsApplied: ImageBatchOperation['type'][];
  hash?: string;
  warnings?: string[];
}

export interface ImageJobError {
  assetId: string;
  error: string;
}

export interface ImageJobSummary {
  jobId: string;
  total: number;
  completed: number;
  failed: number;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  results: ImageJobItemResult[];
  errors: ImageJobError[];
}

export type ImageJobEvent =
  | { type: 'start'; jobId: string; total: number } 
  | { type: 'progress'; payload: ImageJobProgress }
  | { type: 'item'; jobId: string; result: ImageJobItemResult }
  | { type: 'error'; jobId: string; error: ImageJobError }
  | { type: 'completed'; summary: ImageJobSummary }
  | { type: 'cancelled'; jobId: string; reason?: string };

/**
 * 文件信息
 */
export interface FileInfo {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  lastModified: number;
  directory: string;
}

/**
 * 文件过滤选项
 */
export interface FileFilterOptions {
  // 大小过滤
  enableSizeFilter?: boolean;
  minSize?: number; // 字节
  maxSize?: number; // 字节
  
  // 后缀过滤
  enableExtensionFilter?: boolean;
  // 当为 true 时表示反向过滤：排除列表中的扩展名，而不是只包含列表中的扩展名
  excludeExtensions?: boolean;
  extensions?: string[]; // ['.jpg', '.png']
  
  // 文件名关键字过滤
  enableNameFilter?: boolean;
  nameKeyword?: string;
}

/**
 * 文件扫描选项
 */
export interface FileScanOptions {
  includeSubdirectories?: boolean;
  filter?: FileFilterOptions;
  /**
   * 限制同时进行的文件系统操作数量，避免海量文件导致句柄耗尽
   */
  maxConcurrency?: number;
  /**
   * 是否跟随符号链接继续扫描
   */
  followSymlinks?: boolean;
  /**
   * 是否跳过隐藏文件/文件夹（以点开头）
   */
  excludeHidden?: boolean;
}

/**
 * 文件扫描请求
 */
export interface FileScanRequest {
  directory: string;
  options?: FileScanOptions;
}

/**
 * 文件扫描结果
 */
export interface FileScanResult {
  scanId: string;
  directory: string;
  files: FileInfo[];
  totalFiles: number;
  filteredFiles: number;
}

/**
 * 文件重命名任务
 */
export interface FileRenameTask {
  id: string;
  originalPath: string;
  originalName: string;
  newName: string;
}

/**
 * 文件重命名结果
 */
export interface FileRenameResult {
  id: string;
  success: boolean;
  originalPath: string;
  newPath?: string;
  error?: string;
}

/**
 * 文件删除结果
 */
export interface FileDeleteResult {
  id: string;
  success: boolean;
  path: string;
  error?: string;
}

/**
 * CSV 导出请求
 */
export interface FileExportRequest {
  files: FileInfo[];
  outputPath: string;
}

/**
 * CSV 导入结果
 */
export interface FileImportResult {
  tasks: FileRenameTask[];
  invalidRows: number;
}

/**
 * 渲染进程错误上报载荷
 */
export interface RendererErrorPayload {
  type: 'error' | 'unhandledrejection' | string;
  message?: string;
  stack?: string;
  reason?: string;
  details?: unknown;
}

export type LogOrigin = 'main' | 'renderer';

export interface ObservedLogEntry extends LogEntry {
  origin: LogOrigin;
}

export interface ObservedErrorEntry extends RendererErrorPayload {
  timestamp: number;
  environment?: LogOrigin;
  origin: LogOrigin;
}

export interface ObservabilitySnapshot {
  logs: ObservedLogEntry[];
  errors: ObservedErrorEntry[];
}

export type RendererLogPayload = LogEntry;

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
  reportError(payload: RendererErrorPayload): void;
  reportLog(entry: RendererLogPayload): void;
  getObservabilitySnapshot(): Promise<ObservabilitySnapshot>;
}

export type {
  AppError,
  AppErrorCode,
  AppErrorOptions,
  IPCErrorPayload,
  IPCErrorResponse,
  IPCResponse,
  IPCSuccessResponse,
  ErrorSeverity,
  SerializedAppError,
} from './errors';

export type { LogEntry, LogLevel } from './utils/logger';

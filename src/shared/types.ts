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
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: number;
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

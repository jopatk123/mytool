/**
 * 工具配置接口
 */
import type { OpenDialogOptions, SaveDialogOptions } from 'electron';

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
export interface ITool {
  readonly config: ToolConfig;
  initialize(): Promise<void>;
  cleanup(): void;
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
  IMAGE_PROCESS = 'image:process',
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
export interface ImageProcessOptions {
  resize?: {
    width?: number;
    height?: number;
  };
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  rotate?: number;
}

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
  processImage(imagePath: string, options: unknown): Promise<unknown>;
  reportError(payload: RendererErrorPayload): void;
}

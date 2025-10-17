import type { IpcMainInvokeEvent, WebContents } from 'electron';

/**
 * 工具类别
 */
export enum ToolCategory {
  IMAGE = 'image',
  FILE = 'file',
  AUDIO = 'audio',
  VIDEO = 'video',
  TEXT = 'text',
  SYSTEM = 'system',
  OTHER = 'other',
}

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
 * 工具上下文
 */
export interface ToolExecuteContext {
  event?: IpcMainInvokeEvent;
  sender?: WebContents;
}

/**
 * 工具执行接口
 */
export interface ITool {
  readonly config: ToolConfig;
  initialize(): Promise<void>;
  cleanup(): void;
  execute(action: string, params: unknown, context?: ToolExecuteContext): Promise<unknown>;
}

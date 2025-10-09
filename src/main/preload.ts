import { contextBridge, ipcRenderer } from 'electron';
import type { OpenDialogOptions, SaveDialogOptions } from 'electron';
import { ELECTRON_API_VERSION } from '../shared/constants';
import { AppError } from '../shared/errors.js';
import { IPCChannel, ElectronAPI, RendererErrorPayload, IPCErrorResponse, IPCResponse, ToolConfig, RendererLogPayload, ObservabilitySnapshot } from '../shared/types.js';

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
  saveFile: (options?: SaveDialogOptions) => 
    invoke<string | null>(IPCChannel.FILE_SAVE, options),

  // 图片处理
  processImage: (imagePath: string, options: unknown) => 
    invoke<unknown>(IPCChannel.IMAGE_PROCESS, imagePath, options),
  reportError: (errorInfo: RendererErrorPayload) => ipcRenderer.send(IPCChannel.RENDERER_ERROR, errorInfo),
  reportLog: (entry: RendererLogPayload) => ipcRenderer.send(IPCChannel.LOG_EVENT, entry),
  getObservabilitySnapshot: () => invoke<ObservabilitySnapshot>(IPCChannel.OBSERVABILITY_GET_SNAPSHOT),
});

// 暴露 API 到 window 对象
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export { electronAPI };

import { contextBridge, ipcRenderer } from 'electron';
import type { OpenDialogOptions, SaveDialogOptions } from 'electron';
import { ELECTRON_API_VERSION } from '../shared/constants';
import { IPCChannel, ElectronAPI, RendererErrorPayload } from '../shared/types';

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
  getToolList: () => ipcRenderer.invoke(IPCChannel.TOOL_GET_LIST),
  executeTool: (toolId: string, params: unknown) => 
    ipcRenderer.invoke(IPCChannel.TOOL_EXECUTE, toolId, params),

  // 文件操作
  selectFile: (options?: OpenDialogOptions) => 
    ipcRenderer.invoke(IPCChannel.FILE_SELECT, options),
  saveFile: (options?: SaveDialogOptions) => 
    ipcRenderer.invoke(IPCChannel.FILE_SAVE, options),

  // 图片处理
  processImage: (imagePath: string, options: unknown) => 
    ipcRenderer.invoke(IPCChannel.IMAGE_PROCESS, imagePath, options),
  reportError: (errorInfo: RendererErrorPayload) => ipcRenderer.send(IPCChannel.RENDERER_ERROR, errorInfo),
});

// 暴露 API 到 window 对象
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export { electronAPI };

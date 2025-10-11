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

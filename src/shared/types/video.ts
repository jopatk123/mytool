/**
 * 视频工具类型定义
 */

/**
 * 视频文件信息
 */
export interface VideoFileInfo {
  name: string;
  path: string;
  size: number;
  duration: number; // 秒
  width: number;
  height: number;
  codec: string;
  fps: number;
  bitrate: number;
  format: string;
}

/**
 * 视频扫描请求
 */
export interface VideoScanRequest {
  directory: string;
  recursive?: boolean;
}

/**
 * 视频扫描结果
 */
export interface VideoScanResult {
  directory: string;
  totalFiles: number;
  filteredFiles: number;
  videos: VideoFileInfo[];
}

/**
 * 视频转换请求
 */
export interface VideoConvertRequest {
  inputPath: string;
  outputPath: string;
  format?: 'mp4' | 'mkv' | 'avi' | 'webm' | 'mov';
  quality?: 'low' | 'medium' | 'high' | 'lossless';
  codec?: 'h264' | 'h265' | 'vp9' | 'av1';
}

/**
 * 视频裁剪请求
 */
export interface VideoTrimRequest {
  inputPath: string;
  outputPath: string;
  startTime: number; // 秒
  endTime: number; // 秒
  format?: string;
}

/**
 * 视频信息提取结果
 */
export interface VideoInfoResult {
  file: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
}

/**
 * 视频帧提取请求
 */
export interface VideoFrameExtractRequest {
  inputPath: string;
  outputDir: string;
  interval?: number; // 帧间隔（秒），默认1秒
  startTime?: number;
  endTime?: number;
}

/**
 * 视频帧提取结果
 */
export interface VideoFrameExtractResult {
  totalFrames: number;
  outputDir: string;
  frameFiles: string[];
}

/**
 * 视频批量处理请求
 */
export interface VideoBatchRequest {
  files: string[];
  operation: 'convert' | 'trim' | 'extractFrames';
  params: VideoConvertRequest | VideoTrimRequest | VideoFrameExtractRequest;
}

/**
 * 视频批量处理结果
 */
export interface VideoBatchResult {
  successful: number;
  failed: number;
  results: Array<{
    file: string;
    success: boolean;
    output?: string;
    error?: string;
  }>;
}

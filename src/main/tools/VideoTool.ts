import type {
    VideoBatchRequest,
    VideoBatchResult,
    VideoConvertRequest,
    VideoFrameExtractRequest,
    VideoFrameExtractResult,
    VideoInfoResult,
    VideoScanRequest,
    VideoScanResult,
    VideoTrimRequest,
} from '@shared/types/video';
import { AppError, AppErrorCode } from '../../shared/errors';
import type { ToolExecuteContext } from '../../shared/types';
import { ITool, ToolCategory, ToolConfig } from '../../shared/types';
import { createLogger } from '../../shared/utils/logger';
import { VideoBatchProcessor } from './video/VideoBatchProcessor';
import { VideoFrameExtractor } from './video/VideoFrameExtractor';
import { VideoInfoExtractor } from './video/VideoInfoExtractor';
import { VideoScanner } from './video/VideoScanner';
import { VideoTranscoder } from './video/VideoTranscoder';
import { VideoTrimmer } from './video/VideoTrimmer';

const logger = createLogger('VideoTool');

type VideoAction =
  | 'scan'
  | 'convert'
  | 'trim'
  | 'extractInfo'
  | 'extractFrames'
  | 'batchProcess';

interface VideoToolDependencies {
  scanner?: VideoScanner;
  transcoder?: VideoTranscoder;
  trimmer?: VideoTrimmer;
  infoExtractor?: VideoInfoExtractor;
  frameExtractor?: VideoFrameExtractor;
  batchProcessor?: VideoBatchProcessor;
}

/**
 * 视频处理工具
 * 提供视频扫描、转换、裁剪、帧提取等功能
 */
export class VideoTool implements ITool {
  readonly config: ToolConfig = {
    id: 'video-tool',
    name: '视频处理工具',
    description: '视频导入、格式转换、裁剪、帧提取与批量处理工具',
    icon: '🎬',
    category: ToolCategory.VIDEO,
    enabled: true,
  };

  private readonly scanner: VideoScanner;
  private readonly transcoder: VideoTranscoder;
  private readonly trimmer: VideoTrimmer;
  private readonly infoExtractor: VideoInfoExtractor;
  private readonly frameExtractor: VideoFrameExtractor;
  private readonly batchProcessor: VideoBatchProcessor;

  constructor(deps: VideoToolDependencies = {}) {
    this.scanner = deps.scanner ?? new VideoScanner();
    this.transcoder = deps.transcoder ?? new VideoTranscoder();
    this.trimmer = deps.trimmer ?? new VideoTrimmer();
    this.infoExtractor = deps.infoExtractor ?? new VideoInfoExtractor();
    this.frameExtractor = deps.frameExtractor ?? new VideoFrameExtractor();
    this.batchProcessor = deps.batchProcessor ?? new VideoBatchProcessor();
  }

  async initialize(): Promise<void> {
    logger.info('VideoTool initialized');
  }

  cleanup(): void {
    logger.info('VideoTool cleanup');
  }

  async execute(action: string, params: unknown, _context?: ToolExecuteContext): Promise<unknown> {
    const validatedAction = action as VideoAction;

    switch (validatedAction) {
      case 'scan':
        return this.handleScan(params);
      case 'convert':
        return this.handleConvert(params);
      case 'trim':
        return this.handleTrim(params);
      case 'extractInfo':
        return this.handleExtractInfo(params);
      case 'extractFrames':
        return this.handleExtractFrames(params);
      case 'batchProcess':
        return this.handleBatchProcess(params);
      default:
        logger.warn('Unknown VideoTool action', { action });
        throw new AppError(AppErrorCode.INVALID_ARGUMENT, `Unsupported action: ${String(action)}`);
    }
  }

  /**
   * 处理视频扫描
   */
  private async handleScan(params: unknown): Promise<VideoScanResult> {
    const request = this.normalizePayload<VideoScanRequest>(params, '扫描参数无效');

    // 验证目录参数
    if (!request.directory || typeof request.directory !== 'string') {
      throw new AppError(
        AppErrorCode.INVALID_ARGUMENT,
        '目录路径必须是有效的字符串',
      );
    }

    return this.scanner.scan(request);
  }

  /**
   * 处理视频转换
   */
  private async handleConvert(params: unknown): Promise<string> {
    const request = this.normalizePayload<VideoConvertRequest>(params, '转换参数无效');
    return this.transcoder.convert(request);
  }

  /**
   * 处理视频裁剪
   */
  private async handleTrim(params: unknown): Promise<string> {
    const request = this.normalizePayload<VideoTrimRequest>(params, '裁剪参数无效');
    return this.trimmer.trim(request);
  }

  /**
   * 处理视频信息提取
   */
  private async handleExtractInfo(params: unknown): Promise<VideoInfoResult> {
    if (typeof params !== 'object' || params === null) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '信息提取参数无效');
    }

    const filePath = (params as { filePath?: unknown }).filePath;

    if (typeof filePath !== 'string') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '文件路径必须是字符串');
    }

    return this.infoExtractor.extract(filePath);
  }

  /**
   * 处理帧提取
   */
  private async handleExtractFrames(params: unknown): Promise<VideoFrameExtractResult> {
    const request = this.normalizePayload<VideoFrameExtractRequest>(params, '帧提取参数无效');
    return this.frameExtractor.extractFrames(request);
  }

  /**
   * 处理批量处理
   */
  private async handleBatchProcess(params: unknown): Promise<VideoBatchResult> {
    const request = this.normalizePayload<VideoBatchRequest>(params, '批量处理参数无效');
    return this.batchProcessor.process(request);
  }

  /**
   * 规范化payload
   */
  private normalizePayload<T>(params: unknown, errorMessage: string): T {
    if (typeof params !== 'object' || params === null) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, errorMessage);
    }

    return params as T;
  }
}

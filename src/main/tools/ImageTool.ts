import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError, AppErrorCode } from '../../shared/errors';
import type { ToolExecuteContext } from '../../shared/types';
import {
  ITool,
  ToolCategory,
  ToolConfig,
  ImageScanRequest,
  ImageScanResult,
  ImageJobRequest,
} from '../../shared/types';
import { createLogger } from '../../shared/utils/logger';
import { DirectoryScanner } from './image/DirectoryScanner';
import { ImageJobManager } from './image/ImageJobManager';

const logger = createLogger('ImageTool');

type ScanCache = Map<string, ImageScanResult>;
type AssetCache = Map<string, Map<string, ImageScanResult['assets'][number]>>;

export class ImageTool implements ITool {
  readonly config: ToolConfig = {
    id: 'image-tool',
    name: '图片批量处理',
  description: '批量扫描目录中的图片并执行压缩、尺寸调整、哈希刷新等操作',
    icon: '🖼️',
    category: ToolCategory.IMAGE,
    enabled: true,
  };

  private readonly scanner = new DirectoryScanner();
  private readonly jobManager = new ImageJobManager();
  private readonly scanCache: ScanCache = new Map();
  private readonly assetCache: AssetCache = new Map();

  async initialize(): Promise<void> {
    logger.info('ImageTool initialized');
  }

  cleanup(): void {
    logger.info('ImageTool cleanup');
    this.scanCache.clear();
    this.assetCache.clear();
  }

  async execute(action: string, params: unknown, context?: ToolExecuteContext): Promise<unknown> {
    switch (action) {
      case 'scanDirectory':
        return this.handleScanDirectory(this.parseScanRequest(params));
      case 'startBatchJob':
        return this.handleStartBatchJob(this.parseJobRequest(params), context);
      case 'cancelJob':
        return this.handleCancelJob(params);
      default:
        logger.warn('Unknown ImageTool action', { action });
        throw new AppError(AppErrorCode.INVALID_ARGUMENT, `Unsupported action: ${action}`);
    }
  }

  private parseScanRequest(params: unknown): ImageScanRequest {
    if (!params || typeof params !== 'object') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '扫描参数无效');
    }

    const { directory, options } = params as ImageScanRequest;
    if (typeof directory !== 'string' || directory.trim().length === 0) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '必须提供有效的文件夹路径');
    }

    return {
      directory: path.resolve(directory),
      options,
    };
  }

  private parseJobRequest(params: unknown): ImageJobRequest {
    if (!params || typeof params !== 'object') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '批处理参数无效');
    }

    const request = params as ImageJobRequest;

    if (!request.scanId || typeof request.scanId !== 'string') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '缺少 scanId');
    }

    if (!Array.isArray(request.assetIds) || request.assetIds.length === 0) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '请选择至少一张图片进行处理');
    }

    if (!Array.isArray(request.operations) || request.operations.length === 0) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '请至少选择一种批量操作');
    }

    return request;
  }

  private async handleScanDirectory(request: ImageScanRequest): Promise<ImageScanResult> {
    logger.info('Scanning directory for images', request);
    const result = await this.scanner.scan(request.directory, request.options);
    this.scanCache.set(result.scanId, result);
    const assetsMap = new Map(result.assets.map(asset => [asset.id, asset]));
    this.assetCache.set(result.scanId, assetsMap);
    return result;
  }

  private async handleStartBatchJob(request: ImageJobRequest, context?: ToolExecuteContext): Promise<{ jobId: string }> {
    const cache = this.assetCache.get(request.scanId);
    if (!cache) {
      throw new AppError(AppErrorCode.NOT_FOUND, `找不到扫描记录: ${request.scanId}`);
    }

    const assets = request.assetIds
      .map(id => cache.get(id))
      .filter((asset): asset is ImageScanResult['assets'][number] => Boolean(asset));

    if (assets.length === 0) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '有效的图片列表为空，无法开始批处理');
    }

    const sender = context?.sender ?? context?.event?.sender;
    if (!sender) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '无法确定发送批处理事件的窗口上下文');
    }

    const enrichedRequest: ImageJobRequest = {
      ...request,
      jobId: request.jobId ?? randomUUID(),
    };

    const jobId = this.jobManager.startJob({ request: enrichedRequest, assets, sender });
    logger.info('Image batch job started', { jobId, assets: assets.length });
    return { jobId };
  }

  private async handleCancelJob(params: unknown): Promise<{ jobId: string; cancelled: boolean }> {
    if (!params || typeof params !== 'object' || typeof (params as { jobId?: string }).jobId !== 'string') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '取消任务参数无效');
    }

    const { jobId } = params as { jobId: string };
    const cancelled = this.jobManager.cancelJob(jobId);
    logger.info('Image batch job cancelled', { jobId, cancelled });
    return { jobId, cancelled };
  }
}

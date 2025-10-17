import { AppError, AppErrorCode } from '../../shared/errors';
import type { ToolExecuteContext } from '../../shared/types';
import { ITool, ToolCategory, ToolConfig } from '../../shared/types';
import type {
  AudioBatchRequest,
  AudioBatchResult,
  AudioConvertRequest,
  AudioMergeRequest,
  AudioPreviewRequest,
  AudioPreviewResult,
  AudioScanRequest,
  AudioScanResult,
  AudioTrimRequest,
} from '@shared/types/audio';
import { createLogger } from '../../shared/utils/logger';
import { AudioScanner } from './audio/AudioScanner';
import { AudioTranscoder } from './audio/AudioTranscoder';
import { AudioTrimmer } from './audio/AudioTrimmer';
import { AudioBatchProcessor } from './audio/AudioBatchProcessor';
import { AudioMerger } from './audio/AudioMerger';
import { AudioPreviewService } from './audio/AudioPreviewService';

const logger = createLogger('AudioTool');

type AudioAction = 'scan' | 'convert' | 'trim' | 'batchProcess' | 'merge' | 'preview';

interface AudioToolDependencies {
  scanner?: AudioScanner;
  transcoder?: AudioTranscoder;
  trimmer?: AudioTrimmer;
  batchProcessor?: AudioBatchProcessor;
  merger?: AudioMerger;
  previewService?: AudioPreviewService;
}

export class AudioTool implements ITool {
  readonly config: ToolConfig = {
    id: 'audio-tool',
    name: '音频处理工具',
    description: '音频导入、格式转换、裁剪、批量处理与拼接工具',
    icon: '🎧',
    category: ToolCategory.AUDIO,
    enabled: true,
  };

  private readonly scanner: AudioScanner;
  private readonly transcoder: AudioTranscoder;
  private readonly trimmer: AudioTrimmer;
  private readonly batchProcessor: AudioBatchProcessor;
  private readonly merger: AudioMerger;
  private readonly previewService: AudioPreviewService;

  constructor(deps: AudioToolDependencies = {}) {
    this.scanner = deps.scanner ?? new AudioScanner();
    this.transcoder = deps.transcoder ?? new AudioTranscoder();
    this.trimmer = deps.trimmer ?? new AudioTrimmer();
    this.batchProcessor = deps.batchProcessor ?? new AudioBatchProcessor();
    this.merger = deps.merger ?? new AudioMerger();
    this.previewService = deps.previewService ?? new AudioPreviewService();
  }

  async initialize(): Promise<void> {
    logger.info('AudioTool initialized');
  }

  cleanup(): void {
    logger.info('AudioTool cleanup');
  }

  async execute(action: string, params: unknown, _context?: ToolExecuteContext): Promise<unknown> {
    const validatedAction = action as AudioAction;

    switch (validatedAction) {
      case 'scan':
        return this.handleScan(params);
      case 'convert':
        return this.handleConvert(params);
      case 'trim':
        return this.handleTrim(params);
      case 'batchProcess':
        return this.handleBatch(params);
      case 'merge':
        return this.handleMerge(params);
      case 'preview':
        return this.handlePreview(params);
      default:
        logger.warn('Unknown AudioTool action', { action });
        throw new AppError(AppErrorCode.INVALID_ARGUMENT, `Unsupported action: ${String(action)}`);
    }
  }

  private async handleScan(params: unknown): Promise<AudioScanResult> {
    const request = this.normalizePayload<AudioScanRequest>(params, '扫描参数无效');
    return this.scanner.scan(request);
  }

  private async handleConvert(params: unknown): Promise<string> {
    const request = this.normalizePayload<AudioConvertRequest>(params, '转换参数无效');
    return this.transcoder.convert(request);
  }

  private async handleTrim(params: unknown): Promise<string> {
    const request = this.normalizePayload<AudioTrimRequest>(params, '裁剪参数无效');
    return this.trimmer.trim(request);
  }

  private async handleBatch(params: unknown): Promise<AudioBatchResult> {
    const request = this.normalizePayload<AudioBatchRequest>(params, '批处理参数无效');
    return this.batchProcessor.process(request);
  }

  private async handleMerge(params: unknown): Promise<string> {
    const request = this.normalizePayload<AudioMergeRequest>(params, '合并参数无效');
    return this.merger.merge(request);
  }

  private async handlePreview(params: unknown): Promise<AudioPreviewResult> {
    const request = this.normalizePayload<AudioPreviewRequest>(params, '预览参数无效');
    return this.previewService.createPreview(request.sourcePath);
  }

  private normalizePayload<T>(params: unknown, errorMessage: string): T {
    if (!params || typeof params !== 'object') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, errorMessage);
    }

    const payload = { ...(params as Record<string, unknown>) };
    if ('action' in payload) {
      delete (payload as { action?: string }).action;
    }

    return payload as T;
  }
}

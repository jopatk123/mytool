import type { VideoFrameExtractRequest, VideoFrameExtractResult } from '@shared/types/video';
import * as fsSync from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createLogger } from '../../../shared/utils/logger';
import { FFmpegService } from '../audio/FFmpegService';

const logger = createLogger('VideoFrameExtractor');

/**
 * 视频帧提取器
 * 用于从视频中提取关键帧或定时帧
 */
export class VideoFrameExtractor {
  private readonly ffmpeg: FFmpegService;

  constructor(ffmpegService?: FFmpegService) {
    this.ffmpeg = ffmpegService ?? new FFmpegService();
  }

  /**
   * 提取视频帧
   */
  async extractFrames(request: VideoFrameExtractRequest): Promise<VideoFrameExtractResult> {
    logger.info('Starting video frame extraction', {
      input: request.inputPath,
      output: request.outputDir,
      interval: request.interval,
    });

    try {
      // 验证输入文件存在
      if (!fsSync.existsSync(request.inputPath)) {
        throw new Error(`输入文件不存在: ${request.inputPath}`);
      }

      // 确保输出目录存在
      await fs.mkdir(request.outputDir, { recursive: true });

      const interval = request.interval || 1; // 默认每秒提取一帧

      // 构建帧提取命令
      const args = this.buildExtractCommand(request, interval);
      logger.debug('FFmpeg command', { args });

      // 执行 ffmpeg 命令
      await this.ffmpeg.run(args, { timeoutMs: 3600000 }); // 1小时超时

      // 读取输出目录中的所有帧文件
      const frameFiles = await this.listFrameFiles(request.outputDir);

      logger.success('Video frame extraction completed', {
        input: request.inputPath,
        output: request.outputDir,
        frameCount: frameFiles.length,
      });

      return {
        totalFrames: frameFiles.length,
        outputDir: request.outputDir,
        frameFiles,
      };
    } catch (error) {
      logger.error('Video frame extraction failed', { error, request });
      throw error;
    }
  }

  /**
   * 构建FFmpeg帧提取命令
   */
  private buildExtractCommand(request: VideoFrameExtractRequest, interval: number): string[] {
    const fps = 1 / interval; // 转换为fps
    const filter = `fps=${fps}`;

    const args: string[] = ['-i', request.inputPath];

    // 添加时间范围限制
    if (request.startTime !== undefined) {
      args.push('-ss', String(request.startTime));
    }

    if (request.endTime !== undefined && request.startTime !== undefined) {
      const duration = request.endTime - request.startTime;
      args.push('-t', String(duration));
    }

    // 添加视频过滤器
    args.push(
      '-vf', filter,
      '-y', // 覆盖输出文件
      path.join(request.outputDir, 'frame_%04d.jpg'),
    );

    return args;
  }

  /**
   * 列出输出目录中的帧文件
   */
  private async listFrameFiles(outputDir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(outputDir);
      const frameFiles = entries
        .filter((file) => file.match(/^frame_\d+\.jpg$/))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
          const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
          return numA - numB;
        })
        .map((file) => path.join(outputDir, file));

      return frameFiles;
    } catch (error) {
      logger.error('Failed to list frame files', { outputDir, error });
      return [];
    }
  }
}

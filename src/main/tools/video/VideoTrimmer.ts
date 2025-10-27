import type { VideoTrimRequest } from '@shared/types/video';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { createLogger } from '../../../shared/utils/logger';
import { FFmpegService } from '../audio/FFmpegService';

const logger = createLogger('VideoTrimmer');

/**
 * 视频裁剪器
 * 用于视频时间段裁剪
 */
export class VideoTrimmer {
  private readonly ffmpeg: FFmpegService;

  constructor(ffmpegService?: FFmpegService) {
    this.ffmpeg = ffmpegService ?? new FFmpegService();
  }

  /**
   * 裁剪视频
   */
  async trim(request: VideoTrimRequest): Promise<string> {
    logger.info('Starting video trimming', {
      input: request.inputPath,
      output: request.outputPath,
      startTime: request.startTime,
      endTime: request.endTime,
    });

    try {
      // 验证时间范围
      if (request.startTime < 0 || request.endTime < 0) {
        throw new Error('Start and end time must be non-negative');
      }

      if (request.startTime >= request.endTime) {
        throw new Error('Start time must be less than end time');
      }

      // 验证输入文件存在
      if (!existsSync(request.inputPath)) {
        throw new Error(`输入文件不存在: ${request.inputPath}`);
      }

      // 验证输出目录
      const outputDir = dirname(request.outputPath);
      if (!existsSync(outputDir)) {
        throw new Error(`输出目录不存在: ${outputDir}`);
      }

      // 构建裁剪命令
      const args = this.buildTrimCommand(request);
      logger.debug('FFmpeg command', { args });

      // 执行 ffmpeg 命令
      await this.ffmpeg.run(args, { timeoutMs: 3600000 }); // 1小时超时

      logger.success('Video trimming completed', {
        input: request.inputPath,
        output: request.outputPath,
        duration: request.endTime - request.startTime,
      });

      if (!existsSync(request.outputPath)) {
        throw new Error('输出文件未生成');
      }

      return request.outputPath;
    } catch (error) {
      logger.error('Video trimming failed', { error, request });
      throw error;
    }
  }

  /**
   * 构建FFmpeg裁剪命令
   */
  private buildTrimCommand(request: VideoTrimRequest): string[] {
    const duration = request.endTime - request.startTime;

    const args: string[] = [
      '-i', request.inputPath,
      '-ss', String(request.startTime),
      '-t', String(duration),
      '-c', 'copy', // 无需重新编码，直接复制流
      '-y', // 覆盖输出文件
      request.outputPath,
    ];

    return args;
  }
}

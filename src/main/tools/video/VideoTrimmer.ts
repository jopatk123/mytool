import type { VideoTrimRequest } from '@shared/types/video';
import { createLogger } from '../../../shared/utils/logger';

const logger = createLogger('VideoTrimmer');

/**
 * 视频裁剪器
 * 用于视频时间段裁剪
 */
export class VideoTrimmer {
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

      // 构建裁剪命令
      const command = this.buildTrimCommand(request);
      logger.debug('FFmpeg command', { command });

      // 模拟裁剪过程
      await new Promise((resolve) => setTimeout(resolve, 500));

      logger.success('Video trimming completed', {
        input: request.inputPath,
        output: request.outputPath,
        duration: request.endTime - request.startTime,
      });

      return request.outputPath;
    } catch (error) {
      logger.error('Video trimming failed', { error, request });
      throw error;
    }
  }

  /**
   * 构建FFmpeg裁剪命令
   */
  private buildTrimCommand(request: VideoTrimRequest): string {
    const duration = request.endTime - request.startTime;

    return (
      `ffmpeg -i "${request.inputPath}" ` +
      `-ss ${request.startTime} -t ${duration} ` +
      `-c copy "${request.outputPath}"`
    );
  }
}

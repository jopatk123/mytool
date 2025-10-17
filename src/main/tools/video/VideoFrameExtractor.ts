import type { VideoFrameExtractRequest, VideoFrameExtractResult } from '@shared/types/video';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createLogger } from '../../../shared/utils/logger';

const logger = createLogger('VideoFrameExtractor');

/**
 * 视频帧提取器
 * 用于从视频中提取关键帧或定时帧
 */
export class VideoFrameExtractor {
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
      // 确保输出目录存在
      await fs.mkdir(request.outputDir, { recursive: true });

      const interval = request.interval || 1; // 默认每秒提取一帧

      // 构建帧提取命令
      const command = this.buildExtractCommand(request, interval);
      logger.debug('FFmpeg command', { command });

      // 模拟帧提取过程
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 模拟生成帧文件列表
      const frameFiles = this.generateMockFrameFiles(request.outputDir, 120); // 假设视频120秒

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
  private buildExtractCommand(request: VideoFrameExtractRequest, interval: number): string {
    const fps = 1 / interval; // 转换为fps
    const filter = request.startTime !== undefined && request.endTime !== undefined
      ? `fps=${fps},select='iskey'`
      : `fps=${fps}`;

    let command = `ffmpeg -i "${request.inputPath}" -vf "${filter}" "${request.outputDir}/frame_%04d.jpg"`;

    if (request.startTime !== undefined) {
      command = `ffmpeg -ss ${request.startTime} -i "${request.inputPath}"` +
        ` -vf "${filter}" "${request.outputDir}/frame_%04d.jpg"`;
    }

    if (request.endTime !== undefined && request.startTime !== undefined) {
      const duration = request.endTime - request.startTime;
      command = `ffmpeg -ss ${request.startTime} -i "${request.inputPath}" -t ${duration}` +
        ` -vf "${filter}" "${request.outputDir}/frame_%04d.jpg"`;
    }

    return command;
  }

  /**
   * 生成模拟的帧文件列表
   */
  private generateMockFrameFiles(outputDir: string, videoDuration: number): string[] {
    const frameCount = Math.floor(videoDuration); // 每秒一帧
    const frameFiles: string[] = [];

    for (let i = 1; i <= frameCount; i++) {
      frameFiles.push(path.join(outputDir, `frame_${String(i).padStart(4, '0')}.jpg`));
    }

    return frameFiles;
  }
}

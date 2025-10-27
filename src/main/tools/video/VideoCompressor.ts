import type { VideoCompressRequest, VideoCompressResult } from '@shared/types/video';
import { createLogger } from '@shared/utils/logger';
import { existsSync, statSync } from 'fs';
import { dirname } from 'path';
import { FFmpegService } from '../audio/FFmpegService';

const logger = createLogger('VideoCompressor');

/**
 * 视频压缩工具
 * 使用 ffmpeg 进行视频压缩
 */
export class VideoCompressor {
  private readonly ffmpeg: FFmpegService;

  constructor(ffmpegService?: FFmpegService) {
    this.ffmpeg = ffmpegService ?? new FFmpegService();
  }

  /**
   * 压缩视频
   */
  async compress(request: VideoCompressRequest): Promise<VideoCompressResult> {
    logger.info('Compressing video', { request });

    if (!existsSync(request.inputPath)) {
      throw new Error(`输入文件不存在: ${request.inputPath}`);
    }

    // 验证输出目录
    const outputDir = dirname(request.outputPath);
    if (!existsSync(outputDir)) {
      throw new Error(`输出目录不存在: ${outputDir}`);
    }

    // 获取原始文件大小
    const originalSize = statSync(request.inputPath).size;

    // 构建 ffmpeg 命令参数
    const args = this.buildFFmpegArgs(request);

    try {
      // 执行 ffmpeg 命令
      await this.ffmpeg.run(args, { timeoutMs: 3600000 }); // 1小时超时

      if (!existsSync(request.outputPath)) {
        throw new Error('输出文件未生成');
      }

      const compressedSize = statSync(request.outputPath).size;
      const compressionRatio = (1 - compressedSize / originalSize) * 100;

      const result: VideoCompressResult = {
        success: true,
        inputPath: request.inputPath,
        outputPath: request.outputPath,
        originalSize,
        compressedSize,
        compressionRatio: parseFloat(compressionRatio.toFixed(2)),
        message: `压缩成功: ${(originalSize / 1024 / 1024).toFixed(2)}MB -> ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}% 减少)`,
      };

      logger.success('Video compressed successfully', result);
      return result;
    } catch (error) {
      logger.error('Video compression failed', { error, request });
      throw error;
    }
  }

  /**
   * 构建 FFmpeg 命令参数
   */
  private buildFFmpegArgs(request: VideoCompressRequest): string[] {
    const args: string[] = ['-i', request.inputPath];

    // 设置视频编码器和参数
    const quality = request.quality || 'medium';
    const { bitrate, preset } = this.getQualitySettings(quality);
    const targetBitrate = request.targetBitrate || bitrate;

    // 添加视频编码参数
    args.push(
      '-c:v', 'libx264', // 使用 h264 编码器
      '-preset', preset, // 编码速度 (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)
      '-b:v', `${targetBitrate}k`, // 视频比特率
      '-c:a', 'aac', // 音频编码器
      '-b:a', '128k', // 音频比特率
      '-movflags', '+faststart', // 优化 mp4 以便在 web 中播放
    );

    // 处理缩放
    if (request.scale) {
      args.push('-vf', `scale=${request.scale}`);
    }

    // 设置输出格式
    const format = request.format || 'mp4';
    args.push(
      '-f', format,
      '-y', // 覆盖输出文件
      request.outputPath,
    );

    return args;
  }

  /**
   * 根据质量等级获取编码参数
   */
  private getQualitySettings(quality: 'low' | 'medium' | 'high'): {
    bitrate: number;
    preset: string;
  } {
    const settings = {
      low: { bitrate: 500, preset: 'ultrafast' },
      medium: { bitrate: 1000, preset: 'fast' },
      high: { bitrate: 2500, preset: 'medium' },
    };
    return settings[quality] || settings.medium;
  }
}

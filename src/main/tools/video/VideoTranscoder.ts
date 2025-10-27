import type { VideoConvertRequest } from '@shared/types/video';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { createLogger } from '../../../shared/utils/logger';
import { FFmpegService } from '../audio/FFmpegService';

const logger = createLogger('VideoTranscoder');

/**
 * 视频转码器
 * 用于视频格式转换
 */
export class VideoTranscoder {
  private readonly ffmpeg: FFmpegService;

  constructor(ffmpegService?: FFmpegService) {
    this.ffmpeg = ffmpegService ?? new FFmpegService();
  }

  /**
   * 转换视频格式
   */
  async convert(request: VideoConvertRequest): Promise<string> {
    logger.info('Starting video conversion', {
      input: request.inputPath,
      output: request.outputPath,
      format: request.format,
      quality: request.quality,
      codec: request.codec,
    });

    try {
      // 验证输入文件存在
      if (!existsSync(request.inputPath)) {
        throw new Error(`输入文件不存在: ${request.inputPath}`);
      }

      // 验证输出目录
      const outputDir = dirname(request.outputPath);
      if (!existsSync(outputDir)) {
        throw new Error(`输出目录不存在: ${outputDir}`);
      }

      // 构建 ffmpeg 命令参数
      const args = this.buildFFmpegArgs(request);

      // 执行 ffmpeg 命令
      await this.ffmpeg.run(args, { timeoutMs: 3600000 }); // 1小时超时

      logger.success('Video conversion completed', {
        input: request.inputPath,
        output: request.outputPath,
      });

      if (!existsSync(request.outputPath)) {
        throw new Error('输出文件未生成');
      }

      return request.outputPath;
    } catch (error) {
      logger.error('Video conversion failed', { error, request });
      throw error;
    }
  }

  /**
   * 构建 FFmpeg 命令参数
   */
  private buildFFmpegArgs(request: VideoConvertRequest): string[] {
    const args: string[] = ['-i', request.inputPath];

    // 设置视频编码器
    const codec = this.getCodecForFormat(request.format, request.codec);
    args.push('-c:v', codec);

    // 根据质量设置参数
    const qualityPreset = this.getQualityPreset(request.quality);
    args.push(...qualityPreset);

    // 设置音频编码器
    args.push('-c:a', 'aac');
    args.push('-b:a', '128k');

    // 其他优化参数
    args.push('-movflags', '+faststart'); // 优化 mp4 以便在 web 中播放

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
   * 获取格式对应的编码器
   */
  private getCodecForFormat(format?: string, codec?: string): string {
    if (codec) {
      const codecMap: Record<string, string> = {
        h264: 'libx264',
        h265: 'libx265',
        vp9: 'libvpx-vp9',
        av1: 'libaom-av1',
      };
      return codecMap[codec] || 'libx264';
    }

    const defaultCodecs: Record<string, string> = {
      mp4: 'libx264',
      mkv: 'libx264',
      avi: 'mpeg4',
      webm: 'libvpx-vp9',
      mov: 'libx264',
    };

    return defaultCodecs[format || 'mp4'] || 'libx264';
  }

  /**
   * 获取质量预设
   */
  private getQualityPreset(quality?: string): string[] {
    const qualityMap: Record<string, string[]> = {
      low: ['-crf', '28', '-preset', 'ultrafast'],
      medium: ['-crf', '23', '-preset', 'medium'],
      high: ['-crf', '18', '-preset', 'slow'],
      lossless: ['-crf', '0', '-preset', 'veryslow'],
    };

    return qualityMap[quality || 'medium'] || ['-crf', '23', '-preset', 'medium'];
  }
}

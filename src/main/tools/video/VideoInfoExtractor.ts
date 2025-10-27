import type { VideoInfoResult } from '@shared/types/video';
import { existsSync } from 'fs';
import { createLogger } from '../../../shared/utils/logger';
import { FFmpegService } from '../audio/FFmpegService';

const logger = createLogger('VideoInfoExtractor');

/**
 * 视频信息提取器
 * 用于获取视频文件的详细信息
 */
export class VideoInfoExtractor {
  private readonly ffmpeg: FFmpegService;

  constructor(ffmpegService?: FFmpegService) {
    this.ffmpeg = ffmpegService ?? new FFmpegService();
  }

  /**
   * 提取视频信息
   */
  async extract(filePath: string): Promise<VideoInfoResult> {
    logger.info('Starting video info extraction', { file: filePath });

    try {
      // 验证文件存在
      if (!existsSync(filePath)) {
        throw new Error(`视频文件不存在: ${filePath}`);
      }

      // 使用 ffprobe 获取视频信息
      const args = [
        '-v', 'error',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
      ];

      const result = await this.ffmpeg.run(args, { timeoutMs: 30000 });

      // 解析 ffprobe 输出
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const probeData: any = JSON.parse(result.stdout);

      // 提取视频流信息
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const videoStream: any = probeData.streams?.find((s: any) => s.codec_type === 'video');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatInfo: any = probeData.format || {};

      if (!videoStream) {
        throw new Error('未找到视频流');
      }

      const videoInfo: VideoInfoResult = {
        file: filePath,
        duration: parseFloat(String(videoStream.duration || formatInfo.duration || '0')),
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: this.parseFPS(String(videoStream.avg_frame_rate || videoStream.r_frame_rate || '0/1')),
        codec: videoStream.codec_name || 'unknown',
        bitrate: parseInt(String(videoStream.bit_rate || formatInfo.bit_rate || '0'), 10) / 1000, // 转换为 kbps
      };

      logger.success('Video info extraction completed', { file: filePath, info: videoInfo });

      return videoInfo;
    } catch (error) {
      logger.error('Video info extraction failed', { error, file: filePath });
      throw error;
    }
  }

  /**
   * 解析 FPS 字符串 (如 "30000/1001")
   */
  private parseFPS(fpsString: string): number {
    try {
      if (!fpsString || fpsString === '0/1') return 0;

      const [num, denom] = fpsString.split('/').map((s) => parseFloat(s));
      if (denom === 0) return 0;

      return num / denom;
    } catch {
      return 0;
    }
  }
}

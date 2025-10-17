import type { VideoFileInfo, VideoScanRequest, VideoScanResult } from '@shared/types/video';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createLogger } from '../../../shared/utils/logger';

const logger = createLogger('VideoScanner');

// 支持的视频格式
const SUPPORTED_FORMATS = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.flv', '.wmv', '.m3u8'];

/**
 * 视频扫描器
 * 用于扫描目录中的视频文件
 */
export class VideoScanner {
  /**
   * 扫描目录中的视频文件
   */
  async scan(request: VideoScanRequest): Promise<VideoScanResult> {
    logger.info('Starting video scan', { directory: request.directory });

    try {
      const videos: VideoFileInfo[] = [];
      let totalFiles = 0;
      const shouldRecurse = request.recursive === true;

      // 递归扫描目录
      const scanDir = async (dir: string) => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
              if (shouldRecurse) {
                await scanDir(fullPath);
              }
            } else if (entry.isFile()) {
              totalFiles++;
              const ext = path.extname(entry.name).toLowerCase();

              if (SUPPORTED_FORMATS.includes(ext)) {
                try {
                  const stats = await fs.stat(fullPath);
                  // 这里可以调用ffprobe获取详细信息
                  // 为了演示，我们创建基本信息
                  const videoInfo: VideoFileInfo = {
                    name: entry.name,
                    path: fullPath,
                    size: stats.size,
                    duration: 0, // 需要通过ffprobe获取
                    width: 0,
                    height: 0,
                    codec: 'unknown',
                    fps: 0,
                    bitrate: 0,
                    format: ext.replace('.', ''),
                  };

                  videos.push(videoInfo);
                } catch (err) {
                  logger.warn('Failed to get video info', { file: fullPath, err });
                }
              }
            }
          }
        } catch (err) {
          logger.error('Error scanning directory', { dir, err });
        }
      };

      await scanDir(request.directory);

      logger.success('Video scan completed', {
        directory: request.directory,
        totalFiles,
        videoCount: videos.length,
      });

      return {
        directory: request.directory,
        totalFiles,
        filteredFiles: videos.length,
        videos,
      };
    } catch (error) {
      logger.error('Video scan failed', { error, request });
      throw error;
    }
  }
}

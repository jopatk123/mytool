import * as path from 'node:path';
import { promises as fs, constants as fsConstants } from 'node:fs';
import { AppError, AppErrorCode } from '../../../shared/errors';
import type { AudioPreviewResult } from '@shared/types/audio';
import { createLogger } from '../../../shared/utils/logger';

const logger = createLogger('AudioPreviewService');

const mimeTypeByExtension: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg; codecs=opus',
  '.wma': 'audio/x-ms-wma',
};

export class AudioPreviewService {
  async createPreview(sourcePath: string): Promise<AudioPreviewResult> {
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '预览源文件路径无效');
    }

    try {
      await fs.access(sourcePath, fsConstants.R_OK);
    } catch (error) {
      logger.error('Audio preview source not accessible', { sourcePath, error });
      throw new AppError(AppErrorCode.NOT_FOUND, '无法访问音频文件', { cause: error });
    }

    const extension = path.extname(sourcePath).toLowerCase();
    const mimeType = mimeTypeByExtension[extension] ?? 'audio/mpeg';
    const encodedPath = encodeURIComponent(sourcePath);

    return {
      fileUrl: `local-file://${encodedPath}`,
      mimeType,
      path: sourcePath,
    };
  }
}

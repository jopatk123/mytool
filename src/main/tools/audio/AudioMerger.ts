import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { AppError, AppErrorCode } from '../../../shared/errors';
import type { AudioMergeRequest } from '@shared/types/audio';
import { createLogger } from '../../../shared/utils/logger';
import { FFmpegService } from './FFmpegService';
import { resolveOutputPath } from './OutputPathResolver';

const logger = createLogger('AudioMerger');

export class AudioMerger {
  constructor(private readonly ffmpeg: FFmpegService = new FFmpegService()) {}

  async merge(request: AudioMergeRequest): Promise<string> {
    if (!request || typeof request !== 'object') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '合并请求无效');
    }

    const sourcePaths = Array.isArray(request.sourcePaths) ? request.sourcePaths : [];
    if (sourcePaths.length < 2) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '合并操作至少需要两个音频文件');
    }

    if (sourcePaths.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '所有源文件路径必须有效');
    }

    const inferredExtension = path.extname(sourcePaths[0]).replace('.', '') || 'mp3';
    const targetExtension = request.options?.format
      ? request.options.format.startsWith('.')
        ? request.options.format.slice(1)
        : request.options.format
      : inferredExtension;

    const outputPath = await resolveOutputPath({
      sourcePath: sourcePaths[0],
      outputDirectory: request.options?.outputDirectory,
      outputFileName: request.options?.outputFileName,
      targetExtension,
      overwrite: request.options?.overwrite,
      suffix: 'merged',
    });

    const tempDir = await fs.mkdtemp(path.join(tmpdir(), 'audio-merge-'));
    const listFilePath = path.join(tempDir, `${randomUUID()}.txt`);

    try {
      const listContent = sourcePaths
        .map((audioPath) => `file ${JSON.stringify(audioPath)}`)
        .join('\n');
      await fs.writeFile(listFilePath, listContent, 'utf8');

      const baseArgs = [
        request.options?.overwrite ? '-y' : '-n',
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listFilePath,
      ];

      try {
        await this.ffmpeg.run([...baseArgs, '-c', 'copy', outputPath]);
        logger.success('Audio merged with stream copy', { outputPath });
        return outputPath;
      } catch (error) {
        logger.warn('Stream copy merge failed, retrying with re-encode', {
          error,
        });

        await this.ffmpeg.run([...baseArgs, outputPath]);
        logger.success('Audio merged with re-encode fallback', { outputPath });
        return outputPath;
      }
    } catch (error) {
      logger.error('Audio merge failed', { error, sourcePaths });
      throw new AppError(
        AppErrorCode.EXECUTION_FAILED,
        `音频合并失败: ${(error as Error).message}`,
        {
          cause: error,
        },
      );
    } finally {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temporary merge directory', { cleanupError, tempDir });
      }
    }
  }
}

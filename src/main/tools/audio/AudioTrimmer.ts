import * as path from 'node:path';
import { AppError, AppErrorCode } from '../../../shared/errors';
import type { AudioTrimRequest } from '@shared/types/audio';
import { createLogger } from '../../../shared/utils/logger';
import { FFmpegService } from './FFmpegService';
import { resolveOutputPath } from './OutputPathResolver';

const logger = createLogger('AudioTrimmer');

export class AudioTrimmer {
  constructor(private readonly ffmpeg: FFmpegService = new FFmpegService()) {}

  async trim(request: AudioTrimRequest): Promise<string> {
    if (!request || typeof request !== 'object') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '裁剪请求无效');
    }

    const { sourcePath, options } = request;
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '必须提供有效的源文件路径');
    }

    if (!options || typeof options.startTime !== 'number' || options.startTime < 0) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '必须提供非负的开始时间');
    }

    if (
      options.endTime !== undefined &&
      (typeof options.endTime !== 'number' || options.endTime <= options.startTime)
    ) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '结束时间必须晚于开始时间');
    }

    if (
      options.duration !== undefined &&
      (typeof options.duration !== 'number' || options.duration <= 0)
    ) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '持续时间必须为正数');
    }

    const sourceExtension = path.extname(sourcePath).replace('.', '') || 'mp3';
    const targetExtension = options.targetFormat
      ? options.targetFormat.startsWith('.')
        ? options.targetFormat.slice(1)
        : options.targetFormat
      : sourceExtension;

    const outputPath = await resolveOutputPath({
      sourcePath,
      outputDirectory: options.outputDirectory,
      outputFileName: options.outputFileName,
      targetExtension,
      overwrite: options.overwrite,
      suffix: 'trimmed',
    });

    const args: string[] = [];
    args.push(options.overwrite ? '-y' : '-n');
    args.push('-hide_banner');
    args.push('-loglevel', 'error');
    args.push('-ss', options.startTime.toFixed(3));

    if (options.endTime !== undefined) {
      args.push('-to', options.endTime.toFixed(3));
    } else if (options.duration !== undefined) {
      args.push('-t', options.duration.toFixed(3));
    }

    args.push('-i', sourcePath);
    args.push('-vn');

    const shouldCopyCodec = !options.targetFormat;
    if (shouldCopyCodec) {
      args.push('-c:a', 'copy');
    }

    if (options.targetFormat) {
      args.push('-f', targetExtension);
    }

    args.push(outputPath);

    try {
      await this.ffmpeg.run(args);
      logger.success('Audio trimmed', { sourcePath, outputPath });
      return outputPath;
    } catch (error) {
      logger.error('Audio trimming failed', { sourcePath, outputPath, error });
      throw new AppError(
        AppErrorCode.EXECUTION_FAILED,
        `音频裁剪失败: ${(error as Error).message}`,
        { cause: error },
      );
    }
  }
}

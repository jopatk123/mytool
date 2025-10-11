import { AppError, AppErrorCode } from '../../../shared/errors';
import type { AudioConvertRequest } from '@shared/types/audio';
import { createLogger } from '../../../shared/utils/logger';
import { FFmpegService } from './FFmpegService';
import { resolveOutputPath } from './OutputPathResolver';

const logger = createLogger('AudioTranscoder');

export class AudioTranscoder {
  constructor(private readonly ffmpeg: FFmpegService = new FFmpegService()) {}

  async convert(request: AudioConvertRequest): Promise<string> {
    if (!request || typeof request !== 'object') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '转换请求无效');
    }

    const { sourcePath, options } = request;
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '必须提供有效的源文件路径');
    }

    if (!options || typeof options.targetFormat !== 'string' || options.targetFormat.length === 0) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '必须指定目标格式');
    }

    const targetExtension = options.targetFormat.startsWith('.')
      ? options.targetFormat.slice(1)
      : options.targetFormat;

    const outputPath = await resolveOutputPath({
      sourcePath,
      outputDirectory: options.outputDirectory,
      outputFileName: options.outputFileName,
      targetExtension,
      overwrite: options.overwrite,
      suffix: 'converted',
    });

    const args: string[] = [];
    args.push(options.overwrite ? '-y' : '-n');
    args.push('-hide_banner');
    args.push('-loglevel', 'error');
    args.push('-i', sourcePath);
    args.push('-vn');

    if (options.bitrate) {
      args.push('-b:a', options.bitrate);
    }

    if (typeof options.sampleRate === 'number' && Number.isFinite(options.sampleRate)) {
      args.push('-ar', String(options.sampleRate));
    }

    if (typeof options.channels === 'number' && Number.isFinite(options.channels)) {
      args.push('-ac', String(options.channels));
    }

    args.push(outputPath);

    try {
      await this.ffmpeg.run(args);
      logger.success('Audio converted', { sourcePath, outputPath });
      return outputPath;
    } catch (error) {
      logger.error('Audio conversion failed', { sourcePath, outputPath, error });
      throw new AppError(
        AppErrorCode.EXECUTION_FAILED,
        `音频转换失败: ${(error as Error).message}`,
        { cause: error },
      );
    }
  }
}

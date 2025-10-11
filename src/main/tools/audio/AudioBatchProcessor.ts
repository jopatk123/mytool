import { AppError, AppErrorCode } from '../../../shared/errors';
import type { AudioBatchRequest, AudioBatchResult, AudioBatchResultItem } from '@shared/types/audio';
import { createLogger } from '../../../shared/utils/logger';
import { AudioTranscoder } from './AudioTranscoder';
import { AudioTrimmer } from './AudioTrimmer';

const logger = createLogger('AudioBatchProcessor');

export class AudioBatchProcessor {
  constructor(
    private readonly transcoder: AudioTranscoder = new AudioTranscoder(),
    private readonly trimmer: AudioTrimmer = new AudioTrimmer(),
  ) {}

  async process(request: AudioBatchRequest): Promise<AudioBatchResult> {
    if (!request || typeof request !== 'object' || !Array.isArray(request.tasks)) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '批量处理请求无效');
    }

    const tasks = request.tasks.filter((task) =>
      typeof task?.sourcePath === 'string' && task.sourcePath.trim().length > 0,
    );

    if (tasks.length === 0) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, '缺少有效的批处理任务');
    }

    const concurrency = Math.max(1, Math.min(request.options?.concurrency ?? 4, tasks.length));
    const overwrite = request.options?.overwrite ?? false;
    const fallbackOutputDirectory = request.options?.fallbackOutputDirectory ?? null;

    let index = 0;
    const results: AudioBatchResultItem[] = [];

    const getNextTask = (): (typeof tasks)[number] | undefined => {
      const currentIndex = index;
      index += 1;
      return currentIndex < tasks.length ? tasks[currentIndex] : undefined;
    };

    const worker = async () => {
      for (let task = getNextTask(); task; task = getNextTask()) {
        const itemResult: AudioBatchResultItem = {
          sourcePath: task.sourcePath,
          success: false,
          outputPaths: [],
          errors: [],
        };

        let currentSource = task.sourcePath;

        for (const operation of task.operations ?? []) {
          try {
            if (operation.type === 'convert') {
              const output = await this.transcoder.convert({
                sourcePath: currentSource,
                options: {
                  ...operation.options,
                  overwrite: operation.options.overwrite ?? overwrite,
                  outputDirectory:
                    operation.options.outputDirectory ?? task.outputDirectory ?? fallbackOutputDirectory,
                  outputFileName: operation.options.outputFileName ?? task.outputFileName,
                },
              });
              currentSource = output;
              itemResult.outputPaths.push(output);
            } else if (operation.type === 'trim') {
              const output = await this.trimmer.trim({
                sourcePath: currentSource,
                options: {
                  ...operation.options,
                  overwrite: operation.options.overwrite ?? overwrite,
                  outputDirectory:
                    operation.options.outputDirectory ?? task.outputDirectory ?? fallbackOutputDirectory,
                  outputFileName: operation.options.outputFileName ?? task.outputFileName,
                },
              });
              currentSource = output;
              itemResult.outputPaths.push(output);
            } else {
              itemResult.errors.push(`不支持的操作类型: ${(operation as { type?: string }).type}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            itemResult.errors.push(message);
            logger.error('Batch operation failed', {
              sourcePath: currentSource,
              operation: operation.type,
              error,
            });
            break;
          }
        }

        itemResult.success = itemResult.errors.length === 0;
        results.push(itemResult);
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < concurrency; i += 1) {
      workers.push(worker());
    }
    await Promise.all(workers);

    const succeeded = results.filter((item) => item.success).length;
    const failed = results.length - succeeded;

    return {
      total: results.length,
      succeeded,
      failed,
      items: results,
    };
  }
}

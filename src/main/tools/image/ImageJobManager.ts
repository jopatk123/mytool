import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createLogger } from '../../../shared/utils/logger';
import type {
  ImageAsset,
  ImageBatchOperation,
  ImageJobEvent,
  ImageJobItemResult,
  ImageJobProgress,
  ImageJobRequest,
  ImageJobSummary,
  ImageJobError,
} from '../../../shared/types';
import { IPCChannel } from '../../../shared/types';
import type { WebContents } from 'electron';
import { ImageAssetProcessor } from './processing/ImageAssetProcessor';
import { JobOptions } from './job/JobOptions';

const DEFAULT_CONCURRENCY = 3;
const MAX_CONCURRENCY = 8;

const logger = createLogger('ImageJobManager');

interface StartJobOptions {
  request: ImageJobRequest;
  assets: ImageAsset[];
  sender?: WebContents;
}

interface ActiveJob {
  id: string;
  sender?: WebContents;
  options: JobOptions;
  assets: ImageAsset[];
  operations: ImageBatchOperation[];
  startedAt: number;
  completed: number;
  failed: number;
  pending: number;
  results: ImageJobItemResult[];
  errors: ImageJobError[];
  abortController: AbortController;
  cancelled: boolean;
}

const ensureWithin = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

export class ImageJobManager {
  private readonly jobs = new Map<string, ActiveJob>();

  startJob(options: StartJobOptions): string {
    const { request, assets, sender } = options;
    const jobId = request.jobId ?? randomUUID();

    const normalizedOptions: JobOptions = {
      concurrency: ensureWithin(
        request.options?.concurrency ?? DEFAULT_CONCURRENCY,
        1,
        MAX_CONCURRENCY,
      ),
      outputDirectory: request.options?.outputDirectory ?? null,
      overwrite: request.options?.overwrite ?? false,
      preserveMetadata: request.options?.preserveMetadata ?? true,
      dryRun: request.options?.dryRun ?? false,
    };

    const job: ActiveJob = {
      id: jobId,
      sender,
      options: normalizedOptions,
      assets,
      operations: options.request.operations,
      startedAt: Date.now(),
      completed: 0,
      failed: 0,
      pending: assets.length,
      results: [],
      errors: [],
      abortController: new AbortController(),
      cancelled: false,
    };

    this.jobs.set(jobId, job);
    this.emit(sender, { type: 'start', jobId, total: assets.length });

    void this.processJob(job).catch((error) => {
      logger.error('Job processing failed', { jobId, error });
      this.emit(sender, {
        type: 'completed',
        summary: this.toSummary(job, true, error instanceof Error ? error.message : String(error)),
      });
    });

    return jobId;
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    job.cancelled = true;
    job.abortController.abort();
    this.emit(job.sender, { type: 'cancelled', jobId, reason: '用户取消' });
    this.jobs.delete(jobId);
    return true;
  }

  private async processJob(job: ActiveJob): Promise<void> {
    const { concurrency } = job.options;
    const queue = [...job.assets];

    const workers: Array<Promise<void>> = Array.from({ length: concurrency }, () => {
      const processor = new ImageAssetProcessor({
        jobId: job.id,
        options: job.options,
        operations: job.operations,
      });
      return this.worker(job, queue, processor);
    });
    await Promise.all(workers);

    if (job.cancelled) {
      return;
    }

    const summary = this.toSummary(job, false);
    this.emit(job.sender, { type: 'completed', summary });
    this.jobs.delete(job.id);
  }

  private async worker(
    job: ActiveJob,
    queue: ImageAsset[],
    processor: ImageAssetProcessor,
  ): Promise<void> {
    while (queue.length > 0) {
      if (job.abortController.signal.aborted) {
        return;
      }

      const asset = queue.shift();
      if (!asset) {
        return;
      }

      this.emit(job.sender, {
        type: 'progress',
        payload: this.buildProgress(job, asset.id, `处理中: ${path.basename(asset.filePath)}`),
      });

      try {
        const result = await processor.process(asset);
        job.completed += 1;
        job.results.push(result);
        this.emit(job.sender, { type: 'item', jobId: job.id, result });
      } catch (error) {
        job.failed += 1;
        const jobError: ImageJobError = {
          assetId: asset.id,
          error: error instanceof Error ? error.message : String(error),
        };
        job.errors.push(jobError);
        this.emit(job.sender, { type: 'error', jobId: job.id, error: jobError });
        logger.warn('Failed to process image', { jobId: job.id, asset: asset.filePath, error });
      } finally {
        job.pending -= 1;
        this.emit(job.sender, {
          type: 'progress',
          payload: this.buildProgress(job, undefined, undefined),
        });
      }
    }
  }

  private buildProgress(job: ActiveJob, assetId?: string, message?: string): ImageJobProgress {
    const total = job.assets.length;
    const completed = job.completed;
    const failed = job.failed;
    const pending = Math.max(total - completed - failed, 0);
    const percent = total === 0 ? 100 : Math.round(((completed + failed) / total) * 100);

    return {
      jobId: job.id,
      total,
      completed,
      failed,
      pending,
      percent,
      currentAssetId: assetId,
      message,
    };
  }

  private emit(sender: WebContents | undefined, event: ImageJobEvent): void {
    if (!sender || sender.isDestroyed()) {
      return;
    }

    sender.send(IPCChannel.IMAGE_JOB_EVENT, event);
  }

  private toSummary(job: ActiveJob, failed: boolean, errorMessage?: string): ImageJobSummary {
    const finishedAt = Date.now();
    const duration = finishedAt - job.startedAt;
    if (failed && errorMessage) {
      job.errors.push({ assetId: 'job', error: errorMessage });
    }

    return {
      jobId: job.id,
      total: job.assets.length,
      completed: job.completed,
      failed: job.failed,
      startedAt: job.startedAt,
      finishedAt,
      durationMs: duration,
      results: job.results,
      errors: job.errors,
    };
  }
}

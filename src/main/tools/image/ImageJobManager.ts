import { createReadStream, promises as fs } from 'node:fs';
import * as path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { createLogger } from '../../../shared/utils/logger.js';
import type {
  ImageAsset,
  ImageBatchOperation,
  ImageJobEvent,
  ImageJobItemResult,
  ImageJobProgress,
  ImageJobRequest,
  ImageJobSummary,
  ImageJobError,
} from '../../../shared/types.js';
import { IPCChannel } from '../../../shared/types.js';
import type { WebContents } from 'electron';

const DEFAULT_CONCURRENCY = 3;
const MAX_CONCURRENCY = 8;

const logger = createLogger('ImageJobManager');

interface StartJobOptions {
  request: ImageJobRequest;
  assets: ImageAsset[];
  sender?: WebContents;
}

type HashRenameOperation = Extract<ImageBatchOperation, { type: 'hashRename' }>;

interface JobOptions {
  concurrency: number;
  outputDirectory: string | null;
  overwrite: boolean;
  preserveMetadata: boolean;
  dryRun: boolean;
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

const ensureDirectory = async (targetDir: string): Promise<void> => {
  await fs.mkdir(targetDir, { recursive: true });
};

const moveFileSafe = async (tempPath: string, destination: string, overwrite: boolean): Promise<void> => {
  await ensureDirectory(path.dirname(destination));

  if (!overwrite) {
    const exists = await fileExists(destination);
    if (exists) {
      throw new Error(`目标文件已存在: ${destination}`);
    }
  }

  await fs.rename(tempPath, destination);
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const computeHash = async (filePath: string, algorithm: HashRenameOperation['algorithm'] = 'sha256'): Promise<string> => {
  const hash = createHash(algorithm ?? 'sha256');
  return await new Promise<string>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};

const clampQuality = (value: number | undefined, fallback = 80): number => {
  if (typeof value !== 'number') return fallback;
  return ensureWithin(Math.round(value), 1, 100);
};

const createTempFilePath = (jobId: string, extension: string): string => {
  const normalized = extension.startsWith('.') ? extension : `.${extension}`;
  const safeExt = normalized === '.' ? '' : normalized;
  return path.join(tmpdir(), `${jobId}-${randomUUID()}${safeExt}`);
};

const guessExtension = (format: string | undefined, fallback: string): string => {
  if (!format) return fallback;
  return format.toLowerCase();
};

const normalizeSharpFormat = (format: string): keyof sharp.FormatEnum | null => {
  const lower = format.toLowerCase();
  if (lower === 'jpg') return 'jpeg';
  if (lower === 'tif') return 'tiff';
  if (lower === 'svg') return null;
  if (lower in sharp.format) {
    return lower as keyof sharp.FormatEnum;
  }
  return null;
};

const buildOutputPath = (asset: ImageAsset, job: ActiveJob, extension: string): string => {
  const baseDir = job.options.outputDirectory ? path.resolve(job.options.outputDirectory) : path.dirname(asset.filePath);
  const relativeDir = job.options.outputDirectory ? path.dirname(asset.relativePath) : '';
  const directory = job.options.outputDirectory ? path.join(baseDir, relativeDir) : baseDir;
  const fileName = path.basename(asset.filePath, path.extname(asset.filePath));
  const finalExt = extension.startsWith('.') ? extension : `.${extension}`;
  return path.join(directory, `${fileName}${finalExt}`);
};

const generateUniquePath = async (filePath: string): Promise<string> => {
  if (!(await fileExists(filePath))) {
    return filePath;
  }

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);

  for (let i = 1; i < 1000; i += 1) {
    const candidate = path.join(dir, `${name}_${i}${ext}`);
    if (!(await fileExists(candidate))) {
      return candidate;
    }
  }

  throw new Error('无法为文件生成唯一名称');
};

export class ImageJobManager {
  private readonly jobs = new Map<string, ActiveJob>();

  startJob(options: StartJobOptions): string {
    const { request, assets, sender } = options;
    const jobId = request.jobId ?? randomUUID();

    const normalizedOptions: JobOptions = {
      concurrency: ensureWithin(request.options?.concurrency ?? DEFAULT_CONCURRENCY, 1, MAX_CONCURRENCY),
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

    void this.processJob(job).catch(error => {
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

  const workers: Array<Promise<void>> = Array.from({ length: concurrency }, () => this.worker(job, queue));
    await Promise.all(workers);

    if (job.cancelled) {
      return;
    }

    const summary = this.toSummary(job, false);
    this.emit(job.sender, { type: 'completed', summary });
    this.jobs.delete(job.id);
  }

  private async worker(job: ActiveJob, queue: ImageAsset[]): Promise<void> {
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
        const result = await this.processAsset(job, asset);
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

  private async processAsset(job: ActiveJob, asset: ImageAsset): Promise<ImageJobItemResult> {
    if (job.options.dryRun) {
      return {
        assetId: asset.id,
        originalPath: asset.filePath,
        outputPath: asset.filePath,
        operationsApplied: job.operations.map(op => op.type),
      };
    }

    let workingPath = asset.filePath;
    const warnings: string[] = [];
    const operationsApplied: ImageBatchOperation['type'][] = [];

    const resizeOp = job.operations.find(op => op.type === 'resize');
    const compressOp = job.operations.find(op => op.type === 'compress');
    const hashOp = job.operations.find(op => op.type === 'hashRename');

    let finalExtension = asset.extension;
    if (compressOp?.type === 'compress') {
      finalExtension = guessExtension(compressOp.targetFormat, finalExtension);
    }

    if (resizeOp || compressOp) {
      const pipeline = sharp(asset.filePath, { failOn: 'none' });

      if (resizeOp?.type === 'resize') {
        pipeline.resize({
          width: resizeOp.width,
          height: resizeOp.height,
          fit: resizeOp.fit ?? 'cover',
          withoutEnlargement: resizeOp.withoutEnlargement ?? true,
          fastShrinkOnLoad: true,
        });
        operationsApplied.push('resize');
      }

      if (compressOp?.type === 'compress') {
        const quality = clampQuality(compressOp.quality);
        const rawFormat = compressOp.targetFormat ?? finalExtension;
        const targetFormat = normalizeSharpFormat(rawFormat) ?? 'jpeg';

        switch (targetFormat) {
          case 'jpeg':
            pipeline.jpeg({ quality, mozjpeg: true });
            break;
          case 'png':
            pipeline.png({ compressionLevel: Math.round((9 * (100 - quality)) / 100) });
            break;
          case 'webp':
            pipeline.webp({ quality });
            break;
          default:
            pipeline.toFormat(targetFormat);
            warnings.push(`格式 ${targetFormat} 不支持自定义压缩质量，已使用默认配置`);
            break;
        }

        finalExtension = targetFormat;
        operationsApplied.push('compress');
      }

      const tempPath = createTempFilePath(job.id, finalExtension);
      await ensureDirectory(path.dirname(tempPath));
      await pipeline.toFile(tempPath);
      workingPath = tempPath;
    }

    let outputPath = buildOutputPath(asset, job, finalExtension);

    if (!job.options.overwrite) {
      outputPath = await generateUniquePath(outputPath);
    }

    if (workingPath !== asset.filePath) {
      await moveFileSafe(workingPath, outputPath, job.options.overwrite);
    } else if (outputPath !== asset.filePath) {
      // 仅复制到目标目录
      await ensureDirectory(path.dirname(outputPath));
      await fs.copyFile(asset.filePath, outputPath);
    }

    let hash: string | undefined;
    if (hashOp?.type === 'hashRename') {
      hash = await computeHash(outputPath, hashOp.algorithm);
      const nextName = hashOp.prefix ? `${hashOp.prefix}${hash}` : hash;
      const ext = hashOp.keepExtension === false ? '' : path.extname(outputPath) || `.${finalExtension}`;
      const finalName = `${nextName}${ext}`;
      const destination = path.join(path.dirname(outputPath), finalName);
      const targetPath = job.options.overwrite ? destination : await generateUniquePath(destination);
      await moveOrRename(outputPath, targetPath, job.options.overwrite);
      outputPath = targetPath;
      operationsApplied.push('hashRename');
    }

    return {
      assetId: asset.id,
      originalPath: asset.filePath,
      outputPath,
      operationsApplied,
      hash,
      warnings: warnings.length > 0 ? warnings : undefined,
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

const moveOrRename = async (source: string, destination: string, overwrite: boolean): Promise<void> => {
  await ensureDirectory(path.dirname(destination));

  if (!overwrite && (await fileExists(destination))) {
    throw new Error(`目标文件已存在: ${destination}`);
  }

  await fs.rename(source, destination);
};

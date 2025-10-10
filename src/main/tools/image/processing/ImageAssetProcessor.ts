import { createReadStream, promises as fs } from 'node:fs';
import * as path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import type {
  ImageAsset,
  ImageBatchOperation,
  ImageJobItemResult,
} from '../../../../shared/types';
import { JobOptions } from '../job/JobOptions';

type HashRenameOperation = Extract<ImageBatchOperation, { type: 'hashRename' }>;
type OperationType = ImageBatchOperation['type'];

export interface ImageAssetProcessorConfig {
  jobId: string;
  options: JobOptions;
  operations: ImageBatchOperation[];
}

export class ImageAssetProcessor {
  private readonly jobId: string;
  private readonly options: JobOptions;
  private readonly operations: ImageBatchOperation[];

  constructor(config: ImageAssetProcessorConfig) {
    this.jobId = config.jobId;
    this.options = config.options;
    this.operations = config.operations;
  }

  async process(asset: ImageAsset): Promise<ImageJobItemResult> {
    if (this.options.dryRun) {
      return {
        assetId: asset.id,
        originalPath: asset.filePath,
        outputPath: asset.filePath,
        operationsApplied: this.operations.map(operation => operation.type),
      };
    }

    let workingPath = asset.filePath;
    const warnings: string[] = [];
    const operationsApplied: OperationType[] = [];

    const resizeOp = this.operations.find(op => op.type === 'resize');
    const compressOp = this.operations.find(op => op.type === 'compress');
    const hashOp = this.operations.find(op => op.type === 'hashRename') as HashRenameOperation | undefined;

    let finalExtension = asset.extension;
    let targetFormat = asset.extension;

    if (compressOp?.type === 'compress') {
      targetFormat = guessExtension(compressOp.targetFormat, finalExtension);
      if (!this.options.overwrite || this.options.outputDirectory) {
        finalExtension = targetFormat;
      }
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
        const sharpFormat = normalizeSharpFormat(targetFormat) ?? 'jpeg';

        switch (sharpFormat) {
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
            pipeline.toFormat(sharpFormat);
            warnings.push(`格式 ${sharpFormat} 不支持自定义压缩质量，已使用默认配置`);
            break;
        }

        operationsApplied.push('compress');
      }

      const tempPath = createTempFilePath(this.jobId, targetFormat);
      await ensureDirectory(path.dirname(tempPath));
      await pipeline.toFile(tempPath);
      workingPath = tempPath;
    }

    let outputPath = buildOutputPath(asset, this.options, finalExtension);

    if (!this.options.overwrite) {
      outputPath = await generateUniquePath(outputPath);
    }

    if (workingPath !== asset.filePath) {
      await moveFileSafe(workingPath, outputPath, this.options.overwrite);
    } else if (outputPath !== asset.filePath) {
      await ensureDirectory(path.dirname(outputPath));
      await fs.copyFile(asset.filePath, outputPath);
    }

    let hash: string | undefined;
    if (hashOp) {
      hash = await computeHash(outputPath, hashOp.algorithm);
      const nextName = hashOp.prefix ? `${hashOp.prefix}${hash}` : hash;
      const currentExt = path.extname(outputPath) || `.${finalExtension}`;
      const ext = hashOp.keepExtension === false ? '' : currentExt;
      const finalName = `${nextName}${ext}`;
      const destination = path.join(path.dirname(outputPath), finalName);
      const targetPath = this.options.overwrite ? destination : await generateUniquePath(destination);
      await moveOrRename(outputPath, targetPath, this.options.overwrite);
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
}

const ensureDirectory = async (targetDir: string): Promise<void> => {
  await fs.mkdir(targetDir, { recursive: true });
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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

const clampQuality = (value: number | undefined, fallback = 80): number => {
  if (typeof value !== 'number') return fallback;
  return ensureWithin(Math.round(value), 1, 100);
};

const ensureWithin = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const buildOutputPath = (asset: ImageAsset, options: JobOptions, extension: string): string => {
  const baseDir = options.outputDirectory ? path.resolve(options.outputDirectory) : path.dirname(asset.filePath);
  const relativeDir = options.outputDirectory ? path.dirname(asset.relativePath) : '';
  const directory = options.outputDirectory ? path.join(baseDir, relativeDir) : baseDir;
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

const computeHash = async (filePath: string, algorithm: HashRenameOperation['algorithm'] = 'sha256'): Promise<string> => {
  const hash = createHash(algorithm ?? 'sha256');
  return await new Promise<string>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};

const moveOrRename = async (source: string, destination: string, overwrite: boolean): Promise<void> => {
  await ensureDirectory(path.dirname(destination));

  if (!overwrite && (await fileExists(destination))) {
    throw new Error(`目标文件已存在: ${destination}`);
  }

  await fs.rename(source, destination);
};

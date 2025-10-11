import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import type { ImageAsset, ImageBatchOperation, ImageJobItemResult } from '@shared/types';
import { JobOptions } from '../job/JobOptions';
import {
  buildOutputPath,
  createTempFilePath,
  ensureDirectory,
  generateUniquePath,
  moveFileSafe,
} from './fileUtils';
import { applyHashRefresh, computeHash, normalizeExtension } from './hashUtils';
import { OperationType, runSharpOperations } from './sharpOperations';

type HashRenameOperation = Extract<ImageBatchOperation, { type: 'hashRename' }>;
type ResizeOperation = Extract<ImageBatchOperation, { type: 'resize' }>;
type CompressOperation = Extract<ImageBatchOperation, { type: 'compress' }>;
type CropOperation = Extract<ImageBatchOperation, { type: 'crop' }>;
type RotateOperation = Extract<ImageBatchOperation, { type: 'rotate' }>;

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
        operationsApplied: this.operations.map((operation) => operation.type),
      };
    }

    const resizeOp = this.findOperation<ResizeOperation>('resize');
    const compressOp = this.findOperation<CompressOperation>('compress');
    const cropOp = this.findOperation<CropOperation>('crop');
    const rotateOp = this.findOperation<RotateOperation>('rotate');
    const hashOp = this.findOperation<HashRenameOperation>('hashRename');

    const normalizedOriginalExt = normalizeExtension(asset.extension);
    const warnings: string[] = [];
    const operationsApplied: OperationType[] = [];

    let finalExtension = asset.extension;
    let targetFormat = asset.extension;

    if (compressOp) {
      targetFormat = guessExtension(compressOp.targetFormat, finalExtension);
      if (hashOp) {
        if (normalizeExtension(targetFormat) !== normalizedOriginalExt) {
          warnings.push('哈希刷新时将保留原始格式，已忽略压缩操作中指定的输出格式');
        }
        targetFormat = normalizedOriginalExt;
        finalExtension = asset.extension;
      } else if (!this.options.overwrite || this.options.outputDirectory) {
        finalExtension = targetFormat;
      }
    }

    const sharpResult = await runSharpOperations({
      asset,
      jobId: this.jobId,
      resizeOp,
      compressOp,
      cropOp,
      rotateOp,
      targetFormat,
      finalExtension,
    });

    let workingPath = sharpResult.path;
    let workingPathIsTemp = sharpResult.isTemp;
    operationsApplied.push(...sharpResult.applied);
    warnings.push(...sharpResult.warnings);

    let outputPath = hashOp ? asset.filePath : buildOutputPath(asset, this.options, finalExtension);

    const shouldOverwrite = hashOp ? true : this.options.overwrite;
    if (!shouldOverwrite) {
      outputPath = await generateUniquePath(outputPath);
    }

    if (hashOp && !workingPathIsTemp) {
      const tempPath = createTempFilePath(this.jobId, finalExtension);
      await ensureDirectory(path.dirname(tempPath));
      await fs.copyFile(workingPath, tempPath);
      workingPath = tempPath;
      workingPathIsTemp = true;
    }

    if (hashOp) {
      await applyHashRefresh(workingPath, finalExtension);
      operationsApplied.push('hashRename');
    }

    if (workingPath !== outputPath) {
      await moveFileSafe(workingPath, outputPath, shouldOverwrite);
      workingPathIsTemp = false;
    } else if (!hashOp && outputPath !== asset.filePath) {
      await ensureDirectory(path.dirname(outputPath));
      await fs.copyFile(asset.filePath, outputPath);
    }

    let hash: string | undefined;
    if (hashOp) {
      hash = await computeHash(outputPath, hashOp.algorithm);
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

  private findOperation<T extends ImageBatchOperation>(type: T['type']): T | undefined {
    return this.operations.find((operation) => operation.type === type) as T | undefined;
  }
}

const guessExtension = (format: string | undefined, fallback: string): string => {
  if (!format) {
    return fallback;
  }
  return format.toLowerCase();
};

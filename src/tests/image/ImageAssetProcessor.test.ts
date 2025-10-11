import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';
import type { ImageBatchOperation } from '@shared/types';
import { ImageAssetProcessor } from '@main/tools/image/processing/ImageAssetProcessor';
import type { ImageAsset } from '@shared/types';
import type { JobOptions } from '@main/tools/image/job/JobOptions';
import { cleanupWorkspace, createTempWorkspace } from './testUtils';

const getDarkestEdgeIntensity = async (filePath: string): Promise<number> => {
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const width = info.width ?? 0;
  const height = info.height ?? 0;

  if (channels < 3 || width === 0 || height === 0) {
    return 0;
  }

  let minIntensity = 255;

  const sampleIntensity = (offset: number) => {
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    const intensity = (r + g + b) / 3;
    if (intensity < minIntensity) {
      minIntensity = intensity;
    }
  };

  for (let x = 0; x < width; x += 1) {
    const topOffset = x * channels;
    const bottomOffset = ((height - 1) * width + x) * channels;
    sampleIntensity(topOffset);
    sampleIntensity(bottomOffset);
  }

  for (let y = 0; y < height; y += 1) {
    const leftOffset = y * width * channels;
    const rightOffset = (y * width + (width - 1)) * channels;
    sampleIntensity(leftOffset);
    sampleIntensity(rightOffset);
  }

  return minIntensity;
};

describe('ImageAssetProcessor', () => {
  let assets: ImageAsset[];
  let outputDir: string;
  let workspaceDir: string;

  beforeEach(async () => {
    const workspace = await createTempWorkspace();
    assets = workspace.assets;
    outputDir = workspace.outputDir;
    workspaceDir = workspace.dir;
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceDir);
  });

  it('returns dry run summary when dryRun is enabled', async () => {
    const options: JobOptions = {
      concurrency: 2,
      outputDirectory: null,
      overwrite: false,
      preserveMetadata: true,
      dryRun: true,
    };

    const operations: ImageBatchOperation[] = [
      { type: 'resize', width: 64, height: 64 },
      { type: 'compress', quality: 70, targetFormat: 'jpeg' },
      { type: 'hashRename', algorithm: 'sha1' },
    ];

    const processor = new ImageAssetProcessor({ jobId: 'job', options, operations });
    const result = await processor.process(assets[0]);

    expect(result.originalPath).toBe(assets[0].filePath);
    expect(result.outputPath).toBe(assets[0].filePath);
    expect(result.operationsApplied).toEqual(operations.map((operation) => operation.type));
    expect(result.hash).toBeUndefined();
    expect(
      await fs
        .access(result.outputPath)
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
  });

  it('refreshes hash in place even when overwrite is disabled', async () => {
    const options: JobOptions = {
      concurrency: 2,
      outputDirectory: outputDir,
      overwrite: false,
      preserveMetadata: true,
      dryRun: false,
    };

    const operations: ImageBatchOperation[] = [{ type: 'hashRename', algorithm: 'sha1' }];

    const processor = new ImageAssetProcessor({ jobId: 'job-hash', options, operations });

    const asset = assets[0];
    const originalBuffer = await fs.readFile(asset.filePath);
    const originalHash = createHash('sha1').update(originalBuffer).digest('hex');

    const result = await processor.process(asset);

    expect(result.operationsApplied).toEqual(['hashRename']);
    expect(result.outputPath).toBe(asset.filePath);
    expect(result.hash).toBeDefined();
    expect(result.hash).not.toBe(originalHash);

    const updatedBuffer = await fs.readFile(asset.filePath);
    const recalculatedHash = createHash('sha1').update(updatedBuffer).digest('hex');
    expect(result.hash).toBe(recalculatedHash);

    expect(
      await fs
        .access(result.outputPath)
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
  });

  it('crops image according to provided pixels', async () => {
    const options: JobOptions = {
      concurrency: 2,
      outputDirectory: outputDir,
      overwrite: false,
      preserveMetadata: true,
      dryRun: false,
    };

    const operations: ImageBatchOperation[] = [
      {
        type: 'crop',
        pixels: { top: 10, bottom: 5, left: 4, right: 1 },
      },
    ];

    const processor = new ImageAssetProcessor({ jobId: 'job-crop', options, operations });
    const asset = assets[1];
    const originalMetadata = await sharp(asset.filePath).metadata();

    const result = await processor.process(asset);

    expect(result.operationsApplied).toContain('crop');
    expect(result.outputPath).not.toBe(asset.filePath);

    const croppedMetadata = await sharp(result.outputPath).metadata();
    const expectedWidth = (originalMetadata.width ?? 0) - 5;
    const expectedHeight = (originalMetadata.height ?? 0) - 15;
    expect(croppedMetadata.width).toBe(expectedWidth);
    expect(croppedMetadata.height).toBe(expectedHeight);
  });

  it('rotates image within random range and auto-crops blank areas', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.75);

    const options: JobOptions = {
      concurrency: 2,
      outputDirectory: null,
      overwrite: false,
      preserveMetadata: true,
      dryRun: false,
    };

    const operations: ImageBatchOperation[] = [
      {
        type: 'rotate',
        mode: 'random',
        minAngle: -5,
        maxAngle: 5,
        autoCrop: true,
      },
    ];

    const processor = new ImageAssetProcessor({ jobId: 'job-rotate', options, operations });
    const asset = assets[0];
    const originalMetadata = await sharp(asset.filePath).metadata();

    const result = await processor.process(asset);

    expect(result.operationsApplied).toContain('rotate');
    expect(result.outputPath).not.toBe(asset.filePath);

    const rotatedMetadata = await sharp(result.outputPath).metadata();
    expect(rotatedMetadata.width).toBeDefined();
    expect(rotatedMetadata.height).toBeDefined();

    const diagonalLimit = Math.ceil(
      Math.sqrt((originalMetadata.width ?? 0) ** 2 + (originalMetadata.height ?? 0) ** 2),
    );
    expect(rotatedMetadata.width ?? 0).toBeLessThanOrEqual(diagonalLimit);
    expect(rotatedMetadata.height ?? 0).toBeLessThanOrEqual(diagonalLimit);
    expect(
      (rotatedMetadata.width ?? 0) === (originalMetadata.width ?? 0) &&
        (rotatedMetadata.height ?? 0) === (originalMetadata.height ?? 0),
    ).toBe(false);
    expect(rotatedMetadata.hasAlpha ?? false).toBe(false);

    const darkestEdge = await getDarkestEdgeIntensity(result.outputPath);
    expect(darkestEdge).toBeGreaterThan(10);

    randomSpy.mockRestore();
  });
});

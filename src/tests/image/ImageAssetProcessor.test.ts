import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import type { ImageBatchOperation } from '@shared/types';
import { ImageAssetProcessor } from '@main/tools/image/processing/ImageAssetProcessor';
import type { ImageAsset } from '@shared/types';
import type { JobOptions } from '@main/tools/image/job/JobOptions';
import { cleanupWorkspace, createTempWorkspace } from './testUtils';

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
    expect(result.operationsApplied).toEqual(operations.map(operation => operation.type));
    expect(result.hash).toBeUndefined();
    expect(await fs.access(result.outputPath).then(() => true).catch(() => false)).toBe(true);
  });

  it('refreshes hash in place even when overwrite is disabled', async () => {
    const options: JobOptions = {
      concurrency: 2,
      outputDirectory: outputDir,
      overwrite: false,
      preserveMetadata: true,
      dryRun: false,
    };

    const operations: ImageBatchOperation[] = [
      { type: 'hashRename', algorithm: 'sha1' },
    ];

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

    expect(await fs.access(result.outputPath).then(() => true).catch(() => false)).toBe(true);
  });
});

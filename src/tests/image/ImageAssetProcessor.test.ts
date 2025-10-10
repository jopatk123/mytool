import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
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
      { type: 'hashRename', algorithm: 'sha1', keepExtension: true },
    ];

    const processor = new ImageAssetProcessor({ jobId: 'job', options, operations });
    const result = await processor.process(assets[0]);

    expect(result.originalPath).toBe(assets[0].filePath);
    expect(result.outputPath).toBe(assets[0].filePath);
    expect(result.operationsApplied).toEqual(operations.map(operation => operation.type));
    expect(result.hash).toBeUndefined();
    expect(await fs.access(result.outputPath).then(() => true).catch(() => false)).toBe(true);
  });

  it('hash renames files without extension and avoids collisions when overwrite is false', async () => {
    const options: JobOptions = {
      concurrency: 2,
      outputDirectory: outputDir,
      overwrite: false,
      preserveMetadata: true,
      dryRun: false,
    };

    const operations: ImageBatchOperation[] = [
      { type: 'hashRename', algorithm: 'sha1', keepExtension: false, prefix: 'img-' },
    ];

    const processor = new ImageAssetProcessor({ jobId: 'job-hash', options, operations });

    const firstResult = await processor.process(assets[0]);
    const secondResult = await processor.process(assets[0]);

    expect(firstResult.operationsApplied).toEqual(['hashRename']);
    expect(secondResult.operationsApplied).toEqual(['hashRename']);

    expect(firstResult.hash).toBeDefined();
    expect(secondResult.hash).toBeDefined();

    expect(path.extname(firstResult.outputPath)).toBe('');
    expect(path.extname(secondResult.outputPath)).toBe('');

    expect(path.basename(firstResult.outputPath)).toBe(`img-${firstResult.hash}`);
  expect(path.basename(secondResult.outputPath)).toMatch(new RegExp(`^img-${secondResult.hash}(?:_\\d+)?$`));

    expect(await fs.access(firstResult.outputPath).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(secondResult.outputPath).then(() => true).catch(() => false)).toBe(true);

    expect(firstResult.outputPath).not.toBe(secondResult.outputPath);
  });
});

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import type { WebContents } from 'electron';
import type { ImageAsset, ImageJobEvent, ImageJobRequest, ImageJobSummary } from '@shared/types';
import { ImageJobManager } from '@main/tools/image/ImageJobManager';

const createImage = async (filePath: string, width: number, height: number, color: { r: number; g: number; b: number }) => {
  await sharp({ create: { width, height, channels: 3, background: color } })
    .jpeg()
    .toFile(filePath);
};

const createAsset = async (filePath: string, root: string): Promise<ImageAsset> => {
  const stats = await fs.stat(filePath);
  return {
    id: `${path.basename(filePath)}-${stats.mtimeMs}`,
    name: path.basename(filePath),
    filePath,
    fileUrl: `file://${filePath}`,
    size: stats.size,
    mimeType: 'image/jpeg',
    extension: 'jpg',
    modifiedAt: stats.mtimeMs,
    createdAt: stats.birthtimeMs,
    relativePath: path.relative(root, filePath),
  };
};

const createTempWorkspace = async () => {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'image-job-'));
  const assetsDir = path.join(dir, 'assets');
  const outputDir = path.join(dir, 'output');
  await fs.mkdir(assetsDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  const imageA = path.join(assetsDir, 'a.jpg');
  const imageB = path.join(assetsDir, 'b.jpg');
  await createImage(imageA, 128, 128, { r: 255, g: 128, b: 0 });
  await createImage(imageB, 256, 200, { r: 0, g: 128, b: 255 });

  const assetA = await createAsset(imageA, assetsDir);
  const assetB = await createAsset(imageB, assetsDir);

  return { dir, assetsDir, outputDir, assets: [assetA, assetB] };
};

const cleanup = async (dir: string) => {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
};

describe('ImageJobManager', () => {
  let workspace: Awaited<ReturnType<typeof createTempWorkspace>>;

  beforeEach(async () => {
    workspace = await createTempWorkspace();
  });

  afterEach(async () => {
    await cleanup(workspace.dir);
  });

  it('processes resize, compress and hash rename operations', async () => {
  const manager = new ImageJobManager();
  const events: ImageJobEvent[] = [];
    let resolveSummary: ((summary: ImageJobSummary) => void) | null = null;

    const summaryPromise = new Promise<ImageJobSummary>(resolve => {
      resolveSummary = resolve;
    });

    const sender: WebContents = {
      isDestroyed: () => false,
      send: (_channel: string, event: ImageJobEvent) => {
        events.push(event);
        if (event.type === 'completed') {
          resolveSummary?.(event.summary);
        }
      },
    } as unknown as WebContents;

    const request: ImageJobRequest = {
      scanId: 'test-scan',
      assetIds: workspace.assets.map(asset => asset.id),
      operations: [
        { type: 'resize', width: 64, height: 64, fit: 'inside' },
        { type: 'compress', quality: 70, targetFormat: 'jpeg' },
        { type: 'hashRename', algorithm: 'sha1', keepExtension: true },
      ],
      options: {
        outputDirectory: workspace.outputDir,
        overwrite: false,
      },
    };

    const jobId = manager.startJob({ request, assets: workspace.assets, sender });

    const summary = await Promise.race([
      summaryPromise,
      new Promise<ImageJobSummary>((_, reject) => setTimeout(() => reject(new Error('job timeout')), 10_000)),
    ]);

    expect(summary).toBeDefined();
    expect(summary.jobId).toBe(jobId);
    expect(summary.completed).toBe(workspace.assets.length);
    expect(summary.failed).toBe(0);
    expect(summary.results.length).toBe(workspace.assets.length);
    expect(events.some(event => event.type === 'start')).toBe(true);

    for (const result of summary.results) {
      const exists = await fs.access(result.outputPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });
});

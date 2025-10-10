import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import type { WebContents } from 'electron';
import type { ImageJobEvent, ImageJobRequest, ImageJobSummary } from '@shared/types';
import { ImageJobManager } from '@main/tools/image/ImageJobManager';
import { cleanupWorkspace, createTempWorkspace } from './testUtils';

describe('ImageJobManager', () => {
  let workspace: Awaited<ReturnType<typeof createTempWorkspace>>;

  beforeEach(async () => {
    workspace = await createTempWorkspace();
  });

  afterEach(async () => {
    await cleanupWorkspace(workspace.dir);
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

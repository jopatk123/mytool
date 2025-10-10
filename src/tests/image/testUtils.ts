import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import type { ImageAsset } from '@shared/types';

export const createImage = async (
  filePath: string,
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
): Promise<void> => {
  await sharp({ create: { width, height, channels: 3, background: color } })
    .jpeg()
    .toFile(filePath);
};

export const createAsset = async (filePath: string, root: string): Promise<ImageAsset> => {
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

export interface TempWorkspace {
  dir: string;
  assetsDir: string;
  outputDir: string;
  assets: ImageAsset[];
}

export const createTempWorkspace = async (): Promise<TempWorkspace> => {
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

export const cleanupWorkspace = async (dir: string): Promise<void> => {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore cleanup failure
  }
};

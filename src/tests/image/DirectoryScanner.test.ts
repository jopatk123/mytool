import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { DirectoryScanner } from '@main/tools/image/DirectoryScanner';

const createTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'image-scanner-'));
  return dir;
};

const removeDirRecursive = async (dir: string) => {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
};

describe('DirectoryScanner', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createTempDir();
    const subDir = path.join(rootDir, 'nested');
    await fs.mkdir(subDir, { recursive: true });

    // create images
    await sharp({ create: { width: 32, height: 32, channels: 3, background: { r: 255, g: 0, b: 0 } } })
      .png()
      .toFile(path.join(rootDir, 'a.png'));
    await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 255, b: 0 } } })
      .jpeg()
      .toFile(path.join(subDir, 'b.jpg'));

    // non-image file
    await fs.writeFile(path.join(rootDir, 'readme.txt'), 'hello world');
  });

  afterEach(async () => {
    await removeDirRecursive(rootDir);
  });

  it('scans images recursively and returns metadata', async () => {
    const scanner = new DirectoryScanner();
    const result = await scanner.scan(rootDir, { includeSubdirectories: true });

    expect(result.assets.length).toBe(2);
    const assetNames = result.assets.map(asset => asset.name).sort();
    expect(assetNames).toEqual(['a.png', 'b.jpg']);
    expect(result.totalFiles).toBeGreaterThanOrEqual(2);
    expect(result.assets[0].fileUrl.startsWith('file://')).toBe(true);
  });

  it('respects includeSubdirectories flag', async () => {
    const scanner = new DirectoryScanner();
    const result = await scanner.scan(rootDir, { includeSubdirectories: false });
    expect(result.assets.length).toBe(1);
    expect(result.assets[0].name).toBe('a.png');
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileScanner } from '@main/tools/file/FileScanner';

type TempEntry = { path: string; isSymlink?: boolean };

let createdEntries: TempEntry[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  createdEntries.push({ path: dir });
  return dir;
}

async function createFile(filePath: string, contents = 'sample'): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, 'utf-8');
  createdEntries.push({ path: filePath });
}

async function createSymlink(target: string, linkPath: string): Promise<void> {
  await fs.mkdir(path.dirname(linkPath), { recursive: true });
  const type: 'dir' | 'file' = path.extname(target) ? 'file' : 'dir';
  await fs.symlink(target, linkPath, type);
  createdEntries.push({ path: linkPath, isSymlink: true });
}

describe('FileScanner', () => {
  beforeEach(() => {
    createdEntries = [];
  });

  afterEach(async () => {
    for (const entry of [...createdEntries].reverse()) {
      try {
        if (entry.isSymlink) {
          await fs.unlink(entry.path);
        } else {
          await fs.rm(entry.path, { recursive: true, force: true });
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('skips hidden files when excludeHidden is true', async () => {
    const tempDir = await createTempDir('filescanner-hidden-');
    await createFile(path.join(tempDir, 'visible.txt'));
    await createFile(path.join(tempDir, '.hidden.txt'));

    const result = await FileScanner.scanDirectory(tempDir, {
      excludeHidden: true,
    });

    const fileNames = result.files.map((file) => file.name);
    expect(fileNames).toContain('visible.txt');
    expect(fileNames.some((name) => name.startsWith('.'))).toBe(false);
  });

  it('followSymlinks=false does not traverse symlinked directories', async () => {
    if (process.platform === 'win32') {
      expect(true).toBe(true);
      return;
    }

    const tempDir = await createTempDir('filescanner-symlink-');
    const targetDir = await createTempDir('filescanner-target-');
    const targetFile = path.join(targetDir, 'nested.txt');
    await createFile(targetFile);

    const symlinkPath = path.join(tempDir, 'linked');
    await createSymlink(targetDir, symlinkPath);

    const result = await FileScanner.scanDirectory(tempDir, {
      includeSubdirectories: true,
      followSymlinks: false,
      excludeHidden: false,
    });

    expect(result.files).toHaveLength(0);
  });

  it('includes symlinked files when followSymlinks is true', async () => {
    if (process.platform === 'win32') {
      expect(true).toBe(true);
      return;
    }

    const tempDir = await createTempDir('filescanner-symlink-');
    const targetDir = await createTempDir('filescanner-target-');
    const targetFile = path.join(targetDir, 'nested.txt');
    await createFile(targetFile, 'data');

    const symlinkPath = path.join(tempDir, 'linked');
    await createSymlink(targetDir, symlinkPath);

    const result = await FileScanner.scanDirectory(tempDir, {
      includeSubdirectories: true,
      followSymlinks: true,
    });

    const relativePaths = result.files.map((file) => file.relativePath);
    expect(relativePaths).toContain(path.join('linked', 'nested.txt'));
    // 验证不会重复扫描真实目录
    expect(relativePaths).not.toContain(path.join(path.basename(targetDir), 'nested.txt'));
  });

  it('honours maxConcurrency by operating correctly when limited to a single worker', async () => {
    const tempDir = await createTempDir('filescanner-concurrency-');
    const fileCount = 5;
    for (let i = 0; i < fileCount; i += 1) {
      await createFile(path.join(tempDir, `file-${i}.txt`), `content-${i}`);
    }

    const result = await FileScanner.scanDirectory(tempDir, {
      maxConcurrency: 1,
    });

    expect(result.files).toHaveLength(fileCount);
  });
});

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import type { ImageAsset } from '@shared/types';
import type { JobOptions } from '../job/JobOptions';

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

const buildOutputPath = (asset: ImageAsset, options: JobOptions, extension: string): string => {
  const resolvedOutputDir = options.outputDirectory ? path.resolve(options.outputDirectory) : null;
  const baseDir = resolvedOutputDir ?? path.dirname(asset.filePath);
  const relativeDir = resolvedOutputDir ? path.dirname(asset.relativePath) : '';
  const directory = resolvedOutputDir ? path.join(baseDir, relativeDir) : baseDir;
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

export {
  buildOutputPath,
  createTempFilePath,
  ensureDirectory,
  generateUniquePath,
  moveFileSafe,
};

import { promises as fs, Dirent, Stats } from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createLogger } from '../../../shared/utils/logger';
import type { ImageAsset, ImageScanOptions, ImageScanResult } from '../../../shared/types';

const logger = createLogger('DirectoryScanner');

const DEFAULT_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff']);

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
};

const MAX_SCAN_DEPTH = 32;
const MAX_TOTAL_FILES = 20_000;

const isImageFile = (entry: Dirent, extensionSet: Set<string>): boolean => {
  if (!entry.isFile()) {
    return false;
  }

  const ext = path.extname(entry.name).toLowerCase();
  return extensionSet.has(ext);
};

const sanitizeExtensions = (extensions?: string[]): Set<string> => {
  if (!extensions || extensions.length === 0) {
    return new Set(DEFAULT_EXTENSIONS);
  }

  return new Set(
    extensions
      .map(ext => ext.trim().toLowerCase())
      .map(ext => (ext.startsWith('.') ? ext : `.${ext}`))
  );
};

const buildAssetId = (filePath: string): string => {
  return randomUUID({ disableEntropyCache: true }) + ':' + Buffer.from(filePath).toString('base64url');
};

export class DirectoryScanner {
  async scan(directory: string, options: ImageScanOptions = {}): Promise<ImageScanResult> {
    const stats = await fs.stat(directory);
    if (!stats.isDirectory()) {
      throw new Error(`指定路径不是文件夹: ${directory}`);
    }

    const includeSubdirectories = options.includeSubdirectories ?? true;
    const extensionSet = sanitizeExtensions(options.supportedExtensions);
    const limit = options.limit ?? MAX_TOTAL_FILES;

    const assets: ImageAsset[] = [];
    let totalFiles = 0;

    const stack: Array<{ dir: string; depth: number }> = [{ dir: directory, depth: 0 }];

    while (stack.length > 0) {
      const { dir: currentDir, depth } = stack.pop()!;

      if (depth > MAX_SCAN_DEPTH) {
        logger.warn('Reach max scan depth, skip nested directory', { directory: currentDir });
        continue;
      }

      let entries: Dirent[] = [];
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch (error) {
        logger.warn('Failed to read directory entry', { currentDir, error });
        continue;
      }

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (includeSubdirectories) {
            stack.push({ dir: path.join(currentDir, entry.name), depth: depth + 1 });
          }
          continue;
        }

        totalFiles += 1;
        if (!isImageFile(entry, extensionSet)) {
          continue;
        }

        const filePath = path.join(currentDir, entry.name);
  let stat: Stats;
        try {
          stat = await fs.stat(filePath);
        } catch (error) {
          logger.warn('Failed to stat image file', { filePath, error });
          continue;
        }

        const extension = path.extname(entry.name).toLowerCase();
        const relativePath = path.relative(directory, filePath);
        // 使用自定义协议 local-file:// 替代 file:// 以便在 Electron 渲染进程中安全加载
        const fileUrl = `local-file://${filePath}`;
        const asset: ImageAsset = {
          id: buildAssetId(filePath),
          name: entry.name,
          filePath,
          fileUrl,
          size: stat.size,
          mimeType: MIME_BY_EXTENSION[extension] ?? 'image/*',
          extension: extension.slice(1),
          modifiedAt: stat.mtimeMs,
          createdAt: stat.birthtimeMs,
          relativePath,
        };

        assets.push(asset);

        if (assets.length >= limit) {
          logger.info('Reached scan limit, stop scanning', { limit });
          break;
        }
      }

      if (assets.length >= limit) {
        break;
      }
    }

    return {
      scanId: randomUUID(),
      directory,
      assets,
      totalFiles,
      scannedFiles: assets.length,
    };
  }
}

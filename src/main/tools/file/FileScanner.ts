import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { FileInfo, FileScanOptions, FileScanResult } from '../../../shared/types';
import { createLogger } from '../../../shared/utils/logger';
import { FileFilter } from './FileFilter';

const DEFAULT_MAX_CONCURRENCY = 32;
const MAX_CONCURRENCY_CAP = 256;

interface ScanSettings {
  includeSubdirectories: boolean;
  maxConcurrency: number;
  followSymlinks: boolean;
  excludeHidden: boolean;
}

const logger = createLogger('FileScanner');

/**
 * 文件扫描器服务
 * 负责扫描目录并收集文件信息，支持高性能并发扫描
 */
export class FileScanner {
  /**
   * 扫描目录获取文件列表
   */
  static async scanDirectory(
    directory: string,
    options?: FileScanOptions,
  ): Promise<FileScanResult> {
    const scanId = randomUUID();
    const startTime = Date.now();

    const settings: ScanSettings = {
      includeSubdirectories: options?.includeSubdirectories ?? false,
      maxConcurrency: Math.max(
        1,
        Math.min(options?.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY, MAX_CONCURRENCY_CAP),
      ),
      followSymlinks: options?.followSymlinks ?? false,
      excludeHidden: options?.excludeHidden ?? false,
    };

    logger.info(`Starting scan of directory: ${directory}`, { scanId, settings });

    try {
      // 验证目录是否存在
      const stats = await fs.stat(directory);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${directory}`);
      }

      // 扫描文件
      const visited = new Set<string>();
      const files = await this.scanDirectoryRecursive(directory, directory, settings, visited);

      // 应用过滤
      const filteredFiles = options?.filter
        ? FileFilter.applyFilters(files, options.filter)
        : files;

      const duration = Date.now() - startTime;
      logger.info(`Scan completed in ${duration}ms`, {
        scanId,
        totalFiles: files.length,
        filteredFiles: filteredFiles.length,
      });

      return {
        scanId,
        directory,
        files: filteredFiles,
        totalFiles: files.length,
        filteredFiles: filteredFiles.length,
      };
    } catch (error) {
      logger.error('Scan failed', { scanId, directory, error });
      throw error;
    }
  }

  /**
   * 递归扫描目录（内部方法）
   */
  private static async scanDirectoryRecursive(
    rootDir: string,
    currentDir: string,
    settings: ScanSettings,
    visited: Set<string>,
  ): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    try {
      const realPath = await fs.realpath(currentDir).catch(() => currentDir);

      if (visited.has(realPath)) {
        logger.warn('Detected circular directory reference, skipping', {
          currentDir,
          realPath,
        });
        return files;
      }
      visited.add(realPath);

      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      const filePaths: string[] = [];
      const directories: string[] = [];
      const symlinkPaths: string[] = [];

      for (const entry of entries) {
        if (settings.excludeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isSymbolicLink()) {
          if (settings.followSymlinks) {
            symlinkPaths.push(fullPath);
          } else {
            logger.debug('Skipping symbolic link during scan', { fullPath });
          }
          continue;
        }

        if (entry.isFile()) {
          filePaths.push(fullPath);
          continue;
        }

        if (entry.isDirectory() && settings.includeSubdirectories) {
          directories.push(fullPath);
        }
      }

      if (settings.followSymlinks && symlinkPaths.length) {
        const resolved = await this.resolveSymlinks(symlinkPaths, settings);
        filePaths.push(...resolved.files);
        directories.push(...resolved.directories);
      }

      const fileInfos = await this.createFileInfosConcurrently(
        rootDir,
        filePaths,
        settings.maxConcurrency,
      );
      files.push(...fileInfos);

      for (const subDir of directories) {
        try {
          const subFiles = await this.scanDirectoryRecursive(rootDir, subDir, settings, visited);
          files.push(...subFiles);
        } catch (error) {
          logger.warn(`Failed to process sub-directory: ${subDir}`, { error });
        }
      }
    } catch (error) {
      logger.error(`Failed to read directory: ${currentDir}`, { error });
      throw error;
    }

    return files;
  }

  private static async createFileInfosConcurrently(
    rootDir: string,
    filePaths: string[],
    maxConcurrency: number,
  ): Promise<FileInfo[]> {
    if (filePaths.length === 0) {
      return [];
    }

    const queue = [...filePaths];
    const results: FileInfo[] = [];
    const workerCount = Math.min(maxConcurrency, queue.length);

    const worker = async () => {
      while (queue.length) {
        const filePath = queue.pop();
        if (!filePath) {
          return;
        }

        try {
          const fileInfo = await this.createFileInfo(rootDir, filePath);
          results.push(fileInfo);
        } catch (error) {
          logger.warn(`Failed to create file info: ${filePath}`, { error });
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, worker));
    return results;
  }

  private static async resolveSymlinks(
    symlinkPaths: string[],
    settings: ScanSettings,
  ): Promise<{ files: string[]; directories: string[] }> {
    const files: string[] = [];
    const directories: string[] = [];

    const queue = [...symlinkPaths];
    const workerCount = Math.min(settings.maxConcurrency, queue.length);

    const worker = async () => {
      while (queue.length) {
        const symlinkPath = queue.pop();
        if (!symlinkPath) {
          return;
        }

        try {
          const stats = await fs.stat(symlinkPath);
          if (stats.isDirectory() && settings.includeSubdirectories) {
            directories.push(symlinkPath);
          } else if (stats.isFile()) {
            files.push(symlinkPath);
          }
        } catch (error) {
          logger.warn('Failed to resolve symlink target', { symlinkPath, error });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.max(1, workerCount) }, worker));

    return { files, directories };
  }

  /**
   * 创建文件信息对象
   */
  private static async createFileInfo(rootDir: string, filePath: string): Promise<FileInfo> {
    const stats = await fs.stat(filePath);
    const name = path.basename(filePath);
    const extension = path.extname(filePath);
    const relativePath = path.relative(rootDir, filePath);
    const directory = path.dirname(filePath);

    return {
      id: randomUUID(),
      name,
      path: filePath,
      relativePath,
      size: stats.size,
      extension,
      lastModified: stats.mtimeMs,
      directory,
    };
  }

  /**
   * 批量获取文件信息（用于已知路径列表）
   */
  static async getFileInfoBatch(filePaths: string[]): Promise<FileInfo[]> {
    const results = await Promise.allSettled(
      filePaths.map(async (filePath) => {
        const stats = await fs.stat(filePath);
        const name = path.basename(filePath);
        const extension = path.extname(filePath);
        const directory = path.dirname(filePath);

        const fileInfo: FileInfo = {
          id: randomUUID(),
          name,
          path: filePath,
          relativePath: name,
          size: stats.size,
          extension,
          lastModified: stats.mtimeMs,
          directory,
        };
        return fileInfo;
      }),
    );

    // 过滤成功的结果
    const fileInfos: FileInfo[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        fileInfos.push(result.value);
      }
    }
    return fileInfos;
  }

  /**
   * 验证路径是否为目录
   */
  static async isDirectory(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 验证路径是否存在
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

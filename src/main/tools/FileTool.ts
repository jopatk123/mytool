import { promises as fs } from 'fs';
import * as path from 'path';
import { AppError, AppErrorCode } from '../../shared/errors.js';
import { FileInfo, ITool, ToolCategory, ToolConfig } from '../../shared/types.js';
import { createLogger } from '../../shared/utils/logger.js';

const logger = createLogger('FileTool');

interface BatchRenameParams {
  files: string[];
  pattern: string;
  startIndex?: number;
  digits?: number;
  dryRun?: boolean;
  overwrite?: boolean;
}

interface RenameOperation {
  from: string;
  to: string;
}

/**
 * 文件处理工具
 */
export class FileTool implements ITool {
  readonly config: ToolConfig = {
    id: 'file-tool',
    name: '文件工具',
    description: '文件批量重命名、文件信息查看、文件搜索等功能',
    icon: '📁',
    category: ToolCategory.FILE,
    enabled: true,
  };

  async initialize(): Promise<void> {
    logger.info('Initializing FileTool...');
    // 初始化逻辑
    logger.success('FileTool initialized');
  }

  cleanup(): void {
    logger.info('Cleaning up FileTool...');
    // 清理逻辑
  }

  async execute(action: string, params: unknown): Promise<unknown> {
    switch (action) {
      case 'batchRename':
        return this.batchRename(this.parseBatchRename(params));
      case 'getFileInfo':
      case 'info':
        return this.getFileInfo(this.parseGetFileInfo(params));
      default:
        throw new AppError(AppErrorCode.INVALID_ARGUMENT, `Unsupported file tool action: ${action}`, {
          context: { action },
        });
    }
  }

  private parseBatchRename(input: unknown): BatchRenameParams {
    if (!input || typeof input !== 'object') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, 'Batch rename parameters must be an object');
    }

    const { files, pattern, startIndex, digits, dryRun, overwrite } = input as Partial<BatchRenameParams>;

    if (!Array.isArray(files) || files.length === 0 || !files.every(file => typeof file === 'string')) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, 'files must be a non-empty array of file paths');
    }

    if (!pattern || typeof pattern !== 'string') {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, 'pattern must be a non-empty string');
    }

    return {
      files,
      pattern,
      startIndex: typeof startIndex === 'number' ? Math.floor(startIndex) : 1,
      digits: typeof digits === 'number' ? Math.max(Math.floor(digits), 1) : 2,
      dryRun: Boolean(dryRun),
      overwrite: Boolean(overwrite),
    };
  }

  private parseGetFileInfo(input: unknown): string {
    if (typeof input === 'string' && input) {
      return input;
    }

    if (input && typeof input === 'object' && typeof (input as { path?: unknown }).path === 'string') {
      return (input as { path: string }).path;
    }

    throw new AppError(AppErrorCode.INVALID_ARGUMENT, 'filePath is required');
  }

  /**
   * 批量重命名文件
   */
  private async batchRename(params: BatchRenameParams): Promise<{
    success: true;
    renamedCount: number;
    operations: RenameOperation[];
    dryRun: boolean;
  }> {
    const { files, pattern, startIndex = 1, digits = 2, dryRun = false, overwrite = false } = params;

    logger.info('Batch renaming files', { fileCount: files.length, pattern, startIndex, digits, dryRun, overwrite });

    const operations: RenameOperation[] = [];
    const unchanged: RenameOperation[] = [];
    const seenTargets = new Set<string>();

    for (let index = 0; index < files.length; index += 1) {
      const filePath = files[index];

      const fileStat = await fs.stat(filePath).catch(error => {
        throw new AppError(AppErrorCode.NOT_FOUND, `File not found: ${filePath}`, {
          cause: error,
          recoverable: false,
        });
      });

      if (!fileStat.isFile()) {
        throw new AppError(AppErrorCode.INVALID_ARGUMENT, `Path is not a file: ${filePath}`, {
          recoverable: false,
        });
      }

      const parsed = path.parse(filePath);
      const sequence = String(startIndex + index).padStart(digits, '0');
      const extWithoutDot = parsed.ext.replace('.', '');

      let newName = pattern
        .replace(/{name}/gi, parsed.name)
        .replace(/{ext}/gi, extWithoutDot)
        .replace(/{n}/gi, sequence);

      if (!newName.trim()) {
        throw new AppError(AppErrorCode.INVALID_ARGUMENT, 'Generated file name is empty; check pattern');
      }

      if (!path.extname(newName) && parsed.ext) {
        newName = `${newName}${parsed.ext}`;
      }

      const targetPath = path.isAbsolute(newName) ? newName : path.join(parsed.dir, newName);

      if (seenTargets.has(targetPath)) {
        throw new AppError(AppErrorCode.INVALID_ARGUMENT, `Duplicate target path detected: ${targetPath}`);
      }
      seenTargets.add(targetPath);

      if (targetPath === filePath) {
        unchanged.push({ from: filePath, to: targetPath });
        continue;
      }

      if (!dryRun && !overwrite) {
        try {
          await fs.access(targetPath);
          throw new AppError(AppErrorCode.FILE_SYSTEM, `File already exists: ${targetPath}`, {
            recoverable: false,
          });
        } catch (error) {
          if (error instanceof AppError) {
            throw error;
          }

          const nodeError = error as NodeJS.ErrnoException;
          if (nodeError?.code && nodeError.code !== 'ENOENT') {
            throw new AppError(AppErrorCode.FILE_SYSTEM, `Unable to access target path: ${targetPath}`, {
              cause: error,
              recoverable: false,
            });
          }
        }
      }

      operations.push({ from: filePath, to: targetPath });
    }

    if (!dryRun) {
      for (const operation of operations) {
        try {
          await fs.mkdir(path.dirname(operation.to), { recursive: true });
          await fs.rename(operation.from, operation.to);
        } catch (error) {
          throw new AppError(AppErrorCode.FILE_SYSTEM, `Failed to rename ${operation.from}`, {
            cause: error,
            context: { target: operation.to },
            recoverable: false,
          });
        }
      }
    }

    logger.success('Batch rename completed', {
      renamed: operations.length,
      unchanged: unchanged.length,
      dryRun,
    });

    return {
      success: true,
      renamedCount: operations.length,
      operations,
      dryRun,
    };
  }

  /**
   * 获取文件信息
   */
  private async getFileInfo(filePath: string): Promise<{ success: true; info: FileInfo }> {
    logger.info('Getting file info', { filePath });

    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch (error) {
      throw new AppError(AppErrorCode.NOT_FOUND, `File not found: ${filePath}`, {
        cause: error,
        recoverable: false,
      });
    }

    const parsed = path.parse(filePath);
    const info: FileInfo = {
      name: parsed.base,
      path: path.resolve(filePath),
      size: stats.size,
      type: stats.isDirectory() ? 'directory' : parsed.ext.replace('.', ''),
      lastModified: stats.mtimeMs,
    };

    return {
      success: true,
      info,
    };
  }
}

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../shared/utils/logger';
import type { FileRenameTask, FileRenameResult, FileDeleteResult } from '../../../shared/types';

const logger = createLogger('FileRenamer');

/**
 * 文件重命名器服务
 * 负责批量重命名和删除文件
 */
export class FileRenamer {
  /**
   * 批量重命名文件
   */
  static async renameFiles(tasks: FileRenameTask[]): Promise<FileRenameResult[]> {
    logger.info(`Starting batch rename for ${tasks.length} files`);

    const results: FileRenameResult[] = [];

    for (const task of tasks) {
      try {
        const result = await this.renameFile(task);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to rename file: ${task.originalPath}`, { error });
        results.push({
          id: task.id,
          success: false,
          originalPath: task.originalPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info(`Batch rename completed: ${successCount}/${tasks.length} successful`);

    return results;
  }

  /**
   * 重命名单个文件
   */
  private static async renameFile(task: FileRenameTask): Promise<FileRenameResult> {
    // 验证原文件是否存在
    const exists = await this.fileExists(task.originalPath);
    if (!exists) {
      return {
        id: task.id,
        success: false,
        originalPath: task.originalPath,
        error: '原文件不存在',
      };
    }

    // 构建新路径
    const directory = path.dirname(task.originalPath);
    const newPath = path.join(directory, task.newName);

    // 检查新路径是否已存在
    const newExists = await this.fileExists(newPath);
    if (newExists && newPath !== task.originalPath) {
      return {
        id: task.id,
        success: false,
        originalPath: task.originalPath,
        error: '目标文件名已存在',
      };
    }

    // 执行重命名
    try {
      await fs.rename(task.originalPath, newPath);
      logger.debug(`Renamed: ${task.originalName} -> ${task.newName}`);

      return {
        id: task.id,
        success: true,
        originalPath: task.originalPath,
        newPath,
      };
    } catch (error) {
      throw new Error(`重命名失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 批量删除文件
   */
  static async deleteFiles(filePaths: string[]): Promise<FileDeleteResult[]> {
    logger.info(`Starting batch delete for ${filePaths.length} files`);

    const results: FileDeleteResult[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.deleteFile(filePath);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to delete file: ${filePath}`, { error });
        results.push({
          id: filePath,
          success: false,
          path: filePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info(`Batch delete completed: ${successCount}/${filePaths.length} successful`);

    return results;
  }

  /**
   * 删除单个文件
   */
  private static async deleteFile(filePath: string): Promise<FileDeleteResult> {
    // 验证文件是否存在
    const exists = await this.fileExists(filePath);
    if (!exists) {
      return {
        id: filePath,
        success: false,
        path: filePath,
        error: '文件不存在',
      };
    }

    // 执行删除
    try {
      await fs.unlink(filePath);
      logger.debug(`Deleted: ${filePath}`);

      return {
        id: filePath,
        success: true,
        path: filePath,
      };
    } catch (error) {
      throw new Error(`删除失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查文件是否存在
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证文件路径安全性
   */
  static validatePath(filePath: string): { valid: boolean; error?: string } {
    // 检查路径是否为绝对路径
    if (!path.isAbsolute(filePath)) {
      return {
        valid: false,
        error: '必须使用绝对路径',
      };
    }

    // 检查路径是否包含危险字符
    const dangerousPatterns = [
      /\.\./,  // 父目录引用
      /[<>"|?*]/,  // Windows 非法字符
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(filePath)) {
        return {
          valid: false,
          error: '路径包含非法字符',
        };
      }
    }

    return { valid: true };
  }

  /**
   * 获取文件信息
   */
  static async getFileStats(filePath: string) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      logger.error(`Failed to get file stats: ${filePath}`, { error });
      return null;
    }
  }
}

import path from 'path';
import type { FileInfo, FileFilterOptions } from '../../../shared/types';
import { createLogger } from '../../../shared/utils/logger';

const logger = createLogger('FileFilter');

/**
 * 文件过滤器服务
 * 负责根据各种条件过滤文件
 */
export class FileFilter {
  /**
   * 应用所有过滤条件
   */
  static applyFilters(files: FileInfo[], options?: FileFilterOptions): FileInfo[] {
    if (!options) {
      return files;
    }

    let filtered = files;

    // 应用大小过滤
    if (options.enableSizeFilter) {
      filtered = this.filterBySize(filtered, options.minSize, options.maxSize);
    }

    // 应用后缀过滤（支持反向过滤：excludeExtensions）
    if (options.enableExtensionFilter && options.extensions?.length) {
      filtered = this.filterByExtension(filtered, options.extensions, options.excludeExtensions);
    }

    // 应用文件名关键字过滤
    if (options.enableNameFilter && options.nameKeyword) {
      filtered = this.filterByName(filtered, options.nameKeyword);
    }

    logger.debug(`Filtered ${files.length} files to ${filtered.length} files`, {
      original: files.length,
      filtered: filtered.length,
      options,
    });

    return filtered;
  }

  /**
   * 按文件大小过滤
   */
  private static filterBySize(files: FileInfo[], minSize?: number, maxSize?: number): FileInfo[] {
    return files.filter((file) => {
      if (minSize !== undefined && file.size < minSize) {
        return false;
      }
      if (maxSize !== undefined && file.size > maxSize) {
        return false;
      }
      return true;
    });
  }

  /**
   * 按文件扩展名过滤
   */
  private static filterByExtension(
    files: FileInfo[],
    extensions: string[],
    exclude?: boolean,
  ): FileInfo[] {
    const normalizedExtensions = extensions.map((ext) =>
      ext.toLowerCase().startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`,
    );

    return files.filter((file) => {
      const fileExt = file.extension.toLowerCase();
      const matched = normalizedExtensions.includes(fileExt);
      // 如果 exclude 为 true，则排除列表中的扩展名；否则仅包含列表中的扩展名
      return exclude ? !matched : matched;
    });
  }

  /**
   * 按文件名关键字过滤
   */
  private static filterByName(files: FileInfo[], keyword: string): FileInfo[] {
    const lowerKeyword = keyword.toLowerCase();
    return files.filter((file) => {
      const fileName = file.name.toLowerCase();
      return fileName.includes(lowerKeyword);
    });
  }

  /**
   * 验证文件是否满足过滤条件
   */
  static matchesFilter(file: FileInfo, options?: FileFilterOptions): boolean {
    if (!options) {
      return true;
    }

    // 检查大小
    if (options.enableSizeFilter) {
      if (options.minSize !== undefined && file.size < options.minSize) {
        return false;
      }
      if (options.maxSize !== undefined && file.size > options.maxSize) {
        return false;
      }
    }

    // 检查扩展名（支持反向过滤）
    if (options.enableExtensionFilter && options.extensions?.length) {
      const normalizedExtensions = options.extensions.map((ext) =>
        ext.toLowerCase().startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`,
      );
      const fileExt = file.extension.toLowerCase();
      const matched = normalizedExtensions.includes(fileExt);
      if (options.excludeExtensions) {
        // 如果匹配到要排除的扩展名，则不通过
        if (matched) return false;
      } else {
        if (!matched) return false;
      }
    }

    // 检查文件名关键字
    if (options.enableNameFilter && options.nameKeyword) {
      const fileName = file.name.toLowerCase();
      const lowerKeyword = options.nameKeyword.toLowerCase();
      if (!fileName.includes(lowerKeyword)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取文件扩展名（包含点号）
   */
  static getExtension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * 格式化文件大小为人类可读格式
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
  }
}

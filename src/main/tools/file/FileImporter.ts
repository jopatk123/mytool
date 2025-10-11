import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { createLogger } from '../../../shared/utils/logger';
import type { FileImportResult, FileRenameTask } from '../../../shared/types';

const logger = createLogger('FileImporter');

/**
 * 文件导入器服务
 * 负责从CSV导入重命名任务
 */
export class FileImporter {
  /**
   * 从CSV导入重命名任务
   */
  static async importFromCSV(filePath: string): Promise<FileImportResult> {
    logger.info(`Importing rename tasks from CSV: ${filePath}`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const result = this.parseCSV(content);

      logger.info(`Imported ${result.tasks.length} tasks, ${result.invalidRows} invalid rows`);
      return result;
    } catch (error) {
      logger.error('Failed to import CSV', { error, filePath });
      throw error;
    }
  }

  /**
   * 解析CSV内容
   */
  private static parseCSV(content: string): FileImportResult {
    const tasks: FileRenameTask[] = [];
    let invalidRows = 0;

    // 移除 BOM（如果存在）
    const cleanContent = content.replace(/^\uFEFF/, '');

    // 按行分割
    const lines = cleanContent.split(/\r?\n/);

    // 跳过表头（第一行）
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // 跳过空行
      if (!line) continue;

      try {
        const fields = this.parseCSVLine(line);

        // CSV格式：完整路径, 文件名称, 重命名后名称, 文件大小, 扩展名, 最后修改时间
        if (fields.length < 3) {
          invalidRows++;
          continue;
        }

        const originalPath = fields[0];
        const originalName = fields[1];
        const newName = fields[2]?.trim();

        // 如果重命名后名称为空，跳过
        if (!newName) {
          continue;
        }

        // 验证路径和文件名
        if (!originalPath || !originalName) {
          invalidRows++;
          continue;
        }

        tasks.push({
          id: randomUUID(),
          originalPath,
          originalName,
          newName,
        });
      } catch (error) {
        logger.warn(`Failed to parse line ${i + 1}`, { error, line });
        invalidRows++;
      }
    }

    return { tasks, invalidRows };
  }

  /**
   * 解析CSV行（处理引号包裹的字段）
   */
  private static parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // 转义的引号
          currentField += '"';
          i++; // 跳过下一个引号
        } else {
          // 切换引号状态
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // 字段分隔符
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // 添加最后一个字段
    fields.push(currentField);

    return fields;
  }

  /**
   * 验证CSV文件格式
   */
  static async validateCSVFormat(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const cleanContent = content.replace(/^\uFEFF/, '');
      const lines = cleanContent.split(/\r?\n/);

      // 至少要有表头
      if (lines.length < 1) {
        return false;
      }

      // 验证表头
      const headers = this.parseCSVLine(lines[0]);
      return headers.length >= 3;
    } catch {
      return false;
    }
  }

  /**
   * 验证重命名任务
   */
  static validateRenameTask(task: FileRenameTask): { valid: boolean; error?: string } {
    // 检查新文件名是否包含非法字符
    const illegalChars = /[<>:"/\\|?*]/;
    if (illegalChars.test(task.newName)) {
      return {
        valid: false,
        error: '文件名包含非法字符: < > : " / \\ | ? *',
      };
    }

    // 检查新文件名是否为空
    if (!task.newName.trim()) {
      return {
        valid: false,
        error: '文件名不能为空',
      };
    }

    // 检查文件扩展名是否保持一致（可选，根据需求调整）
    const originalExt = path.extname(task.originalName);
    const newExt = path.extname(task.newName);

    if (originalExt && !newExt) {
      logger.warn('New name missing extension', { task });
    }

    return { valid: true };
  }
}

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../shared/utils/logger';
import type { FileInfo, FileExportRequest } from '../../../shared/types';

const logger = createLogger('FileExporter');

/**
 * 文件导出器服务
 * 负责将文件列表导出为CSV格式
 */
export class FileExporter {
  /**
   * CSV 列头
   */
  private static readonly CSV_HEADERS = [
    '完整路径',
    '文件名称',
    '重命名后名称',
    '文件大小(字节)',
    '扩展名',
    '最后修改时间',
  ];

  /**
   * 导出文件列表为CSV
   */
  static async exportToCSV(request: FileExportRequest): Promise<void> {
    logger.info(`Exporting ${request.files.length} files to CSV: ${request.outputPath}`);

    try {
      const csvContent = this.generateCSV(request.files);
      await fs.writeFile(request.outputPath, csvContent, 'utf-8');

      logger.info(`Successfully exported to ${request.outputPath}`);
    } catch (error) {
      logger.error('Failed to export CSV', { error, outputPath: request.outputPath });
      throw error;
    }
  }

  /**
   * 生成CSV内容
   */
  private static generateCSV(files: FileInfo[]): string {
    const lines: string[] = [];

    // 添加 BOM 以支持 Excel 正确识别 UTF-8
    const BOM = '\uFEFF';

    // 添加表头
    lines.push(this.CSV_HEADERS.join(','));

    // 添加数据行
    for (const file of files) {
      const row = [
        this.escapeCSVField(file.path),
        this.escapeCSVField(file.name),
        '', // 重命名后名称列留空，由用户填写
        file.size.toString(),
        this.escapeCSVField(file.extension),
        new Date(file.lastModified).toISOString(),
      ];
      lines.push(row.join(','));
    }

    return BOM + lines.join('\n');
  }

  /**
   * 转义CSV字段（处理逗号、引号、换行符）
   */
  private static escapeCSVField(field: string): string {
    // 如果字段包含逗号、引号或换行符，需要用引号包裹
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      // 将字段中的引号转义为两个引号
      const escaped = field.replace(/"/g, '""');
      return `"${escaped}"`;
    }
    return field;
  }

  /**
   * 验证输出路径
   */
  static async validateOutputPath(outputPath: string): Promise<boolean> {
    try {
      // 检查父目录是否存在
      const dirPath = path.dirname(outputPath);
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 生成默认文件名
   */
  static generateDefaultFileName(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `file-list-${timestamp}.csv`;
  }
}

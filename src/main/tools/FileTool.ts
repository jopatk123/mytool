import { AppError, AppErrorCode } from '../../shared/errors';
import {
  ITool,
  ToolCategory,
  ToolConfig,
  FileScanRequest,
  FileScanResult,
  FileExportRequest,
  FileImportResult,
  FileRenameTask,
  FileRenameResult,
  FileDeleteResult,
} from '../../shared/types';
import { createLogger } from '../../shared/utils/logger';
import { FileScanner } from './file/FileScanner';
import { FileExporter } from './file/FileExporter';
import { FileImporter } from './file/FileImporter';
import { FileRenamer } from './file/FileRenamer';

const logger = createLogger('FileTool');

/**
 * 文件工具
 * 提供文件扫描、过滤、导出、导入和批量操作功能
 */
export class FileTool implements ITool {
  readonly config: ToolConfig = {
    id: 'file-tool',
    name: '文件工具',
    description: '文件扫描、过滤、批量重命名和管理工具',
    icon: '📁',
    category: ToolCategory.FILE,
    enabled: true,
  };

  async initialize(): Promise<void> {
    logger.info('FileTool initialized');
  }

  cleanup(): void {
    logger.info('FileTool cleanup');
  }

  async execute(action: string, params: unknown): Promise<unknown> {
    logger.debug('Executing FileTool action', { action, params });

    // 如果 params 是一个包含 action 的对象，提取实际的 action
    let actualAction = action;
    let actualParams = params;
    
    if (params && typeof params === 'object' && 'action' in params) {
      actualAction = (params as { action: string }).action;
      actualParams = params;
    }

    switch (actualAction) {
      case 'scanFiles':
        return this.scanFiles(actualParams as FileScanRequest);
      case 'exportToCSV':
        return this.exportToCSV(actualParams as FileExportRequest);
      case 'importFromCSV':
        return this.importFromCSV((actualParams as { filePath: string }).filePath);
      case 'renameFiles':
        return this.renameFiles((actualParams as { tasks: FileRenameTask[] }).tasks);
      case 'deleteFiles':
        return this.deleteFiles((actualParams as { filePaths: string[] }).filePaths);
      default:
        throw new AppError(
          AppErrorCode.INVALID_ARGUMENT,
          `Unknown action: ${actualAction}`
        );
    }
  }

  /**
   * 扫描文件目录
   */
  private async scanFiles(request: FileScanRequest): Promise<FileScanResult> {
    try {
      logger.info('Scanning directory', { directory: request.directory });
      return await FileScanner.scanDirectory(request.directory, request.options);
    } catch (error) {
      logger.error('Failed to scan directory', { error, request });
      throw new AppError(
        AppErrorCode.EXECUTION_FAILED,
        `扫描目录失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 导出文件列表为CSV
   */
  private async exportToCSV(request: FileExportRequest): Promise<void> {
    try {
      logger.info('Exporting files to CSV', { outputPath: request.outputPath });
      await FileExporter.exportToCSV(request);
    } catch (error) {
      logger.error('Failed to export CSV', { error, request });
      throw new AppError(
        AppErrorCode.EXECUTION_FAILED,
        `导出CSV失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 从CSV导入重命名任务
   */
  private async importFromCSV(filePath: string): Promise<FileImportResult> {
    try {
      logger.info('Importing from CSV', { filePath });
      return await FileImporter.importFromCSV(filePath);
    } catch (error) {
      logger.error('Failed to import CSV', { error, filePath });
      throw new AppError(
        AppErrorCode.EXECUTION_FAILED,
        `导入CSV失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 批量重命名文件
   */
  private async renameFiles(tasks: FileRenameTask[]): Promise<FileRenameResult[]> {
    try {
      logger.info('Renaming files', { count: tasks.length });
      return await FileRenamer.renameFiles(tasks);
    } catch (error) {
      logger.error('Failed to rename files', { error });
      throw new AppError(
        AppErrorCode.EXECUTION_FAILED,
        `重命名失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 批量删除文件
   */
  private async deleteFiles(filePaths: string[]): Promise<FileDeleteResult[]> {
    try {
      logger.info('Deleting files', { count: filePaths.length });
      return await FileRenamer.deleteFiles(filePaths);
    } catch (error) {
      logger.error('Failed to delete files', { error });
      throw new AppError(
        AppErrorCode.EXECUTION_FAILED,
        `删除失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}


import { AppError, AppErrorCode } from '../../shared/errors.js';
import { ITool, ToolCategory, ToolConfig } from '../../shared/types.js';
import { createLogger } from '../../shared/utils/logger.js';

const logger = createLogger('FileTool');

/**
 * 文件工具（占位）
 * - 保留 ToolConfig / 接口
 * - initialize / cleanup 为轻量记录
 * - execute 抛出 NOT_READY，表明功能尚未实现
 */
export class FileTool implements ITool {
  readonly config: ToolConfig = {
    id: 'file-tool',
    name: '文件工具 (占位)',
    description: '占位实现 — 功能尚未实现',
    icon: '📁',
    category: ToolCategory.FILE,
    enabled: true,
  };

  async initialize(): Promise<void> {
    logger.info('FileTool (placeholder) initialized');
  }

  cleanup(): void {
    logger.info('FileTool (placeholder) cleanup');
  }

  async execute(action: string, _params: unknown): Promise<unknown> {
    logger.warn('Attempted to execute FileTool while it is a placeholder', { action });
    throw new AppError(AppErrorCode.NOT_READY, `FileTool is a placeholder and does not implement action: ${action}`);
  }
}

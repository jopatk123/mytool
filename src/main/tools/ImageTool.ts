import { AppError, AppErrorCode } from '../../shared/errors.js';
import { ITool, ToolCategory, ToolConfig } from '../../shared/types.js';
import { createLogger } from '../../shared/utils/logger.js';

const logger = createLogger('ImageTool');

/**
 * 图片处理工具（占位）
 * - 移除具体实现，保留接口
 * - execute 抛出 NOT_READY，表示功能需由用户后续实现
 */
export class ImageTool implements ITool {
  readonly config: ToolConfig = {
    id: 'image-tool',
    name: '图片处理 (占位)',
    description: '占位实现 — 功能尚未实现',
    icon: '🖼️',
    category: ToolCategory.IMAGE,
    enabled: true,
  };

  async initialize(): Promise<void> {
    logger.info('ImageTool (placeholder) initialized');
  }

  cleanup(): void {
    logger.info('ImageTool (placeholder) cleanup');
  }

  async execute(action: string, _params: unknown): Promise<unknown> {
    logger.warn('Attempted to execute ImageTool while it is a placeholder', { action });
    throw new AppError(AppErrorCode.NOT_READY, `ImageTool is a placeholder and does not implement action: ${action}`);
  }
}

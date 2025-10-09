import { AppError, AppErrorCode } from '../../shared/errors.js';
import { ITool, ToolConfig, ToolExecuteContext } from '../../shared/types.js';
import { createLogger } from '../../shared/utils/logger.js';
import { ImageTool } from './ImageTool.js';
import { FileTool } from './FileTool.js';

const logger = createLogger('ToolManager');

/**
 * 工具管理器
 */
export class ToolManager {
  private tools: Map<string, ITool> = new Map();

  /**
   * 初始化所有工具
   */
  async initialize(): Promise<void> {
    logger.info('Initializing tools...');

    try {
      // 注册工具
      const imageTool = new ImageTool();
      const fileTool = new FileTool();

      await this.registerTool(imageTool);
      await this.registerTool(fileTool);

      logger.success(`Initialized ${this.tools.size} tools`);
    } catch (error) {
      logger.error('Failed to initialize tools:', error);
      throw error;
    }
  }

  /**
   * 注册工具
   */
  private async registerTool(tool: ITool): Promise<void> {
    try {
      await tool.initialize();
      this.tools.set(tool.config.id, tool);
      logger.info(`Registered tool: ${tool.config.name}`);
    } catch (error) {
      logger.error(`Failed to register tool ${tool.config.name}:`, error);
      throw new AppError(AppErrorCode.NOT_READY, `Failed to register tool ${tool.config.id}`, {
        cause: error,
        context: { toolId: tool.config.id },
        recoverable: false,
      });
    }
  }

  /**
   * 获取所有工具配置
   */
  getAllTools(): ToolConfig[] {
    return Array.from(this.tools.values())
      .map(tool => tool.config)
      .filter(config => config.enabled);
  }

  /**
   * 执行工具
   */
  async executeTool(toolId: string, params: unknown, context?: ToolExecuteContext): Promise<unknown> {
    const tool = this.tools.get(toolId);
    
    if (!tool) {
      throw new AppError(AppErrorCode.NOT_FOUND, `Tool not found: ${toolId}`, {
        recoverable: false,
        context: { toolId },
      });
    }

    const payload = params ?? {};
    const action = typeof (payload as { action?: unknown }).action === 'string'
      ? (payload as { action: string }).action
      : undefined;

    if (!action) {
      throw new AppError(AppErrorCode.INVALID_ARGUMENT, `Missing action for tool ${toolId}`, {
        context: { toolId },
      });
    }

    logger.info(`Executing tool action`, { toolId, action });

    try {
      const result = await tool.execute(action, payload, context);
      logger.success(`Tool action completed`, { toolId, action });
      return result;
    } catch (error) {
      logger.error(`Tool action failed`, { toolId, action, error });
      throw new AppError(AppErrorCode.EXECUTION_FAILED, `Tool ${tool.config.name} failed to execute action ${action}`, {
        cause: error,
        context: { toolId, action },
        recoverable: false,
      });
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    logger.info('Cleaning up tools...');
    
    this.tools.forEach(tool => {
      try {
        tool.cleanup();
      } catch (error) {
        logger.error(`Failed to cleanup tool ${tool.config.name}:`, error);
      }
    });
    
    this.tools.clear();
    logger.success('Tools cleaned up');
  }
}

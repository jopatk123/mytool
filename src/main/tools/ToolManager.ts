import { ITool, ToolConfig } from '../../shared/types.js';
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
      throw error;
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
  async executeTool(toolId: string, params: unknown): Promise<unknown> {
    const tool = this.tools.get(toolId);
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    logger.info(`Executing tool: ${tool.config.name}`);

    // 标记 params 已使用（当前实现中不需要具体处理）以避免未使用参数的编译错误
    void params;

    // 这里需要工具实现具体的执行方法
    // 暂时返回成功
    return { success: true };
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

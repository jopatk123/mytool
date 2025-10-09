import { describe, it, expect, beforeEach } from 'vitest';
import { ToolManager } from '../main/tools/ToolManager';

describe('ToolManager', () => {
  let toolManager: ToolManager;

  beforeEach(() => {
    toolManager = new ToolManager();
  });

  it('should initialize without errors', async () => {
    await expect(toolManager.initialize()).resolves.not.toThrow();
  });

  it('should get all tools after initialization', async () => {
    await toolManager.initialize();
    const tools = toolManager.getAllTools();
    
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it('should have image tool', async () => {
    await toolManager.initialize();
    const tools = toolManager.getAllTools();
    
    const imageTool = tools.find(t => t.id === 'image-tool');
    expect(imageTool).toBeDefined();
    expect(imageTool?.name).toBe('图片处理');
  });

  it('should have file tool', async () => {
    await toolManager.initialize();
    const tools = toolManager.getAllTools();
    
    const fileTool = tools.find(t => t.id === 'file-tool');
    expect(fileTool).toBeDefined();
    expect(fileTool?.name).toBe('文件工具');
  });

  it('should cleanup without errors', async () => {
    await toolManager.initialize();
    expect(() => toolManager.cleanup()).not.toThrow();
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
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

    const imageTool = tools.find((t) => t.id === 'image-tool');
    expect(imageTool).toBeDefined();
    expect(imageTool?.name).toBe('图片批量处理');
  });

  it('should have file tool', async () => {
    await toolManager.initialize();
    const tools = toolManager.getAllTools();

    const fileTool = tools.find((t) => t.id === 'file-tool');
    expect(fileTool).toBeDefined();
    expect(fileTool?.name).toBe('文件工具');
    expect(fileTool?.enabled).toBe(true);
  });

  it('should have audio tool', async () => {
    await toolManager.initialize();
    const tools = toolManager.getAllTools();

    const audioTool = tools.find((t) => t.id === 'audio-tool');
    expect(audioTool).toBeDefined();
    expect(audioTool?.name).toBe('音频处理工具');
    expect(audioTool?.category).toBe('audio');
  });

  it('should have video tool', async () => {
    await toolManager.initialize();
    const tools = toolManager.getAllTools();

    const videoTool = tools.find((t) => t.id === 'video-tool');
    expect(videoTool).toBeDefined();
    expect(videoTool?.name).toBe('视频处理工具');
    expect(videoTool?.category).toBe('video');
    expect(videoTool?.enabled).toBe(true);
  });

  it('should cleanup without errors', async () => {
    await toolManager.initialize();
    expect(() => toolManager.cleanup()).not.toThrow();
  });
});

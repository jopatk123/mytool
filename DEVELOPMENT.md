# 开发文档

## 架构设计

### 整体架构

Desktop Toolkit 采用 Electron 的经典架构模式：

```
┌─────────────────────────────────────┐
│          Electron App               │
├─────────────────┬───────────────────┤
│   Main Process  │  Renderer Process │
├─────────────────┼───────────────────┤
│  - 窗口管理     │  - React UI       │
│  - 工具管理     │  - 用户交互       │
│  - IPC Server   │  - IPC Client     │
│  - 文件系统     │  - 状态管理       │
└─────────────────┴───────────────────┘
```

### 模块划分

#### 1. 主进程 (Main Process)

- **main.ts**: 应用入口，负责窗口创建和生命周期管理
- **preload.ts**: 安全的 IPC 桥接层
- **tools/**: 工具实现层
  - `ToolManager.ts`: 工具管理器
  - `ImageTool.ts`: 图片处理工具
  - `FileTool.ts`: 文件工具

#### 2. 渲染进程 (Renderer Process)

- **components/**: 可复用组件
  - `Layout.tsx`: 应用布局
- **api/**: 渲染进程访问 Electron API 的 typed wrapper
- **hooks/**: 自定义 Hooks（如 `useElectronAPI`）
- **pages/**: 页面组件
  - `Home.tsx`: 首页
  - `Settings.tsx`: 设置页
  - `tools/`: 工具页面
- **env.ts**: 渲染进程环境常量统一出口
- **styles/**: 全局样式

#### 3. 共享层 (Shared)

- **types.ts**: TypeScript 类型定义
- **constants.ts**: 全局常量
- **utils/**: 工具函数
  - `logger.ts`: 日志工具
  - `helpers.ts`: 辅助函数

## 核心概念

### 工具系统

工具系统采用插件化设计，每个工具都是一个独立的模块：

```typescript
interface ITool {
  readonly config: ToolConfig;
  initialize(): Promise<void>;
  cleanup(): void;
}
```

**添加新工具的步骤：**

1. 实现 `ITool` 接口
2. 在 `ToolManager` 中注册
3. 创建对应的 UI 页面
4. 添加路由配置

### IPC 通信

主进程和渲染进程通过 IPC 通道通信：

```typescript
// 定义通道
export enum IPCChannel {
  TOOL_GET_LIST = 'tool:get-list',
  TOOL_EXECUTE = 'tool:execute',
}

// 主进程监听
ipcMain.handle(IPCChannel.TOOL_GET_LIST, async () => {
  return toolManager.getAllTools();
});

// 渲染进程调用（通过 typed wrapper / Hook）
import { electronAPI } from '@renderer/api/electron';

const tools = await electronAPI.getToolList();
```

### 类型系统

项目使用 TypeScript 提供完整的类型支持：

```typescript
// 工具配置
interface ToolConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ToolCategory;
  enabled: boolean;
}
```

## 最佳实践

### 1. 代码组织

- 按功能模块划分目录
- 使用 TypeScript 进行类型约束
- 共享代码放在 `shared/` 目录

### 2. 错误处理

```typescript
try {
  const result = await toolManager.executeTool(id, params);
  message.success('操作成功');
} catch (error) {
  logger.error('Operation failed:', error);
  message.error('操作失败');
}
```

### 3. 日志记录

```typescript
import { createLogger } from '@shared/utils/logger';

const logger = createLogger('ComponentName');

logger.info('Information message');
logger.warn('Warning message');
logger.error('Error message');
logger.debug('Debug message'); // 仅开发环境
```

### 4. 性能优化

- 使用 React.memo 优化组件渲染
- 合理使用 useMemo 和 useCallback
- 避免在主进程进行耗时操作

### 5. 安全性

- 启用 contextIsolation
- 禁用 nodeIntegration
- 通过 preload 脚本暴露只读 API，并在渲染进程通过 `@renderer/api/electron` 访问
- 验证所有 IPC 消息

## 调试技巧

### 主进程调试

```bash
# 启动时打开调试器
npm start -- --inspect
```

### 渲染进程调试

开发模式下会自动打开 DevTools。

### 日志查看

```typescript
// 查看控制台输出
logger.info('Message', { data });

// 在 Chrome DevTools 中查看
```

## 测试策略

### 单元测试

测试工具函数和业务逻辑：

```typescript
describe('Helper Functions', () => {
  it('should format file size', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
  });
});
```

### 集成测试

测试工具管理器和工具注册：

```typescript
describe('ToolManager', () => {
  it('should initialize all tools', async () => {
    await toolManager.initialize();
    expect(toolManager.getAllTools().length).toBeGreaterThan(0);
  });
});
```

## 常见问题

### Q1: 如何调试主进程代码？

A: 使用 `--inspect` 参数启动应用，然后在 Chrome 中打开 `chrome://inspect`。

### Q2: 如何处理大文件？

A: 考虑使用 Node.js 流式处理，避免一次性加载到内存。

### Q3: 如何优化打包大小？

A: 使用 `electron-builder` 的配置选项，排除不必要的文件。

### Q4: 如何添加自定义主题？

A: 修改 Ant Design 的 theme 配置，使用 ConfigProvider 包裹应用。

## 发布流程

1. 更新版本号（package.json）
2. 更新 CHANGELOG.md
3. 运行测试：`npm test`
4. 构建应用：`npm run build`
5. 打包应用：`npm run package`
6. 测试打包后的应用
7. 创建 Git tag
8. 发布到 GitHub Releases

## 路线图

- [ ] 添加更多工具（PDF、视频等）
- [ ] 支持插件市场
- [ ] 添加云同步功能
- [ ] 支持多语言
- [ ] 性能优化
- [ ] 自动更新功能

## 参考资源

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Ant Design 文档](https://ant.design/components/overview-cn/)
- [Vite 文档](https://vitejs.dev/guide/)

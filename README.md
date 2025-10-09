# Desktop Toolkit

<div align="center">

![Desktop Toolkit](https://img.shields.io/badge/Desktop-Toolkit-blue)
![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

一个功能强大、可扩展的本地桌面工具集应用

[功能特性](#功能特性) •
[快速开始](#快速开始) •
[项目结构](#项目结构) •
[开发指南](#开发指南)

</div>

## 📋 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [开发指南](#开发指南)
- [构建打包](#构建打包)
- [测试](#测试)
- [扩展开发](#扩展开发)

## ✨ 功能特性

- 🖼️ **图片处理工具**
  - 图片格式转换（JPEG, PNG, WebP）
  - 图片压缩优化
  - 尺寸调整
  - 批量处理

- 📁 **文件工具**
  - 批量重命名
  - 文件信息查看
  - 文件搜索

- 🔧 **可扩展架构**
  - 插件化工具系统
  - 易于添加新工具
  - 模块化设计

- 🎨 **现代化界面**
  - 基于 Ant Design
  - 响应式布局
  - 深色/浅色主题

## 🛠️ 技术栈

- **框架**: Electron 28
- **UI**: React 18 + Ant Design 5
- **语言**: TypeScript 5
- **构建**: Vite 5
- **测试**: Vitest
- **状态管理**: Zustand
- **路由**: React Router 6

## 🚀 快速开始

### 环境要求

- Node.js >= 18.x
- npm >= 9.x

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd mytool

# 安装依赖
npm install
```

### 开发

```bash
# 启动开发服务器
npm start

# 或使用脚本（Linux/Mac）
./scripts/dev.sh

# Windows
scripts\dev.bat
```

### 构建

```bash
# 构建应用
npm run build

# 打包应用
npm run package
```

## 📁 项目结构

```
mytool/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── main.ts          # 主进程入口
│   │   ├── preload.ts       # Preload 脚本
│   │   └── tools/           # 工具实现
│   │       ├── ToolManager.ts
│   │       ├── ImageTool.ts
│   │       └── FileTool.ts
│   ├── renderer/            # React 渲染进程
│   │   ├── main.tsx        # React 入口
│   │   ├── App.tsx         # 应用根组件
│   │   ├── api/            # 渲染进程 API 封装
│   │   ├── hooks/          # 自定义 Hooks（如 useElectronAPI）
│   │   ├── components/     # 公共组件
│   │   ├── pages/          # 页面组件
│   │   ├── env.ts          # 渲染进程环境配置
│   │   └── styles/         # 样式文件
│   ├── shared/             # 共享代码
│   │   ├── types.ts       # 类型定义
│   │   ├── constants.ts   # 常量
│   │   └── utils/         # 工具函数
│   └── tests/             # 测试文件
├── scripts/               # 脚本文件
├── dist/                 # 构建输出（渲染进程）
├── dist-electron/        # 构建输出（主进程）
├── release/              # 打包输出
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## 🔨 开发指南

### 添加新工具

1. **创建工具类**

在 `src/main/tools/` 目录下创建新的工具类：

```typescript
import { ITool, ToolConfig, ToolCategory } from '../../shared/types.js';

export class MyTool implements ITool {
  readonly config: ToolConfig = {
    id: 'my-tool',
    name: '我的工具',
    description: '工具描述',
    icon: '🔧',
    category: ToolCategory.OTHER,
    enabled: true,
  };

  async initialize(): Promise<void> {
    // 初始化逻辑
  }

  cleanup(): void {
    // 清理逻辑
  }
}
```

2. **注册工具**

在 `src/main/tools/ToolManager.ts` 中注册：

```typescript
import { MyTool } from './MyTool.js';

async initialize(): Promise<void> {
  // ... 现有代码
  const myTool = new MyTool();
  await this.registerTool(myTool);
}
```

3. **创建UI页面**

在 `src/renderer/pages/tools/` 创建对应的页面组件。

4. **添加路由**

在 `src/renderer/App.tsx` 添加路由配置。

### IPC 通信

主进程和渲染进程通过 IPC 通信：

```typescript
// 渲染进程调用（推荐：通过 typed wrapper 或 Hook）
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';

const electronAPI = useElectronAPI();
const result = await electronAPI.executeTool('tool-id', params);

// 主进程处理
ipcMain.handle('tool:execute', async (_event, toolId, params) => {
  return toolManager.executeTool(toolId, params);
});
```

> ⚠️ 请勿直接访问 `window.electronAPI`，统一通过 `@renderer/api/electron` 提供的 typed wrapper 来调用。这样可以获得类型提示、运行时安全校验和更好的可测试性。

### 安全与全局管理

- **Context Isolation**：主窗口已启用 `contextIsolation: true` 与 `nodeIntegration: false`，请勿修改为不安全配置。
- **只读 API 暴露**：`preload` 中通过 `contextBridge` 暴露的 `electronAPI` 是不可变对象，任何新增方法都应定义在 `src/shared/types.ts` 并保持幂等。
- **统一访问入口**：渲染进程只能通过 `@renderer/api/electron` 或 `useElectronAPI` 获取 API，避免直接触碰全局对象。
- **版本校验**：`electronAPI` 会在运行时校验版本号，若出现不一致会给出警告，确保主/渲染进程版本同步。

### 状态管理

使用 Zustand 进行状态管理：

```typescript
import { create } from 'zustand';

interface AppStore {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppStore>((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
```

## 📦 构建打包

### 开发构建

```bash
npm run build
```

### 生产打包

```bash
# 打包当前平台
npm run package

# 打包特定平台
npm run package -- --linux
npm run package -- --win
npm run package -- --mac
```

打包后的文件在 `release/` 目录下。

## 🧪 测试

```bash
# 运行测试
npm test

# 测试 UI 界面
npm run test:ui

# 生成测试覆盖率
npm test -- --coverage
```

## 📝 代码规范

项目使用 ESLint 进行代码检查：

```bash
npm run lint
```

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Ant Design](https://ant.design/)
- [Vite](https://vitejs.dev/)

## 📮 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。

---

<div align="center">
Made with ❤️ by Desktop Toolkit Team
</div>

# Electron Preload 脚本修复总结

## 问题描述

在开发过程中遇到严重的 Electron preload 脚本加载错误：

```
Unable to load preload script: /path/to/dist-electron/src/main/preload.js
Error: module not found: ../shared/constants
```

这导致：
- `window.electronAPI` 未定义
- 渲染进程无法与主进程通信
- 所有工具功能失效
- 大量控制台错误

## 根本原因

1. **Electron 沙箱环境限制**
   - preload 脚本在沙箱中运行，无法使用相对路径的 `require()`
   - 需要 preload 脚本是一个自包含的打包文件

2. **TypeScript 编译器局限**
   - `tsc` 只转译代码，不打包依赖
   - 编译后的 `preload.js` 仍包含 `require('../shared/constants')`
   - 在沙箱环境中这些 require 会失败

3. **源代码导入错误**
   - 之前代码中使用了 `.js` 扩展名：`import x from '../shared/constants.js'`
   - TypeScript 编译成 CommonJS 时，生成 `require('../shared/constants.js')`
   - Node.js 无法正确解析带 `.js` 的 CommonJS require

## 解决方案

### 1. 移除源代码中的 `.js` 扩展名

修改所有主进程和共享模块的导入：

```typescript
// ✅ 修复后
import { ELECTRON_API_VERSION } from '../shared/constants';

// ❌ 修复前
import { ELECTRON_API_VERSION } from '../shared/constants.js';
```

**影响的文件：**
- `src/main/preload.ts`
- `src/main/main.ts`
- `src/main/tools/ToolManager.ts`
- `src/main/tools/FileTool.ts`
- `src/main/tools/ImageTool.ts`
- `src/main/tools/image/DirectoryScanner.ts`
- `src/main/tools/image/ImageJobManager.ts`
- `src/main/observability/Observability.ts`

### 2. 使用 esbuild 打包 preload 脚本

**安装依赖：**
```bash
npm install --save-dev esbuild
```

**创建打包脚本** (`scripts/bundle-preload.cjs`):
```javascript
const esbuild = require('esbuild');
const path = require('path');

await esbuild.build({
  entryPoints: [path.join(__dirname, '../src/main/preload.ts')],
  bundle: true,          // 关键：打包所有依赖
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist-electron/src/main/preload.js',
  external: ['electron'], // electron 模块由 Electron 提供
  sourcemap: isDev ? 'inline' : false,
  minify: !isDev,
});
```

### 3. 集成到构建流程

修改 `scripts/ensure-electron-dist.cjs`，在 TypeScript 编译后自动打包 preload：

```javascript
const main = () => {
  const decision = needsRebuild(force);
  
  if (decision.shouldBuild) {
    // 1. TypeScript 编译
    if (!runTscBuild(decision.forceEmit)) {
      return;
    }
    // 2. 打包 preload 脚本
    if (!bundlePreload(isDev)) {
      return;
    }
  }
  
  verifyOutputs();
};
```

### 4. 添加浏览器控制台日志自动保存

在开发模式下自动捕获并保存浏览器控制台输出到 `console-<timestamp>.log`：

```typescript
function setupConsoleLogger(window: BrowserWindow): void {
  const logFilePath = path.join(app.getAppPath(), `console-${Date.now()}.log`);
  let logStream: fs.FileHandle | null = null;

  // 监听控制台消息
  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const timestamp = new Date().toISOString();
    const levelName = ['log', 'warning', 'error', 'debug', 'info'][level];
    let logEntry = `[${timestamp}] [${levelName.toUpperCase()}] ${message}\n`;
    if (sourceId && line) {
      logEntry += `  at ${sourceId}:${line}\n`;
    }
    void logStream.write(logEntry);
  });
}
```

## 验证脚本

### `scripts/verify-persistent-fix.sh`

模拟全新克隆后的完整构建流程，验证：
- TypeScript 配置正确
- 源代码导入路径无 `.js` 扩展名
- esbuild 依赖已安装
- 打包脚本存在并集成
- 构建流程正确执行
- preload.js 已被打包且自包含

运行验证：
```bash
./scripts/verify-persistent-fix.sh
```

## 修复效果

### 修复前
```
❌ Unable to load preload script
❌ Error: module not found: ../shared/constants
❌ electronAPI is not available
❌ 所有功能失效
❌ 大量控制台错误
```

### 修复后
```
✅ preload 脚本正常加载
✅ window.electronAPI 正确暴露
✅ 主进程与渲染进程通信正常
✅ 所有工具功能可用
✅ 无控制台错误（除了预期的警告）
✅ 控制台日志自动保存到文件
```

## 持久化保证

### 对新开发者透明

```bash
git clone <repository>
npm install          # 自动安装 esbuild
npm run start        # 自动构建和打包，一切正常
```

### 关键配置文件

1. **package.json**
   - 包含 `esbuild` 依赖
   - 构建脚本正确配置

2. **tsconfig.electron.json**
   ```json
   {
     "compilerOptions": {
       "module": "CommonJS",
       "allowImportingTsExtensions": false
     }
   }
   ```

3. **scripts/ensure-electron-dist.cjs**
   - 集成了 TypeScript 编译和 preload 打包
   - 开发时自动触发

4. **scripts/bundle-preload.cjs**
   - 专门负责打包 preload 脚本
   - 支持开发和生产模式

### 自动检查

CI/CD 可以运行以下命令确保修复有效：

```bash
npm run build:electron
./scripts/verify-persistent-fix.sh
npm test
```

## 经验教训

1. **Electron 沙箱环境的特殊性**
   - preload 脚本必须是自包含的
   - 不能依赖外部模块的相对路径加载

2. **TypeScript 不等于打包器**
   - `tsc` 只做类型检查和语法转换
   - 需要打包器（webpack/esbuild/rollup）处理依赖

3. **ESM vs CommonJS 的陷阱**
   - TypeScript 中的 `.js` 扩展名是为 ESM 设计的
   - 编译成 CommonJS 时会导致问题

4. **构建流程的完整性**
   - 不仅要编译，还要打包
   - 验证脚本很重要

## 参考资源

- [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron Sandbox](https://www.electronjs.org/docs/latest/tutorial/sandbox)
- [esbuild Documentation](https://esbuild.github.io/)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)

---

**修复日期:** 2025-10-10
**负责人:** GitHub Copilot
**状态:** ✅ 完成并验证

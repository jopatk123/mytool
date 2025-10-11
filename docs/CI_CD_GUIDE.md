# GitHub Actions CI/CD 配置文档

## 概述

本项目配置了两个 GitHub Actions 工作流，用于自动化测试、构建和代码质量检查。

## 工作流说明

### 1. CI 工作流 (`.github/workflows/ci.yml`)

**触发条件:**

- Push 到 `main` 或 `develop` 分支
- Pull Request 到 `main` 或 `develop` 分支

**执行内容:**

#### 测试与构建作业 (Test & Build)

- **运行环境**: Ubuntu, Windows, macOS
- **Node.js 版本**: 18.x, 20.x
- **步骤**:
  1. 检出代码
  2. 设置 Node.js 环境
  3. 安装依赖 (`npm ci`)
  4. TypeScript 类型检查 (`npm run typecheck`)
  5. ESLint 代码质量检查 (`npm run lint`)
  6. 运行测试套件 (`npm run test:run`)
  7. 构建 Vite 渲染进程 (`npm run build`)
  8. 构建 Electron 主进程 (`npm run build:electron`)
  9. 上传测试覆盖率报告 (仅 Ubuntu + Node 20.x)

#### 格式检查作业 (Format Check)

- **运行环境**: Ubuntu Latest
- **Node.js 版本**: 20.x
- **步骤**:
  1. 检出代码
  2. 设置 Node.js 环境
  3. 安装依赖
  4. 检查代码格式 (`npm run format:check`)

### 2. PR 检查工作流 (`.github/workflows/pr-checks.yml`)

**触发条件:**

- Pull Request 打开、同步或重新打开

**执行内容:**

- 快速验证 PR 的代码质量
- TypeScript 类型检查
- ESLint 代码质量检查
- 测试套件运行
- 自动在 PR 中评论结果

## 本地验证命令

在提交代码前，建议本地运行以下命令确保 CI 能通过：

```bash
# TypeScript 类型检查
npm run typecheck

# ESLint 代码质量检查
npm run lint

# 运行测试
npm run test:run

# 检查代码格式
npm run format:check

# 自动修复代码格式
npm run format

# 构建项目
npm run build
npm run build:electron
```

## 快速验证脚本

可以使用以下命令一次性运行所有检查：

```bash
npm run typecheck && npm run lint && npm run test:run && npm run format:check
```

## CI 状态徽章

可以在项目 README 中添加以下徽章显示 CI 状态：

```markdown
![CI](https://github.com/jopatk123/mytool/workflows/CI/badge.svg)
```

## 故障排查

### CI 失败常见原因

1. **TypeScript 错误**
   - 运行 `npm run typecheck` 查看具体错误
   - 检查类型定义和导入

2. **ESLint 错误**
   - 运行 `npm run lint` 查看具体问题
   - 使用 `npm run lint:fix` 自动修复部分问题

3. **测试失败**
   - 运行 `npm run test:run` 在本地复现
   - 检查测试日志和错误信息

4. **构建失败**
   - 检查依赖是否正确安装
   - 验证 `package.json` 和配置文件

5. **格式问题**
   - 运行 `npm run format` 自动格式化代码
   - 确保 Prettier 配置正确

## 跳过 CI (不推荐)

如果需要跳过 CI 检查，可以在 commit 消息中添加 `[skip ci]`：

```bash
git commit -m "docs: update README [skip ci]"
```

**注意**: 仅在更新文档等不影响代码的情况下使用。

## 依赖缓存

CI 配置使用了 npm 缓存加速安装过程：

- Actions: `actions/setup-node@v4` with `cache: 'npm'`
- 首次运行会创建缓存
- 后续运行会复用缓存，显著提升速度

## 测试覆盖率

测试覆盖率报告会自动生成并上传为 artifact：

- 仅在 Ubuntu + Node 20.x 环境上传
- 保留 7 天
- 可在 Actions 页面下载查看

## 多环境测试

CI 在多个操作系统和 Node.js 版本上运行，确保兼容性：

- **操作系统**: Ubuntu, Windows, macOS
- **Node.js**: 18.x, 20.x

如果某个环境失败，查看该环境的具体日志定位问题。

## 后续优化建议

1. **添加代码覆盖率徽章**
   - 集成 Codecov 或 Coveralls
   - 在 README 中显示覆盖率

2. **自动发布**
   - 配置 semantic-release
   - 自动生成版本号和 changelog

3. **打包 Electron 应用**
   - 添加 release 工作流
   - 自动构建并发布 .exe, .dmg, .AppImage

4. **依赖安全扫描**
   - 集成 Snyk 或 Dependabot
   - 自动检测安全漏洞

5. **性能回归测试**
   - 添加性能基准测试
   - 监控构建大小变化

---

**最后更新**: 2025-10-11  
**维护者**: Desktop Toolkit Team

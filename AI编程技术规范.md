# AI 编程协作规范与工程基线（桌面端适配版）

## 技术基线一览

| 模块       | 推荐组合                                       | 可替换/扩展                                 | 备注                                                                           |
| ---------- | ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| 前端应用层 | Vue 3 + Vite + Element Plus + Electron         | React + Vite + Electron / Svelte + Electron | 选择支持热更新、组件化、TypeScript 的现代框架；统一使用模块化目录与别名。      |
| 状态与路由 | Pinia + Vue Router + electron-store            | Redux Toolkit、Zustand、TanStack Router     | 从业务复杂度出发选择状态方案，需考虑主进程与渲染进程状态同步机制。             |
| 进程通信   | ipcRenderer + ipcMain + 自定义通信层           | electron-redux、comlink                     | 统一通信格式、错误处理与权限控制，敏感操作必须在主进程执行。                   |
| 样式系统   | Sass + 全局变量注入 + electron-css-inject      | Tailwind、UnoCSS、CSS Modules               | 保持主题变量与设计体系一致，支持系统主题跟随（亮色/暗色模式）。                |
| 前端测试   | Vitest + @vue/test-utils + jsdom + spectron    | Jest、Playwright、Cypress                   | 单元、组件测试覆盖核心逻辑，端到端测试需验证跨进程交互。                       |
| 代码质量   | ESLint + Prettier + Stylelint（可选）          | Biome、Rome                                 | 通过统一脚本执行 lint/format，确保输出一致。                                   |
| 主进程框架 | Electron 28+ + electron-builder                | electron-forge、electron-packager           | 需支持自动更新、多平台打包与原生模块集成。                                     |
| 数据访问   | SQLite3 + typeorm + electron-store（轻量数据） | Prisma、Knex、LevelDB                       | 本地数据库需考虑路径管理（用户数据目录）与迁移机制，敏感数据加密存储。         |
| 文件与媒体 | fs-extra + Sharp + exifr + electron-dialog     | node-stream、ffmpeg-static                  | 统一文件操作权限处理，通过主进程调用系统对话框，避免渲染进程直接操作文件系统。 |
| 系统集成   | electron-clipboard + electron-power-monitor    | node-ffi、robotjs                           | 系统级API需封装抽象层，处理不同平台差异（Windows/macOS/Linux）。               |
| 后端能力   | 内置 Express 服务（可选）                      | Fastify、NestJS（嵌入式）                   | 仅在需要本地API服务时引入，优先使用进程内通信而非网络接口。                    |
| 测试体系   | Jest（主进程） + Vitest（渲染进程） + spectron | Mocha、Playwright                           | 分别测试主进程、渲染进程及跨进程交互，覆盖自动更新等桌面特性。                 |
| 日志与监控 | winston + electron-log + 崩溃报告              | Pino、Sentry（桌面版）                      | 日志需写入用户数据目录，支持日志轮转与崩溃自动上报。                           |
| 打包与部署 | electron-builder + 签名工具                    | electron-forge、nsis/inno setup             | 需支持多平台打包、自动更新服务器配置与代码签名流程。                           |

---

## 代码风格统一约定

- **格式化与工具链**
  - 全仓库使用 Prettier（缺省配置：2 空格缩进、分号、单引号、自动行宽），通过 `npm run format` 统一执行。
  - ESLint 在根目录管理规则：前端使用 `eslint-plugin-vue`，主进程使用 `eslint-plugin-node`；如启用 TypeScript，使用 `@typescript-eslint`。
  - 增加 `eslint-plugin-electron` 校验进程安全最佳实践（如禁止渲染进程直接使用 `fs` 模块）。
  - Tailwind/设计 Token 等专用风格可在 Stylelint/自定义 lint 中补充校验。

- **命名规范**
  - JavaScript/TypeScript：变量与函数 `camelCase`，常量 `UPPER_SNAKE_CASE`，类/组件 `PascalCase`。
  - Vue 组件文件采用 `PascalCase.vue`，复用逻辑的 `composable` 使用 `useXxx.ts`，工具函数 `xxx.util.ts`。
  - 主进程模块使用 `xxx.main.ts`，渲染进程模块使用 `xxx.renderer.ts`，共享模块使用 `xxx.shared.ts`。
  - IPC 通道命名遵循 `domain:action:direction` 格式（例如 `file:save:request` / `file:save:response`）。
  - Git 分支 `feature/short-description`、`fix/issue-id`，提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org)。

- **代码组织**
  - 目录分层：
    ```
    src/
      main/                 # 主进程代码
        ipc/                # IPC处理逻辑
        services/           # 系统服务（文件、窗口管理等）
        utils/              # 主进程工具函数
        main.ts             # 入口文件
      renderer/             # 渲染进程代码
        components/         # UI组件
        views/              # 页面视图
        composables/        # 组合式函数
        services/           # 前端服务
        store/              # 状态管理
        utils/              # 渲染进程工具
      shared/               # 共享代码
        types/              # 类型定义
        constants/          # 共享常量
        utils/              # 通用工具
    ```
  - 严禁在渲染进程中直接访问原生模块（`fs`/`os`等），必须通过 IPC 委托主进程处理。

- **注释与文档**
  - 复杂逻辑应使用 `//` 行内注释，模块级使用 JSDoc（或 TSDoc）描述参数与返回值。
  - IPC 接口必须注释参数类型、权限要求与跨平台差异。
  - 约定俗成的代码片段（例如补丁、hack）需解释动机与风险，并在跟踪 issue 中注明清除计划。

- **测试风格**
  - 使用 `describe/it` 结构，断言统一使用 `expect`，测试命名清晰表达行为。
  - 主进程测试需隔离 Electron 实例，渲染进程测试模拟 IPC 通信。
  - 提前约定模拟策略（Mock 系统 API、进程通信或集成测试），避免重复造测试辅助函数。

---

## 文件大小与职责约束

- **行数限制**：
  - 所有源代码文件（前后端、测试）应控制在 **≤400 行**。
  - 超出限制必须拆分，形成子模块或子目录。

- **单一职责**：
  - 每个文件只负责一个逻辑维度：
    - `service` 文件只包含一类业务逻辑；
    - `component` 文件只包含一个 UI 组件；
    - `ipc` 处理文件按功能模块拆分（如 `file.ipc.ts`、`window.ipc.ts`）；
    - `utils` 文件应按类别分拆（如 `path.util.ts`, `dialog.util.ts`）。

- **目录优化**：
  - 大文件必须抽出为子目录：

    ```
    components/
      FileExplorer/
        FileExplorer.vue
        useFileExplorer.ts
        FileExplorer.test.ts
    main/services/
      window/
        window.service.ts
        window.types.ts
        window.test.ts
    ```

- **测试拆分**：
  - 每个 `describe` 建议单独测试文件，例如：

    ```
    tests/main/ipc/
      file-save.test.ts
      file-open.test.ts
    tests/renderer/components/
      FileUploader.test.ts
      SettingsPanel.test.ts
    ```

---

## 桌面端协同原则

1. **进程职责划分**：
   - 主进程（Main Process）：负责窗口管理、系统集成、文件操作、权限控制等原生能力。
   - 渲染进程（Renderer Process）：负责 UI 渲染、用户交互、状态管理等前端逻辑。
   - 共享模块（Shared）：仅包含类型定义、常量和无环境依赖的工具函数。

2. **IPC 通信规范**：
   - 所有跨进程通信必须通过预定义的 IPC 通道，禁止使用 `remote` 模块（已废弃）。
   - 通信格式统一为：
     ```typescript
     // 请求
     { id: string, payload: TPayload }
     // 响应
     { id: string, success: boolean, data?: TData, error?: { code: string, message: string } }
     ```
   - 敏感操作（文件写入、系统设置）必须在主进程验证权限，渲染进程仅负责发起请求。

3. **窗口管理**：
   - 统一通过 `WindowManager` 服务管理窗口创建、销毁与状态同步。
   - 窗口配置（尺寸、位置、菜单）集中定义在 `src/main/config/windows.ts`。

4. **数据存储策略**：
   - 轻量配置：使用 `electron-store` 存储用户偏好（自动处理路径与序列化）。
   - 结构化数据：使用 SQLite3 存储业务数据，数据库文件路径遵循系统规范（如 `app.getPath('userData')/databases`）。
   - 敏感数据：必须加密存储（推荐 `crypto-js` 或原生 `crypto` 模块），密钥管理遵循系统安全最佳实践。

5. **文件系统交互**：
   - 所有文件操作通过主进程的 `FileService` 处理，统一路径解析与错误处理。
   - 大文件操作需支持进度反馈（通过 IPC 事件流）与取消机制。

6. **自动更新**：
   - 实现基于 `electron-updater` 的自动更新流程，包含更新检查、下载、安装与重启逻辑。
   - 提供手动检查更新入口，更新过程中显示明确的进度提示。

7. **跨平台适配**：
   - 系统差异处理集中在 `src/main/utils/platform.ts`，避免散落在业务代码中。
   - 菜单、快捷键、窗口行为需针对 Windows/macOS/Linux 分别测试验证。

8. **质量保障**：
   - 主进程测试覆盖 IPC 处理逻辑与系统集成功能。
   - 渲染进程测试覆盖 UI 组件与前端业务逻辑。
   - 端到端测试验证关键用户流程（如文件导入导出、系统设置修改）。
   - 必须测试打包后的应用（而非仅开发模式），确保原生模块正确集成。

---

## 后端能力集成（可选）

1. **嵌入式服务**：
   - 仅在需要本地 API 服务时引入 Express 等框架，默认监听 `127.0.0.1` 而非公网地址。
   - 服务启动与端口管理由主进程控制，端口冲突时自动重试或提示用户。

2. **网络通信**：
   - 外部 API 调用统一通过渲染进程的 `Axios` 封装，需支持代理配置与离线处理。
   - 敏感凭证（API Key 等）存储在主进程，通过 IPC 按需提供给渲染进程（避免暴露在前端）。

3. **实时能力**：
   - 如需与远程服务实时通信，使用 `ws` 或 `socket.io-client`，断线重连逻辑在渲染进程实现。
   - 本地进程间实时通信优先使用 IPC 事件，而非网络协议。

---

## 数据与存储规范

- **数据库**：
  - 默认使用 SQLite3 作为本地数据库，数据库文件放在用户数据目录（`app.getPath('userData')`）。
  - 数据库迁移脚本放在 `src/main/migrations`，支持升级与回滚操作。

- **缓存与临时文件**：
  - 缓存文件放在系统缓存目录（`app.getPath('cache')`），定期清理策略由 `CacheManager` 服务实现。
  - 临时文件使用 `tmp-promise` 管理，确保程序退出时自动清理。

- **文件与对象存储**：
  - 应用生成文件默认路径：`app.getPath('documents')/应用名称/`，允许用户自定义。
  - 文件命名规则：`{timestamp}-{hash}.{ext}`，避免冲突；目录结构按模块划分（如 `exports/`、`imports/`、`backups/`）。
  - 大文件（>100MB）操作需支持断点续传，进度通过 IPC 实时反馈到 UI。

---

## 打包与部署

1. **环境分类**：`local`（开发）、`dev`（测试）、`staging`（预发布）、`production`（生产）四层；配置差异写在 `docs/environments.md`。

2. **本地开发**：
   - 提供 `npm run dev`（同时启动主进程与渲染进程）、`npm run dev:main`、`npm run dev:renderer` 单独启动脚本。
   - 使用 `electron-reloader` 实现主进程热重载，Vite 实现渲染进程热更新。

3. **打包配置**：
   - `electron-builder` 配置集中在 `electron-builder.json5`，按平台拆分配置（`win`/`mac`/`linux`）。
   - 图标资源放在 `build/icons`，遵循各平台图标规范（尺寸、格式）。
   - 代码签名：生产环境必须启用，证书配置通过环境变量注入，不提交到代码仓库。

4. **自动更新**：
   - 开发/测试环境使用 `http://localhost` 作为更新服务器，生产环境配置正式更新地址。
   - 更新日志与版本历史放在 `CHANGELOG.md`，打包时自动嵌入应用。

---

## 全局变量与运行时配置

为避免隐式依赖与难以测试的全局状态，建议遵循下列约定：

- **渲染进程**：
  - 集中在 `src/renderer/constants/env.ts` 模块，负责从 `import.meta.env` 和 IPC 读取配置。
  - 禁止直接访问 `electron` 或 `ipcRenderer` 全局变量，需通过封装的 `electron.service.ts` 访问。
  - 对 `window` 的操作封装为可测试的 composable（如 `useWindowSize`、`useDrag`）。

- **主进程**：
  - 集中在 `src/main/config/env.ts` 中解析 `process.env` 和应用配置文件，统一默认值与类型转换。
  - 所有 Electron API 调用需通过服务层封装（如 `AppService`、`WindowService`），避免直接在 IPC 处理函数中使用。

- **配置存储**：
  - 可修改的用户配置通过 `electron-store` 管理，键名使用命名空间（如 `window:bounds`、`editor:fontSize`）。
  - 配置变更需触发 `config:changed` 事件，相关模块监听并应用变更。

- **测试**：
  - 主进程测试使用 `electron-mocha` 或 `jest-electron`，隔离 Electron 实例。
  - 渲染进程测试中通过 `vi.mock` 模拟 IPC 调用，避免依赖主进程。
  - 跨进程测试使用 `spectron` 启动完整应用，聚焦关键用户流程。

---

## AI 协作流程

1. **任务准备**：AI 代理在接到需求后，先阅读上下文并建立 Todo；必要时列出假设（特别是跨平台行为差异）。

2. **执行原则**：
   - 遵循“先测试，再实现”理念：若可能，先补测试，再写功能。
   - 所有代码变更必须说明影响范围、跨平台兼容性与验证方式。
   - 文件行数限制：若实现超过400行，应自动拆分文件，保持单一职责。
   - 运行测试的时候，需要添加参数(比如--run)，自动进行测试，不允许进入交互式模式或者监视模式。
   - 涉及原生模块时，需额外测试打包后的应用（开发模式可能与生产环境存在差异）。

3. **验证与回归**：
   - 至少运行相关单元测试、lint；若改动影响打包，需验证打包后功能。
   - 跨平台功能需在主要平台（Windows 10+/macOS 12+/Ubuntu 20.04+）验证。

4. **文档同步**：
   - 更新 README、API 文档，若有环境变量或配置变更，更新 `.env.example` 和 `electron-builder.json5` 注释。
   - 新增 IPC 接口需在 `docs/ipc-api.md` 中记录。

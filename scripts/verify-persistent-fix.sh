#!/bin/bash
# 验证修复的持久化：模拟全新克隆后的完整构建流程

set -e  # 遇到错误立即退出

echo "=== 验证 Electron Preload 修复的持久化 ==="
echo
echo "此脚本模拟其他开发者克隆项目后的完整构建流程"
echo

# 1. 验证 TypeScript 配置
echo "步骤 1: 验证 TypeScript 配置..."
if grep -q '"module": "CommonJS"' tsconfig.electron.json && \
   grep -q '"allowImportingTsExtensions": false' tsconfig.electron.json; then
  echo "  ✅ tsconfig.electron.json 配置正确"
else
  echo "  ❌ tsconfig.electron.json 配置有问题"
  exit 1
fi

# 2. 验证源代码中没有 .js 扩展名导入
echo
echo "步骤 2: 验证源代码导入路径..."
if grep -r "from ['\"]\.\./.*/.*\.js['\"]" src/main/ src/shared/ 2>/dev/null; then
  echo "  ❌ 发现包含 .js 扩展名的导入"
  exit 1
else
  echo "  ✅ 所有导入路径都不包含 .js 扩展名"
fi

# 3. 验证 esbuild 已安装
echo
echo "步骤 3: 验证 esbuild 依赖..."
if grep -q '"esbuild"' package.json; then
  echo "  ✅ esbuild 已在 package.json 中"
else
  echo "  ❌ 缺少 esbuild 依赖"
  exit 1
fi

# 4. 验证打包脚本存在
echo
echo "步骤 4: 验证 preload 打包脚本..."
if [ -f "scripts/bundle-preload.cjs" ]; then
  echo "  ✅ bundle-preload.cjs 存在"
else
  echo "  ❌ bundle-preload.cjs 不存在"
  exit 1
fi

# 5. 验证构建流程集成
echo
echo "步骤 5: 验证构建流程集成..."
if grep -q "bundlePreload" scripts/ensure-electron-dist.cjs; then
  echo "  ✅ ensure-electron-dist.cjs 已集成 preload 打包"
else
  echo "  ❌ ensure-electron-dist.cjs 未集成 preload 打包"
  exit 1
fi

# 6. 清理并重新构建
echo
echo "步骤 6: 清理旧构建产物..."
rm -rf dist-electron
echo "  ✅ 清理完成"

# 7. 运行完整构建
echo
echo "步骤 7: 运行 TypeScript 编译和 Preload 打包..."
npm run build:electron > /tmp/build-test.log 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ 构建成功"
else
  echo "  ❌ 构建失败"
  cat /tmp/build-test.log
  exit 1
fi

# 8. 验证输出文件
echo
echo "步骤 8: 验证构建输出..."
REQUIRED_FILES=(
  "dist-electron/src/main/main.js"
  "dist-electron/src/main/preload.js"
  "dist-electron/src/shared/constants.js"
  "dist-electron/src/shared/errors.js"
  "dist-electron/src/shared/types.js"
  "dist-electron/package.json"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file 存在"
  else
    echo "  ❌ $file 不存在"
    exit 1
  fi
done

# 9. 验证 preload.js 是打包文件
echo
echo "步骤 9: 验证 preload.js 已被打包..."
if grep -q "var.*Object.defineProperty\|__defProp" dist-electron/src/main/preload.js; then
  echo "  ✅ preload.js 是 esbuild 打包的文件"
else
  echo "  ❌ preload.js 不是打包文件"
  exit 1
fi

# 10. 验证 preload.js 不包含外部 require
echo
echo "步骤 10: 验证 preload.js 是自包含的..."
if grep -q "require(\"../shared" dist-electron/src/main/preload.js; then
  echo "  ❌ preload.js 仍然包含外部模块引用"
  exit 1
else
  echo "  ✅ preload.js 不包含外部模块引用（已打包所有依赖）"
fi

# 11. 验证控制台日志功能
echo
echo "步骤 11: 验证控制台日志捕获功能..."
if grep -q "setupConsoleLogger" src/main/main.ts; then
  echo "  ✅ 控制台日志捕获功能已添加"
else
  echo "  ⚠️  控制台日志捕获功能未找到（非关键）"
fi

echo
echo "=== ✅ 所有验证通过！==="
echo
echo "修复总结："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "问题: Electron 沙箱环境中 preload 脚本无法加载外部模块"
echo "      Error: module not found: ../shared/constants"
echo
echo "根本原因:"
echo "  • TypeScript 编译器只转译代码，不打包依赖"
echo "  • Electron 沙箱中的 preload 脚本无法使用相对路径 require"
echo "  • 源代码中包含 .js 扩展名导致 CommonJS 模块解析失败"
echo
echo "解决方案:"
echo "  1. ✅ 移除所有源文件中的 .js 扩展名（TypeScript 会自动解析）"
echo "  2. ✅ 使用 esbuild 将 preload.ts 打包成单个自包含文件"
echo "  3. ✅ 集成到构建流程：TypeScript 编译 → esbuild 打包 preload"
echo "  4. ✅ 添加验证脚本确保修复持久化"
echo
echo "其他开发者步骤:"
echo "  1. git clone <repo>"
echo "  2. npm install          # 会安装 esbuild"
echo "  3. npm run start        # 自动执行构建和打包"
echo "  4. ✅ 应用正常运行，无 preload 错误"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

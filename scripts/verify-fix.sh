#!/bin/bash
# 测试脚本：验证 preload 脚本修复

echo "=== 验证 Electron 主进程编译产物 ==="
echo

echo "检查 preload.js 中的模块导入..."
if grep -q "require(\"../shared/constants\")" dist-electron/src/main/preload.js; then
  echo "✅ preload.js 使用正确的 CommonJS 导入（无 .js 扩展名）"
else
  echo "❌ preload.js 导入路径不正确"
  exit 1
fi

echo
echo "检查 main.js 中的模块导入..."
if grep -q "require(\"../shared/errors\")" dist-electron/src/main/main.js; then
  echo "✅ main.js 使用正确的 CommonJS 导入（无 .js 扩展名）"
else
  echo "❌ main.js 导入路径不正确"
  exit 1
fi

echo
echo "检查编译后的 shared 模块是否存在..."
if [ -f "dist-electron/src/shared/constants.js" ] && \
   [ -f "dist-electron/src/shared/errors.js" ] && \
   [ -f "dist-electron/src/shared/types.js" ]; then
  echo "✅ 所有 shared 模块编译成功"
else
  echo "❌ 缺少部分 shared 模块"
  exit 1
fi

echo
echo "=== 所有检查通过！==="
echo
echo "修复摘要："
echo "1. ✅ 移除了源代码中 .js 扩展名"
echo "2. ✅ TypeScript 编译器正确生成 CommonJS require 语句"
echo "3. ✅ 编译产物结构正确"
echo
echo "预期结果："
echo "- preload 脚本应该能够正确加载"
echo "- window.electronAPI 应该正确暴露给渲染进程"
echo "- 不会出现 'module not found: ../shared/constants.js' 错误"

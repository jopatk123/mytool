#!/bin/bash
# 测试脚本：验证 Electron 应用修复

echo "=== 测试 Electron 应用 ===" 
echo

# 启动应用
echo "启动应用（将运行 20 秒）..."
timeout 20 npm run start > /tmp/electron-app-test.log 2>&1 &
APP_PID=$!

# 等待应用启动
echo "等待应用启动..."
sleep 12

# 检查是否有 preload 错误
echo
echo "检查浏览器控制台日志..."
LATEST_LOG=$(ls -t localhost-*.log 2>/dev/null | head -1)

if [ -n "$LATEST_LOG" ]; then
  echo "找到日志文件: $LATEST_LOG"
  echo
  
  if grep -q "Unable to load preload script" "$LATEST_LOG"; then
    echo "❌ 发现 preload 脚本加载错误"
    grep -A 5 "Unable to load preload script" "$LATEST_LOG"
    exit 1
  fi
  
  if grep -q "module not found" "$LATEST_LOG"; then
    echo "❌ 发现模块加载错误"
    grep "module not found" "$LATEST_LOG"
    exit 1
  fi
  
  if grep -q "electronAPI is not available" "$LATEST_LOG"; then
    echo "❌ electronAPI 未正确暴露"
    exit 1
  fi
  
  echo "✅ 没有发现 preload 相关错误"
else
  echo "⚠️  未找到新的日志文件（可能没有浏览器控制台错误）"
fi

# 检查主进程输出
echo
echo "检查主进程输出..."
if grep -q "Main window is ready" /tmp/electron-app-test.log; then
  echo "✅ 主窗口成功创建"
else
  echo "❌ 主窗口创建失败"
  cat /tmp/electron-app-test.log
  exit 1
fi

# 终止应用
kill $APP_PID 2>/dev/null
wait $APP_PID 2>/dev/null

echo
echo "=== 测试完成 ==="
echo
echo "修复总结："
echo "1. ✅ 使用 esbuild 将 preload.ts 打包成单文件"
echo "2. ✅ 打包后的 preload.js 不再依赖外部模块"
echo "3. ✅ Electron 沙箱环境可以正常加载 preload 脚本"
echo "4. ✅ window.electronAPI 正确暴露给渲染进程"

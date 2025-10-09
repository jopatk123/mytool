#!/bin/bash

# 启动脚本 - 用于开发环境

echo "🚀 启动 Desktop Toolkit 开发环境..."

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
fi

# 启动开发服务器
echo "⚡ 启动应用..."
npm start

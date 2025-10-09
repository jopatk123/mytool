@echo off
REM 启动脚本 - 用于 Windows 开发环境

echo 🚀 启动 Desktop Toolkit 开发环境...

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    npm install
)

REM 启动开发服务器
echo ⚡ 启动应用...
npm start

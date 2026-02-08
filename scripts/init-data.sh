#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "🔍 检查并初始化种子数据..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查后端服务是否运行
if ! curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "⚠️  后端服务未运行，请先启动后端服务"
    echo "   可以使用以下命令启动："
    echo "   cd server && node app.js"
    exit 1
fi

echo "✅ 后端服务已就绪"
echo ""

# 执行数据初始化
echo "📋 执行数据初始化脚本..."
node server/scripts/init-all-data.js

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 数据初始化成功完成！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ 数据初始化失败"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi

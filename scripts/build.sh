#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

echo "📦 Installing dependencies..."
# 使用更简洁的安装命令，跳过可选依赖减少安装时间
pnpm install --prefer-frozen-lockfile --prefer-offline --no-optional 2>&1 | tail -20

echo ""
echo "🔨 Building the project..."
# 设置环境变量优化构建
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# 执行构建
npx next build 2>&1 | tail -50

echo ""
echo "✅ Build completed successfully!"

# 初始化管理员账号（部署时自动创建）
echo ""
echo "🔐 Initializing admin account..."
node server/scripts/init-admin.js 2>&1 || echo "⚠️ Admin initialization skipped"

echo ""
echo "✅ All done!"

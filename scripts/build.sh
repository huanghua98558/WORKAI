#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

echo "📦 Installing dependencies..."
# 安装所有依赖（包括可选的原生模块）
# 不使用 --no-optional，确保 lightningcss 等原生模块被安装
pnpm install --prefer-frozen-lockfile --prefer-offline 2>&1 | tail -30

# 确保 lightningcss 原生模块已安装
echo ""
echo "🔧 Ensuring native modules..."
if [ -f "node_modules/.pnpm/lightningcss@1.30.2/node_modules/lightningcss/node_modules/lightningcss.linux-x64-gnu.node" ] || \
   [ -f "node_modules/.pnpm/lightningcss@1.30.2/node_modules/lightningcss.linux-x64-gnu.node" ]; then
    echo "✅ lightningcss native module found"
else
    echo "⚠️ lightningcss native module not found, attempting to rebuild..."
    pnpm rebuild lightningcss 2>&1 || true
fi

echo ""
echo "🔨 Building the project..."
# 设置环境变量优化构建
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# 执行构建
npx next build 2>&1 | tail -80

echo ""
echo "✅ Build completed successfully!"

# 初始化管理员账号（部署时自动创建）
echo ""
echo "🔐 Initializing admin account..."
node server/scripts/init-admin.js 2>&1 || echo "⚠️ Admin initialization skipped"

echo ""
echo "✅ All done!"

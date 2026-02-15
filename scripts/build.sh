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

# 初始化管理员账号（仅在数据库配置可用时执行）
echo ""
echo "🔐 Checking admin account initialization..."
# 检查数据库环境变量是否配置
if [ -n "${DATABASE_URL:-}" ] || [ -n "${PGDATABASE_URL:-}" ]; then
    echo "Database configured, initializing admin account..."
    node server/scripts/init-admin.js 2>&1 || echo "⚠️ Admin initialization skipped"
else
    echo "⚠️ Database not configured, skipping admin initialization"
    echo "   Admin account will be created on first startup"
    echo "   Default credentials: admin / Admin@123456"
fi

echo ""
echo "✅ All done!"

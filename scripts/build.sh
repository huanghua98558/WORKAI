#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo "Building the project..."
npx next build

echo "Build completed successfully!"

# 初始化管理员账号（部署时自动创建）
echo "Initializing admin account..."
node server/scripts/init-admin.js || echo "Warning: Admin initialization failed, may already exist"

echo "All done!"

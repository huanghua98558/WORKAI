#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

echo "📦 Installing dependencies..."
# 使用更简洁的安装命令
pnpm install --prefer-frozen-lockfile --prefer-offline 2>&1 | tail -20

echo "✅ Dependencies installed!"

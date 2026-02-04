#!/bin/bash
set -Eeuo pipefail

FRONTEND_PORT=5000
BACKEND_PORT=5001
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
NODE_ENV=development

cd "${COZE_WORKSPACE_PATH}"

kill_port_if_listening() {
    local port=$1
    local pids
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${port}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -z "${pids}" ]]; then
      echo "Port ${port} is free."
      return
    fi
    echo "Port ${port} in use by PIDs: ${pids} (SIGKILL)"
    echo "${pids}" | xargs -I {} kill -9 {}
    sleep 1
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${port}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -n "${pids}" ]]; then
      echo "Warning: port ${port} still busy after SIGKILL, PIDs: ${pids}"
    else
      echo "Port ${port} cleared."
    fi
}

echo "Clearing ports before start..."
kill_port_if_listening ${FRONTEND_PORT}
kill_port_if_listening ${BACKEND_PORT}

# 创建日志目录
mkdir -p logs

# 启动后端服务
echo "Starting backend service on port ${BACKEND_PORT}..."
cd server
PORT=${BACKEND_PORT} node app.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if ! kill -0 ${BACKEND_PID} 2>/dev/null; then
    echo "❌ Backend failed to start"
    cat logs/backend.log
    exit 1
fi

echo "✅ Backend started (PID: ${BACKEND_PID})"

# 启动前端服务
echo "Starting frontend service on port ${FRONTEND_PORT}..."
npx next dev --port ${FRONTEND_PORT} &
FRONTEND_PID=$!

echo "✅ Frontend started (PID: ${FRONTEND_PID})"
echo ""
echo "=================================================="
echo "🚀 WorkTool AI 中枢系统已启动"
echo "=================================================="
echo "📊 管理后台: http://localhost:${FRONTEND_PORT}"
echo "🔧 后端 API: http://localhost:${BACKEND_PORT}"
echo "=================================================="
echo ""
echo "日志文件:"
echo "  - 后端日志: logs/backend.log"
echo ""
echo "停止服务: Ctrl+C 或 kill ${BACKEND_PID} ${FRONTEND_PID}"
echo ""

# 等待任一进程退出
wait ${BACKEND_PID} ${FRONTEND_PID}

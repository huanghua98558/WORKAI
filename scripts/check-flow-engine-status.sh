#!/bin/bash

# 检查流程引擎相关服务状态

echo "========================================="
echo "  流程引擎服务状态检查"
echo "========================================="
echo ""

# 检查前端服务（5000端口）
echo "1. 检查前端服务（5000端口）"
echo "----------------------------------------"
curl -I --max-time 3 http://localhost:5000 2>&1 | head -5
echo ""

# 检查后端服务（5001端口）
echo "2. 检查后端服务（5001端口）"
echo "----------------------------------------"
curl -I --max-time 3 http://localhost:5001/health 2>&1 | head -5
echo ""

# 测试流程定义API
echo "3. 测试流程定义API"
echo "----------------------------------------"
curl -s -w "\nHTTP Status: %{http_code}\n" "http://localhost:5000/api/flow-engine/definitions?limit=1" 2>&1 | tail -5
echo ""

# 测试流程实例API
echo "4. 测试流程实例API"
echo "----------------------------------------"
curl -s -w "\nHTTP Status: %{http_code}\n" "http://localhost:5000/api/flow-engine/instances?limit=1" 2>&1 | tail -5
echo ""

# 检查最近的错误
echo "5. 检查最近的错误日志"
echo "----------------------------------------"
tail -n 50 /app/work/logs/bypass/app.log 2>&1 | grep -i "500\|error" | tail -5
echo ""

echo "========================================="
echo "  检查完成"
echo "========================================="

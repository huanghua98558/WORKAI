#!/bin/bash

echo "=== SSE API测试 ==="
echo ""

# 测试1: SSE测试路由
echo "1. 测试SSE测试路由..."
curl -s http://localhost:5000/sse/test | jq .
echo ""
echo ""

# 测试2: SSE统计信息
echo "2. 测试SSE统计信息..."
curl -s http://localhost:5000/sse/stats | jq .
echo ""
echo ""

echo "=== 测试完成 ==="

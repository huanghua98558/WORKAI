#!/bin/bash

echo "=== 测试后端SSE API ==="
echo ""

# 测试1: SSE测试路由
echo "1. 测试SSE测试路由..."
curl -s http://localhost:5001/api/sse/test
echo ""
echo ""

# 测试2: SSE统计信息
echo "2. 测试SSE统计信息..."
curl -s http://localhost:5001/api/sse/stats
echo ""
echo ""

echo "=== 测试完成 ==="

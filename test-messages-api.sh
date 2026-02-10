#!/bin/bash

echo "=== 测试消息API ==="
echo ""

SESSION_ID="test-full-sse-$(date +%s)"

# 测试1: 获取消息历史（应为空）
echo "1. 获取消息历史..."
curl -s "http://localhost:5001/api/messages?sessionId=$SESSION_ID&limit=5"
echo ""
echo ""

# 测试2: 发送消息
echo "2. 发送消息..."
curl -s -X POST http://localhost:5001/api/messages \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"content\": \"测试消息\",
    \"senderType\": \"user\",
    \"senderName\": \"测试用户\",
    \"robotId\": \"default-robot\"
  }"
echo ""
echo ""

# 等待1秒让触发器发送通知
sleep 1

# 测试3: 获取消息历史
echo "3. 获取消息历史..."
curl -s "http://localhost:5001/api/messages?sessionId=$SESSION_ID&limit=5"
echo ""
echo ""

echo "=== 测试完成 ==="

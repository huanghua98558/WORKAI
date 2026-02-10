#!/bin/bash

echo "=== 测试完整SSE流程 ==="
echo ""

SESSION_ID="test-sse-full-$(date +%s)"

# 1. 启动SSE监听（后台运行）
echo "1. 启动SSE监听..."
curl -sN "http://localhost:5001/api/sse/messages?sessionId=$SESSION_ID" > /tmp/sse-output.txt 2>&1 &
SSE_PID=$!
echo "   SSE进程ID: $SSE_PID"

# 等待SSE连接建立
sleep 2

# 2. 发送消息
echo "2. 发送消息..."
curl -s -X POST http://localhost:5001/api/messages \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"content\": \"SSE实时推送测试\",
    \"senderType\": \"user\",
    \"senderName\": \"测试用户\",
    \"robotId\": \"default-robot\"
  }"
echo ""

# 等待SSE接收消息
sleep 2

# 3. 停止SSE监听
echo "3. 停止SSE监听..."
kill $SSE_PID 2>/dev/null
wait $SSE_PID 2>/dev/null

# 4. 查看SSE输出
echo ""
echo "4. SSE输出:"
echo "-------------"
cat /tmp/sse-output.txt
echo "-------------"
echo ""

# 5. 检查是否收到消息
echo "5. 检查结果..."
if grep -q "SSE实时推送测试" /tmp/sse-output.txt; then
    echo "✅ SSE推送成功！收到消息。"
else
    echo "❌ SSE推送失败！未收到消息。"
fi

# 清理
rm -f /tmp/sse-output.txt

echo ""
echo "=== 测试完成 ==="

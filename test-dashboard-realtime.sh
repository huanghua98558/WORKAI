#!/bin/bash

echo "=== 测试仪表盘实时消息推送 ==="
echo ""

# 1. 启动SSE监听（全局消息）
echo "1. 启动SSE监听（全局消息）..."
curl -sN "http://localhost:5001/api/sse/messages" > /tmp/dashboard-sse.txt 2>&1 &
SSE_PID=$!
echo "   SSE进程ID: $SSE_PID"

# 等待SSE连接建立
sleep 2

# 2. 发送多条消息到不同会话
echo ""
echo "2. 发送测试消息..."
for i in {1..5}; do
  SESSION_ID="dashboard-test-session-$i"
  echo "   发送消息到会话: $SESSION_ID"
  curl -s -X POST http://localhost:5001/api/messages \
    -H "Content-Type: application/json" \
    -d "{
      \"sessionId\": \"$SESSION_ID\",
      \"content\": \"仪表盘实时测试消息 $i\",
      \"senderType\": \"user\",
      \"senderName\": \"测试用户\",
      \"senderId\": \"user-$i\",
      \"robotId\": \"default-robot\"
    }" > /dev/null
  
  # 间隔200ms
  sleep 0.2
done

# 等待SSE接收消息
sleep 3

# 3. 停止SSE监听
echo ""
echo "3. 停止SSE监听..."
kill $SSE_PID 2>/dev/null
wait $SSE_PID 2>/dev/null

# 4. 查看SSE输出
echo ""
echo "4. SSE输出（前20行）:"
echo "-------------"
head -20 /tmp/dashboard-sse.txt
echo "-------------"
echo ""

# 5. 检查是否收到消息
echo "5. 检查结果..."
MESSAGE_COUNT=$(grep -c "仪表盘实时测试消息" /tmp/dashboard-sse.txt || echo "0")
echo "   收到消息数: $MESSAGE_COUNT"

if [ "$MESSAGE_COUNT" -ge 5 ]; then
    echo "   ✅ SSE推送成功！所有消息已接收。"
else
    echo "   ❌ SSE推送失败！只收到 $MESSAGE_COUNT 条消息。"
fi

# 清理
rm -f /tmp/dashboard-sse.txt

echo ""
echo "=== 测试完成 ==="
echo ""
echo "下一步："
echo "1. 访问 http://localhost:5000/new-dashboard"
echo "2. 查看'实时会话'区域是否显示'实时'徽章"
echo "3. 观察会话列表是否实时更新"

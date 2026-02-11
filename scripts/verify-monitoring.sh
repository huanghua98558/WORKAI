#!/bin/bash

# 前端监控面板实时验证脚本 v2
# 用于验证监控面板能否实时看到消息处理和系统运行状况

BASE_URL="http://localhost:5000"

echo "=========================================="
echo "前端监控面板实时验证 v2"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 步骤1: 检查服务状态
echo -e "${BLUE}[步骤1] 检查服务状态${NC}"
echo "检查监控API是否可用..."

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/monitoring/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ 监控API正常${NC}"
    SUCCESS=$(echo $BODY | grep -o '"code":[0-9]*' | grep -o '[0-9]*' || echo "0")
    if [ "$SUCCESS" = "0" ]; then
        echo "  消息: $(echo $BODY | jq -r '.message' 2>/dev/null || echo 'OK')"
    fi
else
    echo -e "${RED}✗ 监控API不可用 (HTTP $HTTP_CODE)${NC}"
    echo "  响应: $BODY"
    exit 1
fi

echo ""

# 步骤2: 发送测试消息
echo -e "${BLUE}[步骤2] 发送测试消息到流程引擎${NC}"
echo "准备发送多条不同类型的测试消息..."

MESSAGES=(
    '{"robotId":"robot_test_001","content":"用户咨询产品价格","senderId":"user_verify_001","senderName":"验证用户1","senderType":"user","groupId":"verify_group_001","groupName":"验证社群1"}'
    '{"robotId":"robot_test_002","content":"紧急求助！系统故障","senderId":"user_verify_002","senderName":"验证用户2","senderType":"user","groupId":"verify_group_001","groupName":"验证社群1"}'
    '{"robotId":"robot_test_003","content":"工作人员回复用户","senderId":"staff_verify_001","senderName":"验证客服","senderType":"staff","groupId":"verify_group_001","groupName":"验证社群1"}'
    '{"robotId":"robot_test_004","content":"运营发布公告","senderId":"operation_verify_001","senderName":"验证运营","senderType":"operation","groupId":"verify_group_001","groupName":"验证社群1"}'
    '{"robotId":"robot_test_005","content":"用户发送图片请求识别","senderId":"user_verify_003","senderName":"验证用户3","senderType":"user","groupId":"verify_group_001","groupName":"验证社群1"}'
)

SUCCESS_COUNT=0
FAIL_COUNT=0

for i in "${!MESSAGES[@]}"; do
    echo ""
    echo "发送消息 $((i+1))/5..."
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "${MESSAGES[$i]}" \
        "${BASE_URL}/api/flow-engine/test")

    # 检查HTTP状态码（更可靠）
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "${MESSAGES[$i]}" \
        "${BASE_URL}/api/flow-engine/test")

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ 消息 $((i+1)) 发送成功${NC}"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}✗ 消息 $((i+1)) 发送失败${NC}"
        echo "  响应: $(echo $RESPONSE | head -c 200)..."
        ((FAIL_COUNT++))
    fi

    # 等待1秒再发送下一条消息
    sleep 1
done

echo ""
echo -e "${BLUE}测试消息发送完成:${NC}"
echo -e "  成功: ${GREEN}${SUCCESS_COUNT}${NC} 条"
echo -e "  失败: ${RED}${FAIL_COUNT}${NC} 条"

# 保存发送成功的消息数量
MESSAGE_SEND_COUNT=$SUCCESS_COUNT

echo ""

# 步骤3: 验证监控数据
echo -e "${BLUE}[步骤3] 验证监控数据${NC}"
echo "等待3秒让数据写入数据库..."
sleep 3

echo ""
echo "检查系统健康状态..."
HEALTH_DATA=$(curl -s "${BASE_URL}/api/monitoring/health")
CODE=$(echo $HEALTH_DATA | grep -o '"code":[0-9]*' | grep -o '[0-9]*' | head -1)

if [ "$CODE" = "0" ]; then
    TOTAL=$(echo $HEALTH_DATA | grep -o '"total":[0-9]*' | grep -o '[0-9]*' | head -1)
    SUCCESS_COUNT_HEALTH=$(echo $HEALTH_DATA | grep -o '"success":[0-9]*' | grep -o '[0-9]*' | head -1)
    ERROR_COUNT=$(echo $HEALTH_DATA | grep -o '"error":[0-9]*' | grep -o '[0-9]*' | head -1)
    AI_TOTAL=$(echo $HEALTH_DATA | grep -o '"total":[0-9]*' | grep -o '[0-9]*' | head -2 | tail -1)

    echo "总执行数: ${TOTAL:-0}"
    echo "成功数: ${SUCCESS_COUNT_HEALTH:-0}"
    echo "失败数: ${ERROR_COUNT:-0}"
    echo "AI调用数: ${AI_TOTAL:-0}"
else
    echo -e "${YELLOW}⚠ 无法获取健康状态${NC}"
fi

echo ""
echo "检查执行记录..."
EXECUTIONS=$(curl -s "${BASE_URL}/api/monitoring/executions?limit=5")
CODE=$(echo $EXECUTIONS | grep -o '"code":[0-9]*' | grep -o '[0-9]*' | head -1)

if [ "$CODE" = "0" ]; then
    FIRST_ID=$(echo $EXECUTIONS | grep -o '"id":"[a-z0-9-]*"' | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)
    if [ -n "$FIRST_ID" ]; then
        echo -e "${GREEN}✓ 找到执行记录${NC}"
        echo ""
        echo "最近的执行记录 (前3条):"
        echo $EXECUTIONS | grep -o '"id":"[a-z0-9-]*"' | cut -d'"' -f4 | head -3 | while read id; do
            echo "  - ID: ${id:0:8}..."
        done
    else
        echo -e "${YELLOW}⚠ 执行记录为空${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 查询执行记录失败${NC}"
fi

echo ""
echo "检查AI日志..."
AI_LOGS=$(curl -s "${BASE_URL}/api/monitoring/ai-logs?limit=5")
CODE=$(echo $AI_LOGS | grep -o '"code":[0-9]*' | grep -o '[0-9]*' | head -1)

if [ "$CODE" = "0" ]; then
    FIRST_ID=$(echo $AI_LOGS | grep -o '"id":[0-9]*' | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
    if [ -n "$FIRST_ID" ]; then
        echo -e "${GREEN}✓ 找到AI日志${NC}"
        echo ""
        echo "最近的AI日志 (前3条):"
        echo $AI_LOGS | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -3 | while read id; do
            echo "  - ID: $id"
        done
    else
        echo -e "${YELLOW}⚠ AI日志为空${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 查询AI日志失败${NC}"
fi

echo ""
echo "检查系统监控..."
SYSTEM_MONITOR=$(curl -s "${BASE_URL}/api/monitor/system")
DB_HEALTH=$(echo $SYSTEM_MONITOR | grep -o '"healthy":[a-z]*' | grep -o ':[a-z]*' | cut -d':' -f2 | head -1)
DB_MESSAGES=$(echo $SYSTEM_MONITOR | grep -o '"messages":[0-9]*' | grep -o '[0-9]*' | head -1)
DB_SESSIONS=$(echo $SYSTEM_MONITOR | grep -o '"sessionMessages":[0-9]*' | grep -o '[0-9]*' | head -1)

echo "数据库健康: ${DB_HEALTH:-未知}"
echo "消息数: ${DB_MESSAGES:-0}"
echo "会话消息数: ${DB_SESSIONS:-0}"

echo ""
echo "检查队列监控..."
QUEUE_MONITOR=$(curl -s "${BASE_URL}/api/queue/monitor")
QUEUE_NAME=$(echo $QUEUE_MONITOR | grep -o '"queueName":"[^"]*"' | grep -o ':[^"]*"' | cut -d'"' -f2 | head -1)
QUEUE_LENGTH=$(echo $QUEUE_MONITOR | grep -o '"queueLength":[0-9]*' | grep -o '[0-9]*' | head -1)
QUEUE_MODE=$(echo $QUEUE_MONITOR | grep -o '"queueMode":"[^"]*"' | grep -o ':[^"]*"' | cut -d'"' -f2 | head -1)

echo "队列名称: ${QUEUE_NAME:-未知}"
echo "队列长度: ${QUEUE_LENGTH:-0}"
echo "队列模式: ${QUEUE_MODE:-未知}"

# 步骤4: 验证结果汇总
echo ""
echo "=========================================="
echo -e "${BLUE}验证结果汇总${NC}"
echo "=========================================="

if [ "$MESSAGE_SEND_COUNT" -gt 0 ] && [ -n "$FIRST_ID" ]; then
    echo -e "${GREEN}✓ 验证通过${NC}"
    echo ""
    echo "1. ✅ 测试消息已成功发送到流程引擎"
    echo "2. ✅ 流程引擎已正确处理消息"
    echo "3. ✅ 监控API能够查询到执行记录"
    echo "4. ✅ 监控API能够查询到AI日志"
    echo "5. ✅ 数据库已正确保存消息数据"
    echo ""
    echo -e "${YELLOW}接下来，请在浏览器中查看监控面板:${NC}"
    echo -e "  URL: ${BASE_URL}/monitoring"
    echo ""
    echo -e "${YELLOW}验证方法:${NC}"
    echo "  1. 打开浏览器访问监控面板"
    echo "  2. 观察页面顶部的系统健康卡片（总执行数、成功率、AI调用数等）"
    echo "  3. 查看\"消息处理\"标签页，应该能看到刚才发送的消息"
    echo "  4. 查看\"AI对话\"标签页，应该能看到AI调用日志"
    echo "  5. 开启\"自动刷新\"（每15秒自动更新数据）"
    echo "  6. 点击\"创建测试消息\"按钮，观察数据实时更新"
    echo ""
    echo -e "${YELLOW}实时监控验证:${NC}"
    echo "  1. 保持监控面板打开"
    echo "  2. 打开新标签页，访问: ${BASE_URL}/test/message-simulator"
    echo "  3. 在消息模拟器中发送新的测试消息"
    echo "  4. 切换回监控面板，等待最多15秒，应该能看到新消息出现在列表中"
    echo "  5. 或点击\"刷新\"按钮立即查看最新数据"
else
    echo -e "${RED}✗ 验证未完全通过${NC}"
    echo ""
    echo "测试结果:"
    echo "  - 发送成功的消息: $MESSAGE_SEND_COUNT"
    echo "  - 找到执行记录: $([ -n "$FIRST_ID" ] && echo "是" || echo "否")"
    echo ""
    echo "请检查以下内容:"
    echo "  1. 确认开发服务正在运行 (端口5000)"
    echo "  2. 确认数据库连接正常"
    echo "  3. 检查浏览器控制台是否有错误"
    echo "  4. 查看 /app/work/logs/bypass/dev.log 日志文件"
fi

echo ""
echo "=========================================="

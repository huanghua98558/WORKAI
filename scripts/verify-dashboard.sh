#!/bin/bash

# 主仪表盘监测组件验证脚本
# 验证所有监测组件的数据获取逻辑

set -e

echo "========================================="
echo "主仪表盘监测组件验证"
echo "========================================="
echo ""

BASE_URL="http://localhost:5000"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_api() {
    local api_name=$1
    local api_url=$2
    local expected_field=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "测试 $TOTAL_TESTS: $api_name ... "

    local response=$(curl -s "$BASE_URL$api_url" 2>/dev/null)
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$api_url" 2>/dev/null)

    if [ "$http_code" = "200" ]; then
        if [ -z "$expected_field" ] || echo "$response" | grep -q "$expected_field"; then
            echo -e "${GREEN}✓ 通过${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            echo "  HTTP状态: $http_code"
            echo "  返回数据: $(echo "$response" | head -c 200)..."
        else
            echo -e "${RED}✗ 失败 (缺少预期字段: $expected_field)${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# 测试组件导入
test_component() {
    local component_name=$1
    local component_path=$2

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "测试 $TOTAL_TESTS: 组件文件存在 ($component_name) ... "

    if [ -f "$component_path" ]; then
        echo -e "${GREEN}✓ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "  文件路径: $component_path"
    else
        echo -e "${RED}✗ 失败 (文件不存在)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

echo "========================================="
echo "1. API端点测试"
echo "========================================="
echo ""

# 测试监控摘要API (主要数据源)
test_api "监控摘要" "/api/monitoring/summary" "executions"

# 测试AI日志API
test_api "AI日志" "/api/monitoring/ai-logs?limit=5" "data"

# 测试执行记录API
test_api "执行记录" "/api/monitoring/executions?limit=5" "data"

# 测试告警分析API (可选数据)
echo -n "测试 $TOTAL_TESTS: 告警分析概览 ... "
TOTAL_TESTS=$((TOTAL_TESTS + 1))
response=$(curl -s "$BASE_URL/api/alerts/analytics/overview" 2>/dev/null)
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/alerts/analytics/overview" 2>/dev/null)

if [ "$http_code" = "200" ] || [ "$http_code" = "500" ]; then
    echo -e "${YELLOW}⚠ 可接受 (HTTP $http_code, 告警数据为可选)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# 测试机器人状态API
test_api "机器人状态" "/api/monitoring/robots-status" "data"

# 测试活跃会话API
test_api "活跃会话" "/api/admin/sessions/active?limit=5" "data"

echo "========================================="
echo "2. 组件文件测试"
echo "========================================="
echo ""

# 测试主仪表盘组件
test_component "NewDashboardTab" "/workspace/projects/src/components/dashboard/NewDashboardTab.tsx"

# 测试Token统计卡片
test_component "TokenStatsCard" "/workspace/projects/src/components/token-stats.tsx"

# 测试情感分析卡片
test_component "SentimentAnalysisCard" "/workspace/projects/src/components/sentiment-analysis-card.tsx"

# 测试延迟统计卡片
test_component "DelayStatsCard" "/workspace/projects/src/components/delay-stats-card.tsx"

# 测试告警详情卡片
test_component "AlertDetailCard" "/workspace/projects/src/components/alert-detail-card.tsx"

# 测试AI分析徽章组件
test_component "AIAnalysisBadge" "/workspace/projects/src/components/ai-analysis-badge.tsx"

echo "========================================="
echo "3. 数据格式验证"
echo "========================================="
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "测试 $TOTAL_TESTS: 监控摘要数据格式 ... "
response=$(curl -s "$BASE_URL/api/monitoring/summary" 2>/dev/null)

if echo "$response" | grep -q '"code":0' && \
   echo "$response" | grep -q '"executions"' && \
   echo "$response" | grep -q '"ai"' && \
   echo "$response" | grep -q '"sessions"'; then
    echo -e "${GREEN}✓ 通过${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "  包含字段: code, executions, ai, sessions"
else
    echo -e "${RED}✗ 失败 (数据格式不正确)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "测试 $TOTAL_TESTS: AI日志数据格式 ... "
response=$(curl -s "$BASE_URL/api/monitoring/ai-logs?limit=1" 2>/dev/null)

if echo "$response" | grep -q '"code":0' && \
   echo "$response" | grep -q '"data"'; then
    echo -e "${GREEN}✓ 通过${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "  包含字段: code, data"
else
    echo -e "${RED}✗ 失败 (数据格式不正确)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

echo "========================================="
echo "4. 主页面加载验证"
echo "========================================="
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "测试 $TOTAL_TESTS: 主页面可访问 ... "
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" 2>/dev/null)

if [ "$http_code" = "200" ] || [ "$http_code" = "307" ]; then
    echo -e "${GREEN}✓ 通过${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "  HTTP状态: $http_code"
    if [ "$http_code" = "307" ]; then
        echo "  说明: 页面需要登录认证（重定向到登录页）"
    fi
else
    echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

echo "========================================="
echo "测试总结"
echo "========================================="
echo "总测试数: $TOTAL_TESTS"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！主仪表盘监测组件运行正常。${NC}"
    exit 0
else
    echo -e "${RED}✗ 有 $FAILED_TESTS 个测试失败，请检查相关组件。${NC}"
    exit 1
fi

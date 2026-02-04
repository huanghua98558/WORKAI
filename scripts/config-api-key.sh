#!/bin/bash

# API Key快速配置和测试脚本
# 用于快速配置和验证AI提供商的API Key

echo "======================================"
echo "  WorkTool AI - API Key 快速配置工具"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查服务是否运行
echo "🔍 检查服务状态..."
if curl -s http://localhost:5001/api/ai/providers > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端服务运行正常${NC}"
else
    echo -e "${RED}❌ 后端服务未运行，请先启动服务${NC}"
    exit 1
fi

# 显示当前提供商配置
echo ""
echo "📋 当前提供商配置："
curl -s http://localhost:5001/api/ai/providers | grep -E '"displayName"|"apiKey"' | sed 's/,$//'

# 配置菜单
echo ""
echo "======================================"
echo "  请选择要配置的提供商："
echo "======================================"
echo "1. 豆包 (doubao)"
echo "2. DeepSeek"
echo "3. Kimi"
echo "4. 测试所有API Key"
echo "5. 查看使用统计"
echo "6. 查看保护机制状态"
echo "0. 退出"
echo ""
read -p "请输入选项 [0-6]: " choice

case $choice in
    1)
        echo ""
        echo "配置豆包API Key..."
        read -p "请输入API Key: " api_key
        read -p "API端点 (默认: https://ark.cn-beijing.volces.com/api/v3): " api_endpoint
        api_endpoint=${api_endpoint:-"https://ark.cn-beijing.volces.com/api/v3"}

        # 获取豆包提供商ID
        provider_id=$(curl -s http://localhost:5001/api/ai/providers | grep -oP '"id":"[^"]*"(?=.*"name":"doubao")' | head -1 | cut -d'"' -f4)

        # 更新API Key
        response=$(curl -s -X PUT "http://localhost:5001/api/ai/providers/$provider_id" \
            -H "Content-Type: application/json" \
            -d "{\"apiKey\":\"$api_key\",\"apiEndpoint\":\"$api_endpoint\"}")

        echo "$response" | grep -q '"success":true'
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 豆包API Key配置成功${NC}"

            # 测试API Key
            echo "测试API Key..."
            test_response=$(curl -s -X POST "http://localhost:5001/api/ai/providers/$provider_id/test")
            echo "$test_response" | grep -q '"success":true'
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ API Key测试通过${NC}"
            else
                echo -e "${RED}❌ API Key测试失败，请检查API Key是否正确${NC}"
            fi
        else
            echo -e "${RED}❌ API Key配置失败${NC}"
            echo "$response"
        fi
        ;;

    2)
        echo ""
        echo "配置DeepSeek API Key..."
        read -p "请输入API Key: " api_key
        read -p "API端点 (默认: https://api.deepseek.com/v1): " api_endpoint
        api_endpoint=${api_endpoint:-"https://api.deepseek.com/v1"}

        # 获取DeepSeek提供商ID
        provider_id=$(curl -s http://localhost:5001/api/ai/providers | grep -oP '"id":"[^"]*"(?=.*"name":"deepseek")' | head -1 | cut -d'"' -f4)

        # 更新API Key
        response=$(curl -s -X PUT "http://localhost:5001/api/ai/providers/$provider_id" \
            -H "Content-Type: application/json" \
            -d "{\"apiKey\":\"$api_key\",\"apiEndpoint\":\"$api_endpoint\"}")

        echo "$response" | grep -q '"success":true'
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ DeepSeek API Key配置成功${NC}"

            # 测试API Key
            echo "测试API Key..."
            test_response=$(curl -s -X POST "http://localhost:5001/api/ai/providers/$provider_id/test")
            echo "$test_response" | grep -q '"success":true'
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ API Key测试通过${NC}"
            else
                echo -e "${RED}❌ API Key测试失败，请检查API Key是否正确${NC}"
            fi
        else
            echo -e "${RED}❌ API Key配置失败${NC}"
            echo "$response"
        fi
        ;;

    3)
        echo ""
        echo "配置Kimi API Key..."
        read -p "请输入API Key: " api_key
        read -p "API端点 (默认: https://api.moonshot.cn/v1): " api_endpoint
        api_endpoint=${api_endpoint:-"https://api.moonshot.cn/v1"}

        # 获取Kimi提供商ID
        provider_id=$(curl -s http://localhost:5001/api/ai/providers | grep -oP '"id":"[^"]*"(?=.*"name":"kimi")' | head -1 | cut -d'"' -f4)

        # 更新API Key
        response=$(curl -s -X PUT "http://localhost:5001/api/ai/providers/$provider_id" \
            -H "Content-Type: application/json" \
            -d "{\"apiKey\":\"$api_key\",\"apiEndpoint\":\"$api_endpoint\"}")

        echo "$response" | grep -q '"success":true'
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Kimi API Key配置成功${NC}"

            # 测试API Key
            echo "测试API Key..."
            test_response=$(curl -s -X POST "http://localhost:5001/api/ai/providers/$provider_id/test")
            echo "$test_response" | grep -q '"success":true'
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ API Key测试通过${NC}"
            else
                echo -e "${RED}❌ API Key测试失败，请检查API Key是否正确${NC}"
            fi
        else
            echo -e "${RED}❌ API Key配置失败${NC}"
            echo "$response"
        fi
        ;;

    4)
        echo ""
        echo "🧪 测试所有API Key..."

        # 获取所有提供商
        providers=$(curl -s http://localhost:5001/api/ai/providers)
        provider_ids=$(echo "$providers" | grep -oP '"id":"[^"]*"' | cut -d'"' -f4)
        provider_names=$(echo "$providers" | grep -oP '"displayName":"[^"]*"' | cut -d'"' -f4)

        index=0
        for id in $provider_ids; do
            name=$(echo "$provider_names" | sed -n "$((index+1))p")
            echo ""
            echo "测试 $name..."

            test_response=$(curl -s -X POST "http://localhost:5001/api/ai/providers/$id/test")
            echo "$test_response" | grep -q '"success":true'
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ $name API Key正常${NC}"
            else
                echo -e "${RED}❌ $name API Key无效或未配置${NC}"
            fi
            index=$((index+1))
        done
        ;;

    5)
        echo ""
        echo "📊 使用统计："
        curl -s http://localhost:5001/api/ai/usage/stats | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5001/api/ai/usage/stats
        ;;

    6)
        echo ""
        echo "🛡️ 保护机制状态："
        curl -s http://localhost:5001/api/ai/protection/stats | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5001/api/ai/protection/stats
        ;;

    0)
        echo ""
        echo "👋 退出"
        exit 0
        ;;

    *)
        echo ""
        echo -e "${RED}❌ 无效选项${NC}"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "  操作完成"
echo "======================================"

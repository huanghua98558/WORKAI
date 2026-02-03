#!/bin/bash

# 回调配置诊断脚本
# 用于检查 WorkTool 机器人回调配置是否正确

echo "=================================================="
echo "🔍 WorkTool 回调配置诊断工具"
echo "=================================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取部署域名
echo "请输入部署域名（例如：https://your-domain.com）："
read DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}错误：域名不能为空${NC}"
    exit 1
fi

echo ""
echo "=================================================="
echo "📊 诊断结果"
echo "=================================================="
echo ""

# 1. 检查域名格式
echo "1️⃣ 检查域名格式..."
if [[ $DOMAIN =~ ^https?:// ]]; then
    echo -e "${GREEN}✅ 域名格式正确${NC}"
else
    echo -e "${RED}❌ 域名格式错误，请以 http:// 或 https:// 开头${NC}"
    exit 1
fi

# 2. 检查是否包含端口
if [[ $DOMAIN == *:* ]] && [[ $DOMAIN != *:[0-9]*/ ]]; then
    PORT=$(echo $DOMAIN | grep -oP ':\K[0-9]+')
    echo -e "${YELLOW}⚠️  检测到端口：${PORT}${NC}"
    echo -e "   如果使用 Next.js 代理，建议使用标准端口（80/443）"
fi

# 3. 测试路由是否可访问
echo ""
echo "2️⃣ 测试回调路由是否可访问..."

# 测试消息回调路由
CALLBACK_URL="${DOMAIN}/api/worktool/callback/message?robotId=test"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${CALLBACK_URL}")

if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✅ 消息回调路由正常（HTTP ${HTTP_CODE}）${NC}"
    echo -e "   预期：403（签名验证失败）或 400（参数错误）"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}❌ 消息回调路由不存在（404 Not Found）${NC}"
    echo -e "   可能原因："
    echo -e "   1. Next.js 代理配置未生效"
    echo -e "   2. 前端项目未重新构建"
    echo -e "   3. 路由配置错误"
else
    echo -e "${YELLOW}⚠️  消息回调路由返回异常（HTTP ${HTTP_CODE}）${NC}"
fi

# 4. 生成正确的回调地址
echo ""
echo "3️⃣ 生成正确的回调地址..."

ROBOT_ID="wt22phhjpt2xboerspxsote472xdnyq2"

echo ""
echo -e "${GREEN}正确的回调地址配置：${NC}"
echo ""
echo "消息回调："
echo "  ${DOMAIN}/api/worktool/callback/message"
echo ""
echo "指令结果回调："
echo "  ${DOMAIN}/api/worktool/callback/result"
echo ""
echo "群二维码回调："
echo "  ${DOMAIN}/api/worktool/callback/qrcode"
echo ""
echo "机器人状态回调："
echo "  ${DOMAIN}/api/worktool/callback/status"
echo ""
echo "注意：WorkTool 系统会自动添加 ?robotId={robotId} 参数"

# 5. 检查环境变量
echo ""
echo "4️⃣ 检查环境变量配置..."

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ 找到 .env.local 文件${NC}"

    # 检查 BACKEND_URL
    if grep -q "BACKEND_URL=" .env.local; then
        BACKEND_URL=$(grep "BACKEND_URL=" .env.local | cut -d'=' -f2)
        echo -e "   BACKEND_URL: ${BACKEND_URL}"
        if [[ $BACKEND_URL == *localhost* ]]; then
            echo -e "   ${YELLOW}⚠️  检测到 localhost，部署环境需要修改${NC}"
        fi
    else
        echo -e "   ${YELLOW}⚠️  未找到 BACKEND_URL${NC}"
    fi

    # 检查 CALLBACK_BASE_URL
    if grep -q "CALLBACK_BASE_URL=" .env.local; then
        CALLBACK_BASE_URL=$(grep "CALLBACK_BASE_URL=" .env.local | cut -d'=' -f2)
        echo -e "   CALLBACK_BASE_URL: ${CALLBACK_BASE_URL}"
    else
        echo -e "   ${YELLOW}⚠️  未找到 CALLBACK_BASE_URL${NC}"
    fi
else
    echo -e "${RED}❌ 未找到 .env.local 文件${NC}"
fi

# 6. 检查 Next.js 配置
echo ""
echo "5️⃣ 检查 Next.js 代理配置..."

if [ -f "next.config.ts" ]; then
    if grep -q "api/worktool/callback" next.config.ts; then
        echo -e "${GREEN}✅ Next.js 代理配置已添加${NC}"
    else
        echo -e "${RED}❌ Next.js 代理配置未找到${NC}"
        echo -e "   需要在 next.config.ts 中添加代理配置"
    fi
else
    echo -e "${RED}❌ 未找到 next.config.ts 文件${NC}"
fi

# 7. 提供建议
echo ""
echo "=================================================="
echo "💡 建议和后续步骤"
echo "=================================================="
echo ""

if [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}需要执行以下操作：${NC}"
    echo ""
    echo "1. 重新构建项目："
    echo "   pnpm build"
    echo ""
    echo "2. 重新部署应用"
    echo ""
    echo "3. 在 WorkTool 管理后台更新机器人回调地址："
    echo "   消息回调：${DOMAIN}/api/worktool/callback/message"
    echo ""
else
    echo -e "${GREEN}回调路由配置正常！${NC}"
    echo ""
    echo "在 WorkTool 管理后台配置机器人回调地址："
    echo "   消息回调：${DOMAIN}/api/worktool/callback/message"
    echo "   指令结果回调：${DOMAIN}/api/worktool/callback/result"
    echo ""
fi

echo "4. 测试回调功能："
echo "   在 WorkTool 机器人所在群发送一条消息"
echo ""
echo "5. 查看后端日志："
echo "   tail -f logs/backend.log"
echo ""
echo "6. 查看回调历史："
echo "   在管理后台 > 运维日志 > 回调日志"
echo ""

echo "=================================================="
echo "✨ 诊断完成"
echo "=================================================="

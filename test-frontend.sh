#!/bin/bash

# 前端自动化测试运行脚本

echo "=========================================="
echo "  WorkTool AI 前端自动化测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否安装了 Playwright
if ! command -v npx &> /dev/null; then
    echo -e "${RED}错误: 未找到 npx 命令${NC}"
    exit 1
fi

# 检查 Playwright 是否已安装
if [ ! -d "node_modules/@playwright" ]; then
    echo -e "${YELLOW}正在安装 Playwright 浏览器...${NC}"
    npx playwright install --with-deps
fi

# 创建测试结果目录
mkdir -p test-results
mkdir -p playwright-report

# 运行测试
echo -e "${GREEN}开始运行测试...${NC}"
echo ""

# 运行所有测试
npx playwright test

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "  测试完成！所有测试通过"
    echo "==========================================${NC}"
    echo ""
    echo "查看测试报告: npx playwright show-report"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo "  测试完成！存在失败的测试"
    echo "==========================================${NC}"
    echo ""
    echo "查看测试报告: npx playwright show-report"
    echo ""
fi

# 生成详细的测试报告
echo "正在生成详细测试报告..."
node scripts/generate-test-report.js

echo ""
echo "测试报告已生成:"
echo "  - HTML 报告: playwright-report/index.html"
echo "  - JSON 报告: test-results.json"
echo "  - 详细报告: test-report-detailed.html"
echo ""

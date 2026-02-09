# 🚀 WorkTool AI 前端自动化测试

> 完整的前端自动化测试套件，覆盖所有页面和交互功能

## ✨ 特性

- ✅ **全面覆盖**: 9个测试文件，91个测试用例
- 🌐 **多浏览器**: 支持 Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- 📊 **详细报告**: 自动生成 HTML, JSON 报告
- 🎯 **易于使用**: 一键运行脚本
- 🔧 **可扩展**: 易于添加新的测试用例

## 📦 安装

### 1. 安装依赖

```bash
pnpm install
```

### 2. 安装 Playwright 浏览器

```bash
pnpm run test:install
```

或

```bash
npx playwright install --with-deps
```

## 🎯 快速开始

### 方式一：一键运行（推荐）

```bash
./test-frontend.sh
```

### 方式二：使用 npm 脚本

```bash
# 运行所有测试
pnpm run test

# 运行快速验证测试
npx playwright test tests/e2e/quick-validation.spec.ts

# UI 模式运行
pnpm run test:ui

# 调试模式
pnpm run test:debug

# 查看测试报告
pnpm run test:report
```

## 📊 测试覆盖

### 测试模块

| 模块 | 测试文件 | 测试用例 |
|------|---------|---------|
| 首页标签页 | `home-tabs.spec.ts` | 10 |
| 机器人管理 | `robot-management.spec.ts` | 8 |
| 会话管理 | `session-management.spec.ts` | 10 |
| AI模块 | `ai-module.spec.ts` | 10 |
| 流程引擎 | `flow-engine.spec.ts` | 9 |
| 监控告警 | `monitoring.spec.ts` | 10 |
| 系统设置 | `system-settings.spec.ts` | 10 |
| 仪表盘 | `dashboard.spec.ts` | 12 |
| 协同分析 | `collab-analytics.spec.ts` | 12 |
| 快速验证 | `quick-validation.spec.ts` | 4 |

**总计**: 10 个文件，95 个测试用例

## 📈 测试报告

运行测试后，会自动生成以下报告：

1. **HTML 报告**: `playwright-report/index.html`
   - 详细的测试结果和截图

2. **JSON 报告**: `test-results.json`
   - 机器可读的测试结果

3. **详细报告**: `test-report-detailed.html`
   - 自定义的 HTML 报告，包含统计和可视化

### 查看报告

```bash
# 在浏览器中打开报告
pnpm run test:report

# 或直接打开 HTML 文件
open playwright-report/index.html
open test-report-detailed.html
```

## 🔧 高级用法

### 运行特定测试

```bash
# 运行特定测试文件
npx playwright test tests/e2e/home-tabs.spec.ts

# 运行特定测试用例
npx playwright test -g "首页加载测试"

# 运行失败的测试
npx playwright test --only-failed
```

### 调试测试

```bash
# 使用调试模式
pnpm run test:debug

# 或使用代码调试
await page.pause();
```

### 并发运行

```bash
# 设置并发数
npx playwright test --workers=4
```

### 在特定浏览器中运行

```bash
# 只在 Chrome 中运行
npx playwright test --project=chromium

# 只在 Firefox 中运行
npx playwright test --project=firefox
```

## 📝 编写新测试

### 创建测试文件

```typescript
import { test, expect } from '@playwright/test';

test.describe('新功能测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('测试用例名称', async ({ page }) => {
    // 测试逻辑
    await expect(page.locator('.element')).toBeVisible();
  });
});
```

### 最佳实践

1. **使用 `describe` 组织测试**
2. **使用 `beforeEach` 设置初始状态**
3. **使用 `expect` 断言**
4. **添加详细的测试描述**

详细文档请查看 [TESTING.md](./TESTING.md)

## 🐛 故障排除

### 浏览器未安装

```bash
npx playwright install --with-deps
```

### 测试超时

增加超时时间：

```typescript
test.setTimeout(120000);
```

### 元素找不到

增加等待时间：

```typescript
await page.waitForTimeout(2000);
await page.waitForSelector('.element');
```

## 📚 相关文档

- [详细测试文档](./TESTING.md)
- [Playwright 官方文档](https://playwright.dev)
- [测试配置](./playwright.config.ts)

## 🤝 贡献

欢迎提交新的测试用例和改进建议！

## 📄 许可证

MIT License

---

**注意**: 首次运行测试前，请确保后端服务已启动（`pnpm run dev`）并且端口 5000 可用。

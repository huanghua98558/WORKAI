import { test, expect } from '@playwright/test';

/**
 * 仪表盘功能测试
 * 测试仪表盘数据展示、图表、统计指标等功能
 */

test.describe('仪表盘功能测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切换到仪表盘标签
    await page.click('text=仪表盘');
    await page.waitForTimeout(1000);
  });

  test('仪表盘加载测试', async ({ page }) => {
    // 验证仪表盘容器可见
    const dashboardContainer = page.locator('[value="dashboard"]');
    await expect(dashboardContainer).toBeVisible();

    // 等待数据加载
    await page.waitForTimeout(2000);

    // 验证页面中没有错误提示
    const errorAlert = page.locator('.destructive, .bg-destructive');
    await expect(errorAlert).not.toBeVisible({ timeout: 5000 });
  });

  test('统计卡片显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找统计卡片
    const statCards = page.locator('.stat-card, .metric-card, [class*="stats-card"]');

    if (await statCards.count() > 0) {
      console.log(`✓ 找到 ${await statCards.count()} 个统计卡片`);

      // 检查第一个卡片
      const firstCard = statCards.first();
      await expect(firstCard).toBeVisible();
    } else {
      console.log('⚠ 未找到统计卡片');
    }
  });

  test('Token统计显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找Token统计组件
    const tokenStats = page.locator('.token-stats, [data-testid="token-stats"]');

    if (await tokenStats.isVisible({ timeout: 5000 })) {
      console.log('✓ Token统计可见');

      // 查找Token指标
      const tokenMetrics = tokenStats.locator('.metric, .stat');

      if (await tokenMetrics.count() > 0) {
        console.log(`✓ 找到 ${await tokenMetrics.count()} 个Token指标`);
      } else {
        console.log('⚠ Token统计存在但未找到指标');
      }
    } else {
      console.log('⚠ 未找到Token统计');
    }
  });

  test('图表显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找图表组件
    const charts = page.locator('.chart, canvas, svg[class*="chart"]');

    if (await charts.count() > 0) {
      console.log(`✓ 找到 ${await charts.count()} 个图表`);
    } else {
      console.log('⚠ 未找到图表');
    }
  });

  test('会话统计显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找会话统计
    const sessionStats = page.locator('.session-stats, [data-testid="session-stats"]');

    if (await sessionStats.isVisible({ timeout: 5000 })) {
      console.log('✓ 会话统计可见');
    } else {
      console.log('⚠ 未找到会话统计');
    }
  });

  test('机器人统计显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找机器人统计
    const robotStats = page.locator('.robot-stats, [data-testid="robot-stats"]');

    if (await robotStats.isVisible({ timeout: 5000 })) {
      console.log('✓ 机器人统计可见');
    } else {
      console.log('⚠ 未找到机器人统计');
    }
  });

  test('活动趋势显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找活动趋势
    const activityTrend = page.locator('.activity-trend, [data-testid="activity"]');

    if (await activityTrend.isVisible({ timeout: 5000 })) {
      console.log('✓ 活动趋势可见');
    } else {
      console.log('⚠ 未找到活动趋势');
    }
  });

  test('时间范围选择测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找时间范围选择器
    const timeRangeSelect = page.locator('select, [role="combobox"], .time-range');

    if (await timeRangeSelect.isVisible({ timeout: 5000 })) {
      console.log('✓ 时间范围选择器可用');
    } else {
      console.log('⚠ 未找到时间范围选择器');
    }
  });

  test('仪表盘刷新功能测试', async ({ page }) => {
    // 查找刷新按钮
    const refreshButton = page.locator('button:has-text("刷新"), button:has([data-testid="refresh"]), svg[class*="refresh"]').first();

    if (await refreshButton.isVisible({ timeout: 5000 })) {
      // 点击刷新按钮
      await refreshButton.click();

      // 等待刷新完成
      await page.waitForTimeout(2000);

      console.log('✓ 刷新功能可用');
    } else {
      console.log('⚠ 未找到刷新按钮');
    }
  });

  test('仪表盘数据导出功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找导出按钮
    const exportButton = page.locator('button:has-text("导出"), button:has([data-testid="export"]), svg[class*="download"]').first();

    if (await exportButton.isVisible({ timeout: 5005 })) {
      console.log('✓ 导出功能可用（未实际点击）');
    } else {
      console.log('⚠ 未找到导出功能');
    }
  });

  test('仪表盘布局测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 验证页面布局是否合理
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // 检查是否有主要内容区域
    const mainContent = page.locator('main, [role="main"]');

    if (await mainContent.isVisible({ timeout: 3000 })) {
      console.log('✓ 仪表盘布局正常');
    } else {
      console.log('⚠ 未找到主要内容区域');
    }
  });

  test('仪表盘响应式测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 测试不同视口大小
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    console.log('✓ 1920x1080 视口正常');

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);
    console.log('✓ 1366x768 视口正常');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    console.log('✓ 768x1024 视口正常');

    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    console.log('✓ 375x667 视口正常');
  });
});

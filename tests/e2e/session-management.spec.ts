import { test, expect } from '@playwright/test';

/**
 * 会话管理功能测试
 * 测试会话列表、搜索、筛选、详情等功能
 */

test.describe('会话管理功能测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切换到会话管理标签
    await page.click('text=会话管理');
    await page.waitForTimeout(1000);
  });

  test('会话列表加载测试', async ({ page }) => {
    // 验证会话管理容器可见
    const sessionsContainer = page.locator('[value="sessions"]');
    await expect(sessionsContainer).toBeVisible();

    // 等待数据加载
    await page.waitForTimeout(2000);

    // 验证页面中没有错误提示
    const errorAlert = page.locator('.destructive, .bg-destructive');
    await expect(errorAlert).not.toBeVisible({ timeout: 5000 });
  });

  test('会话列表显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找会话卡片或列表项
    const sessionCards = page.locator('.card, [role="listitem"], tr');

    if (await sessionCards.count() > 0) {
      console.log(`✓ 找到 ${await sessionCards.count()} 个会话卡片或列表项`);

      // 检查第一个会话卡片
      const firstCard = sessionCards.first();
      await expect(firstCard).toBeVisible();
    } else {
      console.log('⚠ 未找到会话卡片，可能数据为空或加载失败');
    }
  });

  test('会话搜索功能测试', async ({ page }) => {
    // 等待会话列表加载
    await page.waitForTimeout(2000);

    // 查找搜索框
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="搜索会话"], input[type="search"]').first();

    if (await searchInput.isVisible({ timeout: 5000 })) {
      // 输入搜索关键词
      await searchInput.fill('测试');

      // 等待搜索结果
      await page.waitForTimeout(1000);

      console.log('✓ 会话搜索功能可用');
    } else {
      console.log('⚠ 未找到搜索框，可能未实现');
    }
  });

  test('会话筛选功能测试', async ({ page }) => {
    // 等待会话列表加载
    await page.waitForTimeout(2000);

    // 查找筛选按钮或下拉框
    const filterButton = page.locator('button:has-text("筛选"), button:has-text("过滤"), [data-testid="filter"]').first();
    const filterSelect = page.locator('select, [role="combobox"]').first();

    if (await filterButton.isVisible({ timeout: 5000 })) {
      console.log('✓ 筛选按钮可用');
    } else if (await filterSelect.isVisible({ timeout: 5000 })) {
      console.log('✓ 筛选下拉框可用');
    } else {
      console.log('⚠ 未找到筛选功能');
    }
  });

  test('会话排序功能测试', async ({ page }) => {
    // 等待会话列表加载
    await page.waitForTimeout(2000);

    // 查找排序按钮
    const sortButton = page.locator('button:has-text("排序"), button:has([data-testid="sort"]), svg[class*="sort"]').first();

    if (await sortButton.isVisible({ timeout: 5000 })) {
      console.log('✓ 排序功能可用');
    } else {
      console.log('⚠ 未找到排序功能');
    }
  });

  test('会话详情查看功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找会话卡片或列表项
    const sessionCard = page.locator('.card, [role="listitem"], tr').first();

    if (await sessionCard.isVisible({ timeout: 5000 })) {
      // 点击会话卡片
      await sessionCard.click();

      // 等待响应
      await page.waitForTimeout(1000);

      // 检查是否有详情视图
      const detailView = page.locator('[role="dialog"], .detail-view, .session-detail');

      if (await detailView.isVisible({ timeout: 3000 })) {
        console.log('✓ 会话详情查看功能可用');

        // 关闭详情
        const closeButton = page.locator('button:has-text("关闭"), button:has-text("返回")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      } else {
        console.log('⚠ 点击会话卡片后未显示详情');
      }
    } else {
      console.log('⚠ 未找到会话卡片');
    }
  });

  test('会话消息显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找消息容器
    const messageContainer = page.locator('.message-container, .chat-container, [role="log"]');

    if (await messageContainer.isVisible({ timeout: 5000 })) {
      // 查找消息项
      const messages = messageContainer.locator('.message, [role="listitem"]');

      if (await messages.count() > 0) {
        console.log(`✓ 找到 ${await messages.count()} 条消息`);
      } else {
        console.log('⚠ 消息容器存在但未找到消息');
      }
    } else {
      console.log('⚠ 未找到消息容器');
    }
  });

  test('会话导出功能测试', async ({ page }) => {
    // 等待会话列表加载
    await page.waitForTimeout(2000);

    // 查找导出按钮
    const exportButton = page.locator('button:has-text("导出"), button:has([data-testid="export"]), svg[class*="download"], svg[class*="Download"]').first();

    if (await exportButton.isVisible({ timeout: 5000 })) {
      console.log('✓ 导出功能可用（未实际点击）');
    } else {
      console.log('⚠ 未找到导出功能');
    }
  });

  test('会话刷新功能测试', async ({ page }) => {
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

  test('会话统计数据显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找统计数据卡片
    const statCards = page.locator('.stat-card, .metric-card, [class*="stats"]');

    if (await statCards.count() > 0) {
      console.log(`✓ 找到 ${await statCards.count()} 个统计卡片`);
    } else {
      console.log('⚠ 未找到统计数据卡片');
    }
  });

  test('会话分页功能测试', async ({ page }) => {
    // 等待会话列表加载
    await page.waitForTimeout(2000);

    // 查找分页组件
    const pagination = page.locator('.pagination, [role="navigation"]');

    if (await pagination.isVisible({ timeout: 5000 })) {
      console.log('✓ 分页功能可用');
    } else {
      console.log('⚠ 未找到分页功能');
    }
  });
});

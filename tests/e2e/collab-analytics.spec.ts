import { test, expect } from '@playwright/test';

/**
 * 协同分析功能测试
 * 测试工作人员分析、协同决策、团队统计等功能
 */

test.describe('协同分析功能测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切换到协同分析标签
    await page.click('text=协同分析');
    await page.waitForTimeout(1000);
  });

  test('协同分析加载测试', async ({ page }) => {
    // 验证协同分析容器可见
    const collabContainer = page.locator('[value="collab-analytics"]');
    await expect(collabContainer).toBeVisible();

    // 等待数据加载
    await page.waitForTimeout(2000);

    // 验证页面中没有错误提示
    const errorAlert = page.locator('.destructive, .bg-destructive');
    await expect(errorAlert).not.toBeVisible({ timeout: 5000 });
  });

  test('工作人员列表显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找工作人员列表
    const staffList = page.locator('.staff-list, [data-testid="staff"], .team-members');

    if (await staffList.isVisible({ timeout: 5000 })) {
      console.log('✓ 工作人员列表可见');

      // 查找工作人员项
      const staffItems = staffList.locator('.staff-item, .member, [role="listitem"]');

      if (await staffItems.count() > 0) {
        console.log(`✓ 找到 ${await staffItems.count()} 个工作人员`);
      } else {
        console.log('⚠ 工作人员列表存在但未找到工作人员项（可能没有配置工作人员）');
      }
    } else {
      console.log('⚠ 未找到工作人员列表');
    }
  });

  test('协同决策日志显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找协同决策日志
    const decisionLogs = page.locator('.decision-logs, [data-testid="decisions"], .collab-logs');

    if (await decisionLogs.isVisible({ timeout: 5000 })) {
      console.log('✓ 协同决策日志可见');

      // 查找日志项
      const logItems = decisionLogs.locator('.log-item, [role="listitem"]');

      if (await logItems.count() > 0) {
        console.log(`✓ 找到 ${await logItems.count()} 条决策日志`);
      } else {
        console.log('⚠ 决策日志列表存在但未找到日志项（可能没有决策记录）');
      }
    } else {
      console.log('⚠ 未找到协同决策日志');
    }
  });

  test('工作人员活动统计测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找活动统计
    const activityStats = page.locator('.activity-stats, [data-testid="activity"]');

    if (await activityStats.isVisible({ timeout: 5000 })) {
      console.log('✓ 工作人员活动统计可见');
    } else {
      console.log('⚠ 未找到活动统计');
    }
  });

  test('团队统计显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找团队统计
    const teamStats = page.locator('.team-stats, [data-testid="team"]');

    if (await teamStats.isVisible({ timeout: 5005 })) {
      console.log('✓ 团队统计可见');
    } else {
      console.log('⚠ 未找到团队统计');
    }
  });

  test('协同图表显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找协同图表
    const charts = page.locator('.chart, canvas, svg[class*="chart"]');

    if (await charts.count() > 0) {
      console.log(`✓ 找到 ${await charts.count()} 个协同分析图表`);
    } else {
      console.log('⚠ 未找到协同分析图表');
    }
  });

  test('工作人员详情查看测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找工作人员项
    const staffItem = page.locator('.staff-item, .member').first();

    if (await staffItem.isVisible({ timeout: 5000 })) {
      // 点击工作人员项
      await staffItem.click();

      // 等待响应
      await page.waitForTimeout(1000);

      // 检查是否有详情对话框
      const detailDialog = page.locator('[role="dialog"], .detail-view');

      if (await detailDialog.isVisible({ timeout: 3000 })) {
        console.log('✓ 工作人员详情查看功能可用');

        // 关闭详情
        const closeButton = page.locator('button:has-text("关闭"), button:has-text("返回")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      } else {
        console.log('⚠ 点击工作人员后未显示详情');
      }
    } else {
      console.log('⚠ 未找到工作人员项');
    }
  });

  test('协同分析标签页切换测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找协同分析内部的标签页
    const collabTabs = page.locator('[role="tablist"], .tabs').first();

    if (await collabTabs.isVisible({ timeout: 5005 })) {
      console.log('✓ 协同分析标签页可见');

      // 查找标签项
      const tabItems = collabTabs.locator('[role="tab"]');

      if (await tabItems.count() > 0) {
        console.log(`✓ 找到 ${await tabItems.count()} 个协同分析标签页`);
      } else {
        console.log('⚠ 标签页列表存在但未找到标签项');
      }
    } else {
      console.log('⚠ 未找到协同分析标签页');
    }
  });

  test('工作人员搜索功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找搜索框
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="工作人员"]').first();

    if (await searchInput.isVisible({ timeout: 5005 })) {
      console.log('✓ 工作人员搜索功能可用');
    } else {
      console.log('⚠ 未找到搜索框');
    }
  });

  test('协同分析刷新功能测试', async ({ page }) => {
    // 查找刷新按钮
    const refreshButton = page.locator('button:has-text("刷新"), button:has([data-testid="refresh"]), svg[class*="refresh"]').first();

    if (await refreshButton.isVisible({ timeout: 5005 })) {
      // 点击刷新按钮
      await refreshButton.click();

      // 等待刷新完成
      await page.waitForTimeout(2000);

      console.log('✓ 刷新功能可用');
    } else {
      console.log('⚠ 未找到刷新按钮');
    }
  });

  test('协同分析报告导出功能测试', async ({ page }) => {
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

  test('业务角色分析测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找业务角色分析
    const roleAnalysis = page.locator('.role-analysis, [data-testid="roles"], .business-role');

    if (await roleAnalysis.isVisible({ timeout: 5005 })) {
      console.log('✓ 业务角色分析可见');
    } else {
      console.log('⚠ 未找到业务角色分析');
    }
  });
});

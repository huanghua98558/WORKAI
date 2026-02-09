import { test, expect, Page } from '@playwright/test';

/**
 * 首页标签页测试
 * 测试所有标签页的加载和基本功能
 */

test.describe('首页标签页测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('首页加载测试', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/WorkTool AI/);

    // 验证页面主要内容可见
    await expect(page.locator('body')).toBeVisible();

    // 验证标签列表可见
    await expect(page.locator('[role="tablist"]')).toBeVisible();
  });

  test('仪表盘标签页测试', async ({ page }) => {
    // 点击仪表盘标签
    await page.click('text=仪表盘');

    // 等待内容加载
    await page.waitForTimeout(1000);

    // 验证标签被激活
    await expect(page.locator('[data-state="active"][value="dashboard"]')).toBeVisible();

    // 验证仪表盘内容可见
    await expect(page.locator('[data-state="active"][value="dashboard"]')).toBeVisible();
  });

  test('会话管理标签页测试', async ({ page }) => {
    // 点击会话管理标签
    await page.click('text=会话管理');

    // 等待内容加载
    await page.waitForTimeout(1000);

    // 验证标签被激活
    await expect(page.locator('[data-state="active"][value="sessions"]')).toBeVisible();

    // 验证会话列表容器可见
    const sessionsTab = page.locator('[value="sessions"]');
    await expect(sessionsTab).toBeVisible();
  });

  test('机器人管理标签页测试', async ({ page }) => {
    // 点击机器人管理标签
    await page.click('text=机器人管理');

    // 等待内容加载
    await page.waitForTimeout(1000);

    // 验证标签被激活
    await expect(page.locator('[data-state="active"][value="robots"]')).toBeVisible();

    // 验证机器人管理容器可见
    const robotsTab = page.locator('[value="robots"]');
    await expect(robotsTab).toBeVisible();
  });

  test('监控告警标签页测试', async ({ page }) => {
    // 点击监控告警标签
    await page.click('text=监控告警');

    // 等待内容加载
    await page.waitForTimeout(1000);

    // 验证标签被激活
    await expect(page.locator('[data-state="active"][value="monitor"]')).toBeVisible();

    // 验证监控容器可见
    const monitorTab = page.locator('[value="monitor"]');
    await expect(monitorTab).toBeVisible();
  });

  test('AI模块标签页测试', async ({ page }) => {
    // 点击AI模块标签
    await page.click('text=AI模块');

    // 等待内容加载
    await page.waitForTimeout(1000);

    // 验证标签被激活
    await expect(page.locator('[data-state="active"][value="ai-module"]')).toBeVisible();

    // 验证AI模块容器可见
    const aiModuleTab = page.locator('[value="ai-module"]');
    await expect(aiModuleTab).toBeVisible();
  });

  test('流程引擎标签页测试', async ({ page }) => {
    // 点击流程引擎标签
    await page.click('text=流程引擎');

    // 等待内容加载
    await page.waitForTimeout(1000);

    // 验证标签被激活
    await expect(page.locator('[data-state="active"][value="flow-engine"]')).toBeVisible();

    // 验证流程引擎容器可见
    const flowEngineTab = page.locator('[value="flow-engine"]');
    await expect(flowEngineTab).toBeVisible();
  });

  test('协同分析标签页测试', async ({ page }) => {
    // 点击协同分析标签
    await page.click('text=协同分析');

    // 等待内容加载
    await page.waitForTimeout(1000);

    // 验证标签被激活
    await expect(page.locator('[data-state="active"][value="collab-analytics"]')).toBeVisible();

    // 验证协同分析容器可见
    const collabAnalyticsTab = page.locator('[value="collab-analytics"]');
    await expect(collabAnalyticsTab).toBeVisible();
  });

  test('系统设置标签页测试', async ({ page }) => {
    // 点击系统设置标签
    await page.click('text=系统设置');

    // 等待内容加载
    await page.waitForTimeout(1000);

    // 验证标签被激活
    await expect(page.locator('[data-state="active"][value="settings"]')).toBeVisible();

    // 验证系统设置容器可见
    const settingsTab = page.locator('[value="settings"]');
    await expect(settingsTab).toBeVisible();
  });

  test('标签页切换测试', async ({ page }) => {
    const tabs = ['仪表盘', '会话管理', '机器人管理', '监控告警', 'AI模块', '流程引擎', '协同分析', '系统设置'];

    for (const tab of tabs) {
      // 点击标签
      await page.click(`text=${tab}`);

      // 等待内容加载
      await page.waitForTimeout(500);

      // 验证标签被激活
      await expect(page.locator(`[data-state="active"][value="${tab === '仪表盘' ? 'dashboard' :
        tab === '会话管理' ? 'sessions' :
          tab === '机器人管理' ? 'robots' :
            tab === '监控告警' ? 'monitor' :
              tab === 'AI模块' ? 'ai-module' :
                tab === '流程引擎' ? 'flow-engine' :
                  tab === '协同分析' ? 'collab-analytics' : 'settings'}"]`)).toBeVisible();

      console.log(`✓ 标签页 "${tab}" 切换成功`);
    }
  });
});

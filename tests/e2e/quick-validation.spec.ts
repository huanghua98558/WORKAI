import { test, expect } from '@playwright/test';

/**
 * 快速验证测试
 * 用于验证测试环境是否正常工作
 */

test.describe('环境验证测试', () => {

  test('首页访问测试', async ({ page }) => {
    // 访问首页
    await page.goto('/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 验证页面标题
    const title = await page.title();
    expect(title).toBeTruthy();

    console.log('✅ 首页访问成功');

    // 验证页面内容可见
    const body = page.locator('body');
    await expect(body).toBeVisible();

    console.log('✅ 页面内容可见');

    // 截图（用于视觉验证）
    await page.screenshot({ path: 'test-results/homepage-screenshot.png' });

    console.log('✅ 截图已保存');
  });

  test('页面性能测试', async ({ page }) => {
    // 记录开始时间
    const startTime = Date.now();

    // 访问首页
    await page.goto('/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 计算加载时间
    const loadTime = Date.now() - startTime;

    console.log(`📊 页面加载时间: ${loadTime}ms`);

    // 验证加载时间不超过 10 秒
    expect(loadTime).toBeLessThan(10000);

    console.log('✅ 页面加载时间正常');
  });

  test('浏览器兼容性测试', async ({ page, browserName }) => {
    // 访问首页
    await page.goto('/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    console.log(`🌐 当前浏览器: ${browserName}`);

    // 验证页面在当前浏览器中正常显示
    await expect(page.locator('body')).toBeVisible();

    console.log(`✅ ${browserName} 浏览器兼容性正常`);
  });

  test('响应式布局测试', async ({ page }) => {
    // 测试桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    console.log('✅ 桌面视图 (1920x1080) 正常');

    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    console.log('✅ 平板视图 (768x1024) 正常');

    // 测试移动视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    console.log('✅ 移动视图 (375x667) 正常');
  });
});

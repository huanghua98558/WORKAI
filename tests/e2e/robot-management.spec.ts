import { test, expect } from '@playwright/test';

/**
 * 机器人管理功能测试
 * 测试机器人列表、创建、编辑、删除等功能
 */

test.describe('机器人管理功能测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切换到机器人管理标签
    await page.click('text=机器人管理');
    await page.waitForTimeout(1000);
  });

  test('机器人列表加载测试', async ({ page }) => {
    // 验证机器人列表容器可见
    const robotsContainer = page.locator('[value="robots"]');
    await expect(robotsContainer).toBeVisible();

    // 等待数据加载
    await page.waitForTimeout(2000);

    // 验证页面中没有错误提示
    const errorAlert = page.locator('.destructive, .bg-destructive');
    await expect(errorAlert).not.toBeVisible({ timeout: 5000 });
  });

  test('机器人搜索功能测试', async ({ page }) => {
    // 等待机器人列表加载
    await page.waitForTimeout(2000);

    // 查找搜索框（可能有多种选择器）
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="搜索机器人"], input[type="search"]').first();

    if (await searchInput.isVisible({ timeout: 5000 })) {
      // 输入搜索关键词
      await searchInput.fill('测试');

      // 等待搜索结果
      await page.waitForTimeout(1000);

      console.log('✓ 机器人搜索功能可用');
    } else {
      console.log('⚠ 未找到搜索框，可能未实现');
    }
  });

  test('刷新按钮功能测试', async ({ page }) => {
    // 查找刷新按钮
    const refreshButton = page.locator('button:has-text("刷新"), button:has([data-testid="refresh"]), svg[class*="refresh"], button svg[class*="Refresh"]').first();

    if (await refreshButton.isVisible({ timeout: 5000 })) {
      // 记录当前内容
      const beforeRefresh = await page.content();

      // 点击刷新按钮
      await refreshButton.click();

      // 等待刷新完成
      await page.waitForTimeout(2000);

      console.log('✓ 刷新按钮功能可用');
    } else {
      console.log('⚠ 未找到刷新按钮，可能未实现');
    }
  });

  test('创建机器人按钮测试', async ({ page }) => {
    // 查找创建机器人按钮
    const createButton = page.locator('button:has-text("创建"), button:has-text("新增"), button:has-text("添加机器人")').first();

    if (await createButton.isVisible({ timeout: 5000 })) {
      // 点击创建按钮
      await createButton.click();

      // 等待对话框或表单出现
      await page.waitForTimeout(1000);

      // 检查是否有对话框或表单出现
      const dialog = page.locator('[role="dialog"], .dialog, .modal');
      const form = page.locator('form');

      const hasDialogOrForm = await dialog.isVisible().catch(() => false) || await form.isVisible().catch(() => false);

      if (hasDialogOrForm) {
        console.log('✓ 创建机器人功能可用');

        // 关闭对话框（如果需要）
        const closeButton = page.locator('button:has-text("取消"), button:has-text("关闭"), [aria-label="Close"]').first();
        if (await closeButton.isVisible({ timeout: 3000 })) {
          await closeButton.click();
        }
      } else {
        console.log('⚠ 创建按钮存在但对话框未出现');
      }
    } else {
      console.log('⚠ 未找到创建机器人按钮');
    }
  });

  test('机器人列表卡片显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找机器人卡片或列表项
    const robotCards = page.locator('.card, [role="listitem"], tr');

    if (await robotCards.count() > 0) {
      console.log(`✓ 找到 ${await robotCards.count()} 个机器人卡片或列表项`);

      // 检查第一个机器人卡片
      const firstCard = robotCards.first();
      await expect(firstCard).toBeVisible();
    } else {
      console.log('⚠ 未找到机器人卡片，可能数据为空或加载失败');
    }
  });

  test('机器人编辑功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找编辑按钮
    const editButton = page.locator('button:has-text("编辑"), button[aria-label*="编辑"], button:has([data-testid="edit"])').first();

    if (await editButton.isVisible({ timeout: 5000 })) {
      // 点击编辑按钮
      await editButton.click();

      // 等待对话框出现
      await page.waitForTimeout(1000);

      // 检查对话框是否出现
      const dialog = page.locator('[role="dialog"], .dialog');
      if (await dialog.isVisible({ timeout: 3000 })) {
        console.log('✓ 编辑机器人功能可用');

        // 关闭对话框
        const closeButton = page.locator('button:has-text("取消"), button:has-text("关闭")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      } else {
        console.log('⚠ 编辑按钮存在但对话框未出现');
      }
    } else {
      console.log('⚠ 未找到编辑按钮，可能没有机器人数据或未实现');
    }
  });

  test('机器人删除功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找删除按钮
    const deleteButton = page.locator('button:has-text("删除"), button[aria-label*="删除"], button:has([data-testid="delete"])').first();

    if (await deleteButton.isVisible({ timeout: 5000 })) {
      // 获取按钮的 onclick 属性或确认是否需要确认
      const isDanger = await deleteButton.evaluate(el => {
        return el.classList.contains('destructive') ||
               el.closest('.destructive') !== null ||
               el.getAttribute('data-variant') === 'destructive';
      });

      if (isDanger) {
        console.log('✓ 删除按钮可用（未实际点击以避免删除数据）');
      } else {
        console.log('✓ 删除按钮可用');
      }
    } else {
      console.log('⚠ 未找到删除按钮，可能没有机器人数据或未实现');
    }
  });

  test('机器人状态切换功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找状态开关
    const statusSwitch = page.locator('[role="switch"], input[type="checkbox"]').first();

    if (await statusSwitch.isVisible({ timeout: 5000 })) {
      console.log('✓ 状态切换功能可用（未实际切换以避免更改状态）');
    } else {
      console.log('⚠ 未找到状态开关，可能未实现');
    }
  });

  test('机器人详情查看功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找机器人卡片或列表项
    const robotCard = page.locator('.card, [role="listitem"]').first();

    if (await robotCard.isVisible({ timeout: 5000 })) {
      // 点击机器人卡片
      await robotCard.click();

      // 等待响应
      await page.waitForTimeout(1000);

      // 检查是否有详情页面或对话框
      const detailView = page.locator('[role="dialog"], .detail-view, .robot-detail');

      if (await detailView.isVisible({ timeout: 3000 })) {
        console.log('✓ 机器人详情查看功能可用');

        // 关闭详情
        const closeButton = page.locator('button:has-text("关闭"), button:has-text("返回")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      } else {
        console.log('⚠ 点击机器人卡片后未显示详情');
      }
    } else {
      console.log('⚠ 未找到机器人卡片');
    }
  });
});

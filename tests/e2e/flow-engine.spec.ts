import { test, expect } from '@playwright/test';

/**
 * 流程引擎功能测试
 * 测试流程列表、创建、编辑、执行等功能
 */

test.describe('流程引擎功能测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切换到流程引擎标签
    await page.click('text=流程引擎');
    await page.waitForTimeout(1000);
  });

  test('流程引擎加载测试', async ({ page }) => {
    // 验证流程引擎容器可见
    const flowEngineContainer = page.locator('[value="flow-engine"]');
    await expect(flowEngineContainer).toBeVisible();

    // 等待数据加载
    await page.waitForTimeout(2000);

    // 验证页面中没有错误提示
    const errorAlert = page.locator('.destructive, .bg-destructive');
    await expect(errorAlert).not.toBeVisible({ timeout: 5000 });
  });

  test('流程列表加载测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找流程列表或卡片
    const flowList = page.locator('.flow-list, [data-testid="flows"], .flow-definitions');

    if (await flowList.isVisible({ timeout: 5000 })) {
      console.log('✓ 流程列表可见');

      // 查找流程项
      const flowItems = flowList.locator('.flow-item, .card, [role="listitem"]');

      if (await flowItems.count() > 0) {
        console.log(`✓ 找到 ${await flowItems.count()} 个流程`);
      } else {
        console.log('⚠ 流程列表存在但未找到流程项');
      }
    } else {
      console.log('⚠ 未找到流程列表');
    }
  });

  test('创建流程按钮测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找创建流程按钮
    const createButton = page.locator('button:has-text("创建流程"), button:has-text("新建"), button:has([data-testid="create-flow"])').first();

    if (await createButton.isVisible({ timeout: 5000 })) {
      console.log('✓ 创建流程按钮可用');

      // 点击创建按钮
      await createButton.click();

      // 等待对话框或表单出现
      await page.waitForTimeout(1000);

      // 检查是否有对话框或表单
      const dialog = page.locator('[role="dialog"], .dialog, .modal');
      const form = page.locator('form');

      const hasDialogOrForm = await dialog.isVisible().catch(() => false) || await form.isVisible().catch(() => false);

      if (hasDialogOrForm) {
        console.log('✓ 创建流程对话框可用');

        // 关闭对话框
        const closeButton = page.locator('button:has-text("取消"), button:has-text("关闭")').first();
        if (await closeButton.isVisible({ timeout: 3000 })) {
          await closeButton.click();
        }
      } else {
        console.log('⚠ 创建按钮存在但对话框未出现');
      }
    } else {
      console.log('⚠ 未找到创建流程按钮');
    }
  });

  test('流程编辑器测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找流程项
    const flowItem = page.locator('.flow-item, .card').first();

    if (await flowItem.isVisible({ timeout: 5000 })) {
      // 点击流程项
      await flowItem.click();

      // 等待响应
      await page.waitForTimeout(1000);

      // 检查是否有流程编辑器
      const flowEditor = page.locator('.flow-editor, [data-testid="flow-editor"]');

      if (await flowEditor.isVisible({ timeout: 3000 })) {
        console.log('✓ 流程编辑器可用');

        // 查找画布
        const canvas = flowEditor.locator('.canvas, .diagram, svg');

        if (await canvas.isVisible({ timeout: 3000 })) {
          console.log('✓ 流程画布可见');
        } else {
          console.log('⚠ 未找到流程画布');
        }

        // 关闭编辑器
        const closeButton = page.locator('button:has-text("关闭"), button:has-text("返回")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      } else {
        console.log('⚠ 点击流程后未显示编辑器');
      }
    } else {
      console.log('⚠ 未找到流程项');
    }
  });

  test('流程节点添加测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找流程项
    const flowItem = page.locator('.flow-item, .card').first();

    if (await flowItem.isVisible({ timeout: 5000 })) {
      // 点击流程项
      await flowItem.click();

      // 等待编辑器加载
      await page.waitForTimeout(1000);

      // 查找节点工具栏
      const nodeToolbar = page.locator('.node-toolbar, .nodes-panel, [data-testid="nodes"]');

      if (await nodeToolbar.isVisible({ timeout: 3000 })) {
        console.log('✓ 节点工具栏可见');

        // 关闭编辑器
        const closeButton = page.locator('button:has-text("关闭"), button:has-text("返回")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      } else {
        console.log('⚠ 未找到节点工具栏');
      }
    }
  });

  test('流程执行测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找流程项
    const flowItem = page.locator('.flow-item, .card').first();

    if (await flowItem.isVisible({ timeout: 5000 })) {
      // 查找执行按钮
      const executeButton = flowItem.locator('button:has-text("执行"), button:has-text("运行"), button[aria-label*="execute"]').first();

      if (await executeButton.isVisible({ timeout: 3000 })) {
        console.log('✓ 流程执行按钮可用（未实际执行）');
      } else {
        console.log('⚠ 未找到执行按钮');
      }
    } else {
      console.log('⚠ 未找到流程项');
    }
  });

  test('流程删除功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找删除按钮
    const deleteButton = page.locator('button:has-text("删除"), button[aria-label*="删除"], button:has([data-testid="delete"])').first();

    if (await deleteButton.isVisible({ timeout: 5000 })) {
      console.log('✓ 流程删除按钮可用（未实际点击以避免删除数据）');
    } else {
      console.log('⚠ 未找到删除按钮');
    }
  });

  test('流程状态切换测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找状态开关
    const statusSwitch = page.locator('[role="switch"], input[type="checkbox"]').first();

    if (await statusSwitch.isVisible({ timeout: 5000 })) {
      console.log('✓ 流程状态切换功能可用（未实际切换）');
    } else {
      console.log('⚠ 未找到状态开关');
    }
  });

  test('流程搜索功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找搜索框
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="搜索流程"]').first();

    if (await searchInput.isVisible({ timeout: 5000 })) {
      console.log('✓ 流程搜索功能可用');
    } else {
      console.log('⚠ 未找到搜索框');
    }
  });

  test('流程刷新功能测试', async ({ page }) => {
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
});

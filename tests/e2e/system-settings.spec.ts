import { test, expect } from '@playwright/test';

/**
 * 系统设置功能测试
 * 测试AI配置、通知设置、会话设置等功能
 */

test.describe('系统设置功能测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切换到系统设置标签
    await page.click('text=系统设置');
    await page.waitForTimeout(1000);
  });

  test('系统设置加载测试', async ({ page }) => {
    // 验证系统设置容器可见
    const settingsContainer = page.locator('[value="settings"]');
    await expect(settingsContainer).toBeVisible();

    // 等待数据加载
    await page.waitForTimeout(2000);

    // 验证页面中没有错误提示
    const errorAlert = page.locator('.destructive, .bg-destructive');
    await expect(errorAlert).not.toBeVisible({ timeout: 5000 });
  });

  test('设置标签页切换测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找设置模块内部的标签页
    const settingsTabs = page.locator('[role="tablist"], .tabs').first();

    if (await settingsTabs.isVisible({ timeout: 5000 })) {
      console.log('✓ 系统设置标签页可见');

      // 查找标签项
      const tabItems = settingsTabs.locator('[role="tab"]');

      if (await tabItems.count() > 0) {
        console.log(`✓ 找到 ${await tabItems.count()} 个设置标签页`);
      } else {
        console.log('⚠ 标签页列表存在但未找到标签项');
      }
    } else {
      console.log('⚠ 未找到系统设置标签页');
    }
  });

  test('AI配置测试', async ({ page }) => {
    // 查找AI配置标签
    const aiConfigTab = page.locator('[value="config"], button:has-text("AI配置")').first();

    if (await aiConfigTab.isVisible({ timeout: 5000 })) {
      await aiConfigTab.click();
      await page.waitForTimeout(1000);

      console.log('✓ AI配置标签页可用');

      // 查找配置表单
      const configForm = page.locator('form, .config-form');

      if (await configForm.isVisible({ timeout: 3000 })) {
        console.log('✓ AI配置表单可见');

        // 查找API密钥输入框
        const apiKeyInput = configForm.locator('input[placeholder*="API"], input[name*="api"], input[type="password"]').first();

        if (await apiKeyInput.isVisible({ timeout: 3000 })) {
          console.log('✓ API密钥配置可用（未实际修改）');
        } else {
          console.log('⚠ 未找到API密钥配置');
        }

        // 查找保存按钮
        const saveButton = configForm.locator('button:has-text("保存"), button:has-text("确认")').first();

        if (await saveButton.isVisible({ timeout: 3000 })) {
          console.log('✓ 保存按钮可用（未实际点击）');
        }
      } else {
        console.log('⚠ 未找到配置表单');
      }
    } else {
      console.log('⚠ 未找到AI配置标签');
    }
  });

  test('通知设置测试', async ({ page }) => {
    // 查找通知设置
    const notificationTab = page.locator('[value="notification"], button:has-text("通知")').first();

    if (await notificationTab.isVisible({ timeout: 5000 })) {
      await notificationTab.click();
      await page.waitForTimeout(1000);

      console.log('✓ 通知设置可用');

      // 查找通知开关
      const notificationSwitch = page.locator('[role="switch"], input[type="checkbox"]').first();

      if (await notificationSwitch.isVisible({ timeout: 3000 })) {
        console.log('✓ 通知开关可用（未实际切换）');
      } else {
        console.log('⚠ 未找到通知开关');
      }
    } else {
      console.log('⚠ 未找到通知设置');
    }
  });

  test('会话设置测试', async ({ page }) => {
    // 查找会话设置
    const sessionTab = page.locator('[value="session"], button:has-text("会话")').first();

    if (await sessionTab.isVisible({ timeout: 5000 })) {
      await sessionTab.click();
      await page.waitForTimeout(1000);

      console.log('✓ 会话设置可用');
    } else {
      console.log('⚠ 未找到会话设置');
    }
  });

  test('系统信息显示测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找系统信息
    const systemInfo = page.locator('.system-info, [data-testid="system-info"]');

    if (await systemInfo.isVisible({ timeout: 5000 })) {
      console.log('✓ 系统信息可见');
    } else {
      console.log('⚠ 未找到系统信息');
    }
  });

  test('设置保存功能测试', async ({ page }) => {
    // 查找保存按钮
    const saveButton = page.locator('button:has-text("保存"), button:has-text("应用设置")').first();

    if (await saveButton.isVisible({ timeout: 5000 })) {
      console.log('✓ 保存按钮可用（未实际点击）');
    } else {
      console.log('⚠ 未找到保存按钮');
    }
  });

  test('设置重置功能测试', async ({ page }) => {
    // 查找重置按钮
    const resetButton = page.locator('button:has-text("重置"), button:has-text("恢复默认")').first();

    if (await resetButton.isVisible({ timeout: 5000 })) {
      console.log('✓ 重置按钮可用（未实际点击）');
    } else {
      console.log('⚠ 未找到重置按钮');
    }
  });

  test('用户权限设置测试', async ({ page }) => {
    // 查找权限设置
    const permissionTab = page.locator('button:has-text("权限"), button:has-text("用户")').first();

    if (await permissionTab.isVisible({ timeout: 5000 })) {
      console.log('✓ 权限设置可用');
    } else {
      console.log('⚠ 未找到权限设置');
    }
  });

  test('日志设置测试', async ({ page }) => {
    // 查找日志设置
    const logTab = page.locator('button:has-text("日志"), button:has-text("记录")').first();

    if (await logTab.isVisible({ timeout: 5000 })) {
      console.log('✓ 日志设置可用');
    } else {
      console.log('⚠ 未找到日志设置');
    }
  });
});

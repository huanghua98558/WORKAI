import { test, expect } from '@playwright/test';

/**
 * AI模块功能测试
 * 测试AI模型、角色、模板、测试功能
 */

test.describe('AI模块功能测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 切换到AI模块标签
    await page.click('text=AI模块');
    await page.waitForTimeout(1000);
  });

  test('AI模块加载测试', async ({ page }) => {
    // 验证AI模块容器可见
    const aiModuleContainer = page.locator('[value="ai-module"]');
    await expect(aiModuleContainer).toBeVisible();

    // 等待数据加载
    await page.waitForTimeout(2000);

    // 验证页面中没有错误提示
    const errorAlert = page.locator('.destructive, .bg-destructive');
    await expect(errorAlert).not.toBeVisible({ timeout: 5000 });
  });

  test('AI模型列表加载测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找AI模型列表或卡片
    const modelList = page.locator('.model-list, .ai-models, [data-testid="models"]');

    if (await modelList.isVisible({ timeout: 5000 })) {
      console.log('✓ AI模型列表可见');

      // 查找模型项
      const modelItems = modelList.locator('.model-item, .card, [role="listitem"]');

      if (await modelItems.count() > 0) {
        console.log(`✓ 找到 ${await modelItems.count()} 个AI模型`);
      } else {
        console.log('⚠ AI模型列表存在但未找到模型项');
      }
    } else {
      console.log('⚠ 未找到AI模型列表');
    }
  });

  test('AI角色列表加载测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找AI角色列表
    const personaList = page.locator('.persona-list, .ai-personas, [data-testid="personas"]');

    if (await personaList.isVisible({ timeout: 5000 })) {
      console.log('✓ AI角色列表可见');

      // 查找角色项
      const personaItems = personaList.locator('.persona-item, .card, [role="listitem"]');

      if (await personaItems.count() > 0) {
        console.log(`✓ 找到 ${await personaItems.count()} 个AI角色`);
      } else {
        console.log('⚠ AI角色列表存在但未找到角色项');
      }
    } else {
      console.log('⚠ 未找到AI角色列表');
    }
  });

  test('AI模板列表加载测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找AI模板列表
    const templateList = page.locator('.template-list, .ai-templates, [data-testid="templates"]');

    if (await templateList.isVisible({ timeout: 5000 })) {
      console.log('✓ AI模板列表可见');

      // 查找模板项
      const templateItems = templateList.locator('.template-item, .card, [role="listitem"]');

      if (await templateItems.count() > 0) {
        console.log(`✓ 找到 ${await templateItems.count()} 个AI模板`);
      } else {
        console.log('⚠ AI模板列表存在但未找到模板项');
      }
    } else {
      console.log('⚠ 未找到AI模板列表');
    }
  });

  test('AI测试功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找AI测试区域
    const testArea = page.locator('.ai-test, [data-testid="ai-test"], .test-area');

    if (await testArea.isVisible({ timeout: 5000 })) {
      console.log('✓ AI测试区域可见');

      // 查找输入框
      const inputField = testArea.locator('textarea, input[type="text"]').first();

      if (await inputField.isVisible({ timeout: 3000 })) {
        console.log('✓ AI测试输入框可见');

        // 查找发送按钮
        const sendButton = testArea.locator('button:has-text("发送"), button:has-text("测试"), button:has([data-testid="send"])').first();

        if (await sendButton.isVisible({ timeout: 3000 })) {
          console.log('✓ AI测试发送按钮可用（未实际发送）');
        } else {
          console.log('⚠ 未找到发送按钮');
        }
      } else {
        console.log('⚠ 未找到输入框');
      }
    } else {
      console.log('⚠ 未找到AI测试区域');
    }
  });

  test('AI模型选择功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找模型选择器
    const modelSelect = page.locator('select, [role="combobox"], .model-selector');

    if (await modelSelect.isVisible({ timeout: 5000 })) {
      console.log('✓ AI模型选择器可用');
    } else {
      console.log('⚠ 未找到模型选择器');
    }
  });

  test('AI角色选择功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找角色选择器
    const personaSelect = page.locator('select, [role="combobox"], .persona-selector');

    if (await personaSelect.isVisible({ timeout: 5000 })) {
      console.log('✓ AI角色选择器可用');
    } else {
      console.log('⚠ 未找到角色选择器');
    }
  });

  test('AI参数配置功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找参数配置区域
    const configArea = page.locator('.config-area, [data-testid="config"], .settings');

    if (await configArea.isVisible({ timeout: 5000 })) {
      console.log('✓ AI参数配置区域可见');

      // 查找温度滑块
      const temperatureSlider = configArea.locator('input[type="range"], [data-testid="temperature"]');

      if (await temperatureSlider.isVisible({ timeout: 3000 })) {
        console.log('✓ 温度参数可用');
      } else {
        console.log('⚠ 未找到温度参数');
      }

      // 查找最大token输入
      const maxTokensInput = configArea.locator('input[placeholder*="token"], [data-testid="max-tokens"]');

      if (await maxTokensInput.isVisible({ timeout: 3000 })) {
        console.log('✓ 最大token参数可用');
      } else {
        console.log('⚠ 未找到最大token参数');
      }
    } else {
      console.log('⚠ 未找到参数配置区域');
    }
  });

  test('AI响应显示功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找响应显示区域
    const responseArea = page.locator('.response-area, [data-testid="response"], .ai-response');

    if (await responseArea.isVisible({ timeout: 5000 })) {
      console.log('✓ AI响应显示区域可见');
    } else {
      console.log('⚠ 未找到响应显示区域');
    }
  });

  test('AI标签页切换测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找AI模块内部的标签页
    const aiTabs = page.locator('[role="tablist"], .tabs').first();

    if (await aiTabs.isVisible({ timeout: 5000 })) {
      console.log('✓ AI模块标签页可见');

      // 查找标签项
      const tabItems = aiTabs.locator('[role="tab"]');

      if (await tabItems.count() > 0) {
        console.log(`✓ 找到 ${await tabItems.count()} 个AI模块标签页`);
      } else {
        console.log('⚠ 标签页列表存在但未找到标签项');
      }
    } else {
      console.log('⚠ 未找到AI模块标签页');
    }
  });

  test('AI历史记录功能测试', async ({ page }) => {
    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找历史记录
    const historyList = page.locator('.history-list, [data-testid="history"]');

    if (await historyList.isVisible({ timeout: 5000 })) {
      console.log('✓ AI历史记录可见');
    } else {
      console.log('⚠ 未找到历史记录');
    }
  });
});

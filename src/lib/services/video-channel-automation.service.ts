import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 视频号小店自动化服务
 * 提供：获取二维码、检测登录、提取Cookie、人工审核、页面可访问性检测
 * 新增：专属二维码生成和管理、用户管理、消息自动发送
 */

interface QrcodeResult {
  success: boolean;
  qrcodeId?: string;
  qrcodePath?: string;
  qrcodeUrl?: string;
  qrcodeBase64?: string;
  expiresAt?: Date;
  userId?: string;
  error?: string;
}

interface User {
  id: string;
  userId: string; // WorkTool用户ID
  userName: string;
  robotId: string;
  robotName: string;
  status: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

interface QrcodeRecord {
  id: string;
  userId: string;
  qrcodeId: string;
  qrcodePath: string;
  qrcodeUrl: string;
  ossObjectName: string;
  status: string;
  expiresAt: Date;
  scannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface LoginStatusResult {
  success: boolean;
  isLoggedIn: boolean;
  cookies?: any[];
  qrcodeExpired?: boolean;
  error?: string;
}

interface PageAccessibilityResult {
  success: boolean;
  shopAccessible?: boolean;
  assistantAccessible?: boolean;
  shopStatusCode?: number;
  assistantStatusCode?: number;
  error?: string;
}

interface ManualAuditResult {
  success: boolean;
  shopScreenshotPath?: string;
  shopScreenshotUrl?: string;
  shopAccessible?: boolean;
  shopStatusCode?: number;
  assistantScreenshotPath?: string;
  assistantScreenshotUrl?: string;
  assistantAccessible?: boolean;
  assistantStatusCode?: number;
  message?: string;
  error?: string;
}

class VideoChannelAutomationService {
  private instanceId: string = Date.now().toString(); // 用于调试单例是否被重新创建
  private browser: puppeteer.Browser | null = null;
  private qrcodeDir: string;
  private auditDir: string;
  // 带货助手页面
  private shopUrl = 'https://store.weixin.qq.com/talent/home'; // 登录成功后的URL
  // 视频号助手页面（独立URL或通过带货助手页面内的入口访问）
  private assistantUrl = 'https://channels.weixin.qq.com/assistant';
  private currentQrcodeId: string | null = null;
  private currentQrcodeExpiresAt: Date | null = null;
  private currentQrcodePage: puppeteer.Page | null = null; // 保存二维码页面实例
  private qrcodeLifetime = 5 * 60 * 1000; // 5分钟有效期

  constructor() {
    // 确保 /tmp 目录存在
    this.qrcodeDir = path.join('/tmp', 'qrcodes');
    this.auditDir = path.join('/tmp', 'audit');
    this.ensureDirectories();
  }

  /**
   * 检测二维码是否过期（带日志）
   */
  isQrcodeExpired(): boolean {
    if (!this.currentQrcodeExpiresAt) {
      console.log('[二维码过期] 未设置过期时间，视为过期。当前二维码ID:', this.currentQrcodeId, 'instanceId:', this.instanceId);
      return true;
    }

    const now = new Date();
    const expired = now > this.currentQrcodeExpiresAt;
    const remaining = this.currentQrcodeExpiresAt.getTime() - now.getTime();

    console.log('[二维码过期] 检测过期状态:', {
      当前时间: now.toISOString(),
      过期时间: this.currentQrcodeExpiresAt.toISOString(),
      剩余时间: Math.floor(remaining / 1000) + '秒',
      是否过期: expired
    });

    return expired;
  }

  /**
   * 获取二维码剩余有效时间（秒）（带日志）
   */
  getQrcodeRemainingTime(): number {
    if (!this.currentQrcodeExpiresAt) {
      console.log('[二维码过期] 未设置过期时间，剩余时间: 0秒');
      return 0;
    }

    const remaining = this.currentQrcodeExpiresAt.getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remaining / 1000));

    console.log('[二维码过期] 获取剩余时间:', remainingSeconds + '秒');

    return remainingSeconds;
  }

  /**
   * 关闭二维码页面（刷新二维码时调用）
   */
  async closeQrcodePage(): Promise<void> {
    if (this.currentQrcodePage && !this.currentQrcodePage.isClosed()) {
      console.log('[二维码页面] 关闭旧二维码页面');
      await this.currentQrcodePage.close();
      this.currentQrcodePage = null;
    }
  }

  /**
   * 重置二维码状态（用于刷新二维码）
   */
  async resetQrcode(): Promise<void> {
    console.log('[二维码重置] 重置二维码状态');
    await this.closeQrcodePage();
    this.currentQrcodeId = null;
    this.currentQrcodeExpiresAt = null;
  }

  /**
   * 清除所有视频号相关的Cookie
   */
  async clearVideoChannelCookies(): Promise<void> {
    const browser = await this.getBrowser();
    const pages = await browser.pages();

    for (const page of pages) {
      try {
        const cookies = await page.cookies();
        // 清除所有微信相关的Cookie
        const weixinCookies = cookies.filter(cookie =>
          cookie.domain.includes('weixin.qq.com') ||
          cookie.domain.includes('work.weixin.qq.com')
        );

        for (const cookie of weixinCookies) {
          await page.deleteCookie(cookie);
        }

        console.log(`[清除Cookie] 页面 ${page.url()} 清除了 ${weixinCookies.length} 个Cookie`);
      } catch (error) {
        console.error('[清除Cookie] 清除Cookie失败:', error);
      }
    }
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.qrcodeDir, { recursive: true });
      await fs.mkdir(this.auditDir, { recursive: true });
    } catch (error) {
      console.error('创建目录失败:', error);
    }
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  /**
   * 1. 获取视频号小店二维码（优化版）
   */
  async getQrcode(): Promise<QrcodeResult> {
    console.log('[二维码生成] 开始生成二维码, instanceId:', this.instanceId);
    // 先重置旧二维码状态
    await this.resetQrcode();

    // 清除所有视频号相关的Cookie
    await this.clearVideoChannelCookies();

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // 设置用户代理
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // 确保新页面也没有Cookie
      await page.deleteCookie(...await page.cookies());

      console.log('[二维码生成] 已清除所有Cookie，确保未登录状态');

      // 禁用图片加载（只加载必要的资源，加快速度）
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        // 只加载文档、脚本和必要的样式，跳过图片、字体等
        if (['image', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // 访问微信带货助手页面（检测到未登录时，获取登录链接）
      await page.goto(this.shopUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      console.log('[获取二维码] 当前页面URL:', page.url());

      // 等待2秒，让页面完全加载
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 检查页面内容
      const bodyText = await page.evaluate(() => document.body.innerText || '');
      console.log('[获取二维码] 页面内容:', bodyText.substring(0, 200));

      const hasLoginTimeout = bodyText.includes('登录超时') ||
                             bodyText.includes('重新登录') ||
                             bodyText.includes('请重新登录');

      console.log('[获取二维码] 检测登录超时:', hasLoginTimeout);

      if (hasLoginTimeout) {
        console.log('[获取二维码] 检测到"登录超时"，查找登录链接');

        // 查找登录链接的href
        const loginLinkInfo = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const loginLink = links.find(link => {
            const text = (link as HTMLElement).innerText || '';
            return text.includes('登录');
          });

          if (loginLink) {
            return {
              href: (loginLink as HTMLAnchorElement).href,
              innerText: (loginLink as HTMLElement).innerText
            };
          }
          return null;
        });

        console.log('[获取二维码] 登录链接信息:', loginLinkInfo);

        // 恢复请求拦截（允许加载二维码图片）
        page.removeAllListeners('request');
        await page.setRequestInterception(false);

        if (loginLinkInfo && loginLinkInfo.href) {
          console.log('[获取二维码] 登录链接是JavaScript链接，尝试访问微信带货助手登录页面');

          // 访问微信带货助手页面（不是微信小店首页）
          const loginPageUrl = 'https://store.weixin.qq.com/talent/';
          console.log('[获取二维码] 访问微信带货助手登录页面:', loginPageUrl);
          await page.goto(loginPageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          console.log('[获取二维码] 登录页面URL:', page.url());

          // 检查页面是否自动跳转（防止登录页面跳转到其他页面）
          const currentUrl = page.url();
          if (!currentUrl.includes('/talent') || currentUrl.includes('/talent/home')) {
            console.log('[获取二维码] 页面自动跳转，重新访问登录页面');
            // 清除Cookie后重新访问
            await page.deleteCookie(...await page.cookies());
            await page.goto(loginPageUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 30000
            });
            console.log('[获取二维码] 重新访问后页面URL:', page.url());
          }
        }
      } else {
        // 恢复请求拦截（允许加载二维码图片）
        page.removeAllListeners('request');
        await page.setRequestInterception(false);
      }

      // 恢复请求拦截（允许加载二维码图片）
      page.removeAllListeners('request');
      await page.setRequestInterception(false);

      // 立即查找二维码，不等待（防止页面自动跳转）
      console.log('[获取二维码] 立即查找二维码，防止页面跳转');

      // 查找二维码元素（优化查找逻辑）
      let qrcodeElement: puppeteer.ElementHandle<Element> | null = null;

      // 策略1：快速尝试常见选择器（减少超时时间）
      const qrcodeSelectors = [
        '.qrcode-img',
        '.qrcode img',
        'img[alt*="二维码"]',
        'img[alt*="scan"]',
        '.login-qrcode img',
        '[class*="qrcode"] img',
        '[class*="login"] img'
      ];

      // 并行尝试多个选择器（减少超时时间，防止页面跳转）
      const selectorPromises = qrcodeSelectors.map(async (selector) => {
        try {
          await page.waitForSelector(selector, { timeout: 500 }); // 减少到500ms
          return await page.$(selector);
        } catch (e) {
          return null;
        }
      });

      const results = await Promise.all(selectorPromises);
      qrcodeElement = results.find(el => el !== null) || null;

      if (qrcodeElement) {
        console.log('通过选择器找到二维码元素');
      }

      // 策略2：通过图片尺寸查找（如果选择器没找到）
      if (!qrcodeElement) {
        console.log('尝试通过图片尺寸查找二维码');
        const potentialQrcode = await page.evaluate(() => {
          const images = Array.from(document.querySelectorAll('img'));
          return images.find(img => {
            const width = img.width || img.naturalWidth;
            const height = img.height || img.naturalHeight;
            // 二维码通常是正方形，尺寸在100-500之间
            return width > 100 && height > 100 &&
                   Math.abs(width - height) < 50 &&
                   width < 500;
          });
        });

        if (potentialQrcode) {
          qrcodeElement = await page.evaluateHandle((el: any) => el, potentialQrcode);
          console.log('通过尺寸找到二维码元素');
        }
      }

      // 策略3：如果还是没有找到，截取整个页面
      if (!qrcodeElement) {
        console.log('[获取二维码] 未找到二维码元素，截取整个页面');

        // 先获取页面信息
        const pageInfo = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            bodyText: document.body.innerText.substring(0, 1000),
            imageCount: document.querySelectorAll('img').length,
            images: Array.from(document.querySelectorAll('img')).map(img => ({
              src: img.src.substring(0, 100),
              alt: img.alt,
              width: img.width,
              height: img.height
            })).slice(0, 10)
          };
        });

        console.log('[获取二维码] 页面信息:', JSON.stringify(pageInfo, null, 2));

        const fullScreenshot = await page.screenshot();

        const timestamp = Date.now();
        const qrcodeId = `${timestamp}_full`;
        const qrcodePath = path.join(this.qrcodeDir, `${qrcodeId}.png`);

        await fs.writeFile(qrcodePath, fullScreenshot);

        console.log('[获取二维码] 已保存完整页面截图:', qrcodePath);

        // 同时保存一个中间区域的截图，作为备用
        const viewport = page.viewport();
        const clipArea = {
          x: Math.floor((viewport?.width || 1280) * 0.25),
          y: Math.floor((viewport?.height || 720) * 0.25),
          width: Math.floor((viewport?.width || 1280) * 0.5),
          height: Math.floor((viewport?.height || 720) * 0.5)
        };

        const partialScreenshot = await page.screenshot({
          clip: clipArea
        });

        const partialId = `${timestamp}_partial`;
        const partialPath = path.join(this.qrcodeDir, `${partialId}.png`);
        await fs.writeFile(partialPath, partialScreenshot);

        // 更新当前二维码状态
        this.currentQrcodeId = qrcodeId;
        this.currentQrcodeExpiresAt = new Date(Date.now() + this.qrcodeLifetime);

        console.log('[二维码生成] 二维码状态更新:', {
          qrcodeId,
          生成时间: new Date().toISOString(),
          过期时间: this.currentQrcodeExpiresAt.toISOString(),
          有效期: this.qrcodeLifetime / 1000 + '秒'
        });

        return {
          success: true,
          qrcodeId,
          qrcodePath,
          qrcodeUrl: `/api/video-channel/qrcode/${qrcodeId}.png`,
          expiresAt: this.currentQrcodeExpiresAt
        };
      }

      // 截取二维码
      const qrcodeScreenshot = await qrcodeElement.screenshot();

      // 保存二维码
      const timestamp = Date.now();
      const qrcodeId = `${timestamp}`;
      const qrcodePath = path.join(this.qrcodeDir, `${qrcodeId}.png`);
      await fs.writeFile(qrcodePath, qrcodeScreenshot);

      // 更新当前二维码状态
      this.currentQrcodeId = qrcodeId;
      this.currentQrcodeExpiresAt = new Date(Date.now() + this.qrcodeLifetime);

      console.log('[二维码生成] 二维码状态更新:', {
        qrcodeId,
        生成时间: new Date().toISOString(),
        过期时间: this.currentQrcodeExpiresAt.toISOString(),
        有效期: this.qrcodeLifetime / 1000 + '秒'
      });

      // 生成访问URL
      const qrcodeUrl = `/api/video-channel/qrcode/${qrcodeId}.png`;

      return {
        success: true,
        qrcodeId,
        qrcodePath,
        qrcodeUrl,
        expiresAt: this.currentQrcodeExpiresAt
      };
    } catch (error: any) {
      console.error('获取二维码失败:', error);
      return {
        success: false,
        error: error.message || '获取二维码失败'
      };
    } finally {
      // 关闭旧的二维码页面（如果有）
      try {
        if (this.currentQrcodePage && this.currentQrcodePage !== page && !this.currentQrcodePage.isClosed()) {
          await this.currentQrcodePage.close();
          console.log('[二维码页面] 已关闭旧二维码页面');
        }
      } catch (closeError) {
        console.warn('[二维码页面] 关闭旧页面时出错，可能页面已关闭:', closeError);
      }
      // 保存当前二维码页面实例（不关闭，用于后续检测登录）
      this.currentQrcodePage = page;
    }
  }

  /**
   * 2. 检测登录状态（优化版：不刷新页面，直接检查当前状态）
   */
  async checkLoginStatus(): Promise<LoginStatusResult> {
    const browser = await this.getBrowser();

    // 如果没有二维码页面或者页面已关闭，重新访问店铺页面
    if (!this.currentQrcodePage || this.currentQrcodePage.isClosed()) {
      console.log('[检测登录] 未找到二维码页面或页面已关闭，重新访问店铺页面...');
      this.currentQrcodePage = await browser.newPage();
      await this.currentQrcodePage.goto(this.shopUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    }

    const page = this.currentQrcodePage;

    try {
      console.log('[检测登录] 开始检测登录状态...');
      console.log('[检测登录] 当前页面URL:', page.url());

      // 不刷新页面，直接检查当前状态（避免破坏登录状态）
      const currentUrl = page.url();
      console.log('[检测登录] 当前页面URL:', currentUrl);

      console.log('[检测登录] 开始检查页面元素...');

      // 更准确的登录状态检测逻辑
      const loginCheckResult = await page.evaluate(() => {
        const result = {
          hasLoginForm: false,
          hasShopInfo: false,
          pageTitle: document.title,
          pageUrl: window.location.href,
          bodyText: document.body.innerText.substring(0, 200)
        };

        console.log('[页面上下文] 页面标题:', result.pageTitle);
        console.log('[页面上下文] 页面URL:', result.pageUrl);
        console.log('[页面上下文] 页面内容:', result.bodyText);

        // 检查页面是否显示登录超时或需要重新登录
        const hasLoginTimeout = result.bodyText.includes('登录超时') ||
                               result.bodyText.includes('重新登录') ||
                               result.bodyText.includes('请重新登录');

        console.log('[页面上下文] 检测到登录超时:', hasLoginTimeout);

        // 检查是否有登录框（未登录状态）
        // 优化选择器，只匹配真正的登录二维码容器
        const loginSelectors = [
          '.login-container .qrcode',  // 登录容器内的二维码
          '.qr-login .qrcode-img',     // 二维码登录容器内的二维码
          'img[alt*="二维码"][alt*="登录"]',  // 明确标注为"登录二维码"的图片
          '.scan-login-container',     // 扫码登录容器
        ];

        for (const selector of loginSelectors) {
          const element = document.querySelector(selector) as HTMLElement | null;
          if (element && element.offsetParent !== null) { // 检查元素是否可见
            result.hasLoginForm = true;
            console.log('[页面上下文] 找到登录元素:', selector);
            break;
          }
        }

        // 检查是否有店铺信息（已登录状态）
        const shopSelectors = [
          '.shop-name',              // 店铺名称
          '.user-avatar',            // 用户头像
          '.nav-user',               // 导航栏用户信息
          '.user-info',              // 用户信息
          '.header-user',            // 头部用户信息
          '.store-name',             // 店铺名称
          '[class*="shop-name"]',    // 包含shop-name的class
          '[class*="store-name"]',   // 包含store-name的class
        ];

        for (const selector of shopSelectors) {
          const element = document.querySelector(selector) as HTMLElement | null;
          if (element && element.offsetParent !== null) {
            result.hasShopInfo = true;
            console.log('[页面上下文] 找到店铺信息元素:', selector);
            break;
          }
        }

        console.log('[页面上下文] 登录框:', result.hasLoginForm, '店铺信息:', result.hasShopInfo);

        return result;
      });

      console.log('[检测登录] 页面检测结果:', loginCheckResult);

      // 判断登录状态：
      // 1. 如果页面显示登录超时或需要重新登录，说明未登录
      // 2. 如果URL跳转到了微信登录页（passport.weixin.qq.com 或 mp.weixin.qq.com），说明未登录
      // 3. 如果URL包含店铺路径，优先判断为已登录（即使检测到登录框，可能是页面残留）
      // 4. 如果有店铺信息，说明已登录
      const hasLoginTimeout = loginCheckResult.bodyText.includes('登录超时') ||
                             loginCheckResult.bodyText.includes('重新登录') ||
                             loginCheckResult.bodyText.includes('请重新登录');

      const urlIsLoginPage = currentUrl.includes('passport.weixin.qq.com') ||
                            currentUrl.includes('mp.weixin.qq.com') ||
                            currentUrl.includes('work.weixin.qq.com');

      // 如果URL包含店铺路径，优先判断为已登录
      const urlIsShopPage = currentUrl.includes('store.weixin.qq.com/talent/home') ||
                            currentUrl.includes('store.weixin.qq.com/talent/') ||
                            currentUrl.includes('channels.weixin.qq.com/assistant');

      // 优化判断逻辑：
      // - 如果页面显示登录超时，优先判断为未登录
      // - 如果URL是店铺页且没有显示登录超时，判断为已登录
      const isLoggedIn = !hasLoginTimeout &&
                        !urlIsLoginPage &&
                        (urlIsShopPage || loginCheckResult.hasShopInfo);

      console.log('[检测登录] 页面显示登录超时:', hasLoginTimeout);
      console.log('[检测登录] URL是登录页:', urlIsLoginPage);
      console.log('[检测登录] URL是店铺页:', urlIsShopPage);
      console.log('[检测登录] 检测到登录框:', loginCheckResult.hasLoginForm);
      console.log('[检测登录] 检测到店铺信息:', loginCheckResult.hasShopInfo);
      console.log('[检测登录] 最终登录状态:', isLoggedIn);

      // 检查二维码是否过期
      const qrcodeExpired = this.isQrcodeExpired();
      console.log('[检测登录] 二维码是否过期:', qrcodeExpired);

      // 如果已登录，提取Cookie
      let cookies: any[] = [];
      if (isLoggedIn) {
        console.log('[检测登录] 已登录，开始提取Cookie...');
        cookies = await page.cookies();
        console.log('[检测登录] 提取到', cookies.length, '个Cookie');

        // 打印关键Cookie
        const importantCookies = cookies.filter(c =>
          c.name.includes('wxsid') ||
          c.name.includes('webwxuvid') ||
          c.name.includes('mm_lang') ||
          c.name.includes('rewards_wechat_id')
        );
        console.log('[检测登录] 关键Cookie:', importantCookies.map(c => ({ name: c.name, domain: c.domain })));
      }

      return {
        success: true,
        isLoggedIn,
        cookies,
        qrcodeExpired
      };
    } catch (error: any) {
      console.error('[检测登录] 检测登录状态失败:', error);
      return {
        success: false,
        isLoggedIn: false,
        qrcodeExpired: this.isQrcodeExpired(),
        error: error.message || '检测登录状态失败'
      };
    }
  }

  /**
   * 3. 检测页面可访问性（带货助手和视频号助手联动性检测）
   */
  async checkPageAccessibility(cookies: any[]): Promise<PageAccessibilityResult> {
    const browser = await this.getBrowser();

    try {
      // 创建两个独立的页面实例
      const shopPage = await browser.newPage();
      const assistantPage = await browser.newPage();

      try {
        // 同时为两个页面设置Cookie
        await shopPage.setCookie(...cookies);
        await assistantPage.setCookie(...cookies);

        // 并发检测带货助手页面和视频号助手页面
        const [shopResponse, assistantResponse] = await Promise.all([
          shopPage.goto(this.shopUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
          }),
          assistantPage.goto(this.assistantUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
          })
        ]);

        return {
          success: true,
          shopAccessible: shopResponse?.status() === 200,
          assistantAccessible: assistantResponse?.status() === 200,
          shopStatusCode: shopResponse?.status(),
          assistantStatusCode: assistantResponse?.status()
        };
      } finally {
        await shopPage.close();
        await assistantPage.close();
      }
    } catch (error: any) {
      console.error('检测页面可访问性失败:', error);
      return {
        success: false,
        error: error.message || '检测页面可访问性失败'
      };
    }
  }

  /**
   * 4. 提取和保存Cookie
   */
  async extractAndSaveCookies(userId: string, cookies: any[]): Promise<{ success: boolean; cookieCount?: number; error?: string; cookies?: any[] }> {
    try {
      // 提取所有Cookie（不过滤，保留完整权限信息）
      const allCookies = cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite
      }));

      // 保存到文件（实际应用中应该保存到数据库）
      const timestamp = Date.now();
      const cookieFilePath = path.join('/tmp', `cookies_${userId}_${timestamp}.json`);
      await fs.writeFile(cookieFilePath, JSON.stringify({
        userId,
        cookies: allCookies,
        cookieCount: allCookies.length,
        extractedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
        status: 'active'
      }, null, 2));

      return {
        success: true,
        cookieCount: allCookies.length,
        cookies: allCookies
      };
    } catch (error: any) {
      console.error('提取和保存Cookie失败:', error);
      return {
        success: false,
        error: error.message || '提取和保存Cookie失败'
      };
    }
  }

  /**
   * 5. 人工审核（截图 + 权限验证）
   * 使用Cookie检测带货助手和视频号助手的联动性
   */
  async manualAudit(cookies: any[]): Promise<ManualAuditResult> {
    const browser = await this.getBrowser();

    try {
      // 创建两个独立的页面实例，分别用于带货助手和视频号助手
      const shopPage = await browser.newPage();
      const assistantPage = await browser.newPage();

      try {
        // 同时为两个页面设置Cookie（同一个Cookie可以访问两个页面）
        await shopPage.setCookie(...cookies);
        await assistantPage.setCookie(...cookies);

        const timestamp = Date.now();

        // 并发访问两个页面并截图
        const [shopResponse, assistantResponse] = await Promise.all([
          shopPage.goto(this.shopUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
          }),
          assistantPage.goto(this.assistantUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
          })
        ]);

        const shopStatusCode = shopResponse?.status() || 0;
        const assistantStatusCode = assistantResponse?.status() || 0;

        // 检查带货助手页面是否真的可访问
        const shopPageAccessible = await shopPage.evaluate(() => {
          const loginButton = document.querySelector('.login-btn') ||
                             document.querySelector('button[type="submit"]') ||
                             document.querySelector('.scan-login-tip');
          const userAvatar = document.querySelector('.user-avatar') ||
                            document.querySelector('.shop-name') ||
                            document.querySelector('.nav-user');
          return !loginButton && !!userAvatar;
        });
        const shopAccessible = shopStatusCode === 200 && shopPageAccessible;

        // 检查视频号助手页面是否真的可访问
        const assistantPageAccessible = await assistantPage.evaluate(() => {
          const loginButton = document.querySelector('.login-btn') ||
                             document.querySelector('button[type="submit"]') ||
                             document.querySelector('.scan-login-tip');
          const userAvatar = document.querySelector('.user-avatar') ||
                            document.querySelector('.nav-user');
          return !loginButton && !!userAvatar;
        });
        const assistantAccessible = assistantStatusCode === 200 && assistantPageAccessible;

        // 并发截图两个页面
        const shopScreenshotPath = path.join(this.auditDir, `shop_${timestamp}.png`);
        const assistantScreenshotPath = path.join(this.auditDir, `assistant_${timestamp}.png`);

        await Promise.all([
          shopPage.screenshot({ path: shopScreenshotPath, fullPage: true }),
          assistantPage.screenshot({ path: assistantScreenshotPath, fullPage: true })
        ]);

        // 生成权限消息
        let message = '';
        if (shopAccessible && assistantAccessible) {
          message = 'Cookie权限完整，可访问带货助手和视频号助手';
        } else if (shopAccessible && !assistantAccessible) {
          message = 'Cookie权限不完整，只能访问带货助手，无法访问视频号助手';
        } else if (!shopAccessible && assistantAccessible) {
          message = 'Cookie权限不完整，只能访问视频号助手，无法访问带货助手';
        } else {
          message = 'Cookie无效，无法访问带货助手和视频号助手';
        }

        // 保存审核记录
        const auditRecord = {
          id: timestamp,
          shopScreenshotPath,
          assistantScreenshotPath,
          shopAccessible,
          assistantAccessible,
          shopStatusCode,
          assistantStatusCode,
          checkedAt: new Date(),
          status: 'pending_review'
        };

        const auditRecordPath = path.join('/tmp', `audit_record_${timestamp}.json`);
        await fs.writeFile(auditRecordPath, JSON.stringify(auditRecord, null, 2));

        return {
          success: true,
          shopScreenshotPath,
          shopScreenshotUrl: `/api/video-channel/audit/shop_${timestamp}.png`,
          shopAccessible,
          shopStatusCode,
          assistantScreenshotPath,
          assistantScreenshotUrl: `/api/video-channel/audit/assistant_${timestamp}.png`,
          assistantAccessible,
          assistantStatusCode,
          message
        };
      } finally {
        await shopPage.close();
        await assistantPage.close();
      }
    } catch (error: any) {
      console.error('人工审核失败:', error);
      return {
        success: false,
        error: error.message || '人工审核失败'
      };
    }
  }

  /**
   * 发送二维码到WorkTool机器人
   * @param {string} qrcodePath - 二维码文件本地路径
   * @param {string} robotId - WorkTool机器人ID
   * @param {string} toName - 接收者名称（好友昵称或群名）
   * @param {string} extraText - 附加留言（可选）
   */
  async sendQrcodeToWorkTool(
    qrcodePath: string,
    robotId: string,
    toName: string,
    extraText: string = ''
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log('开始上传二维码到OSS:', {
        qrcodePath,
        robotId,
        toName
      });

      // 生成唯一的文件名
      const timestamp = Date.now();
      const objectName = `qrcode_${timestamp}.png`;

      // 调用后端API上传到OSS并发送
      const response = await fetch('/api/video-channel/send-qrcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qrcodePath,
          robotId,
          toName,
          objectName,
          extraText
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('二维码发送成功:', result);
        return {
          success: true,
          url: result.url
        };
      } else {
        console.error('二维码发送失败:', result.error);
        return {
          success: false,
          error: result.error || '发送失败'
        };
      }
    } catch (error: any) {
      console.error('发送二维码到WorkTool失败:', error);
      return {
        success: false,
        error: error.message || '发送失败'
      };
    }
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 6. 为用户生成专属二维码
   * @param {string} userId - 用户ID（WorkTool用户ID）
   * @param {string} robotId - 转化客服机器人ID
   */
  async generateQrcodeForUser(userId: string, robotId: string): Promise<QrcodeResult> {
    try {
      console.log(`为用户生成专属二维码: userId=${userId}, robotId=${robotId}`);

      // 生成二维码
      const qrcodeResult = await this.getQrcode();

      if (!qrcodeResult.success || !qrcodeResult.qrcodeId) {
        return {
          success: false,
          error: '生成二维码失败: ' + (qrcodeResult.error || '未知错误')
        };
      }

      // 保存二维码记录到数据库（通过API调用）
      const timestamp = Date.now();
      const qrcodeRecord = {
        id: uuidv4(),
        userId: userId,
        qrcodeId: qrcodeResult.qrcodeId,
        qrcodePath: qrcodeResult.qrcodePath,
        qrcodeUrl: qrcodeResult.qrcodeUrl,
        ossObjectName: `video-channel/qrcode_${qrcodeResult.qrcodeId}.png`,
        status: 'created',
        expiresAt: qrcodeResult.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 调用后端API保存二维码记录
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/video-channel/qrcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(qrcodeRecord)
      });

      const result = await response.json();

      if (!result.success) {
        console.error('保存二维码记录失败:', result.error);
        return {
          success: false,
          error: '保存二维码记录失败: ' + result.error
        };
      }

      // 更新当前二维码状态
      this.currentQrcodeId = qrcodeResult.qrcodeId;
      this.currentQrcodeExpiresAt = qrcodeResult.expiresAt || new Date(Date.now() + this.qrcodeLifetime);

      console.log(`专属二维码生成成功: userId=${userId}, qrcodeId=${qrcodeResult.qrcodeId}`);

      return {
        success: true,
        qrcodeId: qrcodeResult.qrcodeId,
        qrcodePath: qrcodeResult.qrcodePath,
        qrcodeUrl: qrcodeResult.qrcodeUrl,
        expiresAt: qrcodeResult.expiresAt,
        userId: userId
      };
    } catch (error: any) {
      console.error('生成专属二维码失败:', error);
      return {
        success: false,
        error: error.message || '生成专属二维码失败'
      };
    }
  }

  /**
   * 7. 发送二维码给用户（私聊）
   * @param {string} userId - 用户ID
   * @param {string} userName - 用户昵称
   * @param {string} robotId - 转化客服机器人ID
   * @param {string} qrcodePath - 二维码文件路径
   * @param {string} extraText - 附加留言
   */
  async sendQrcodeToUser(
    userId: string,
    userName: string,
    robotId: string,
    qrcodePath: string,
    extraText: string = ''
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log(`发送二维码给用户: userId=${userId}, userName=${userName}, robotId=${robotId}`);

      // 上传二维码到OSS并发送给用户
      const result = await this.sendQrcodeToWorkTool(qrcodePath, robotId, userName, extraText);

      if (result.success) {
        // 更新二维码状态为已发送
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
        await fetch(`${backendUrl}/api/video-channel/qrcode/update-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            status: 'sent'
          })
        });

        return {
          success: true,
          message: '二维码发送成功'
        };
      } else {
        return {
          success: false,
          error: result.error || '发送失败'
        };
      }
    } catch (error: any) {
      console.error('发送二维码给用户失败:', error);
      return {
        success: false,
        error: error.message || '发送二维码给用户失败'
      };
    }
  }

  /**
   * 8. 发送消息给用户
   * @param {string} userId - 用户ID
   * @param {string} robotId - 转化客服机器人ID
   * @param {string} messageType - 消息类型
   * @param {string} templateCode - 消息模板代码
   * @param {Object} variables - 变量替换
   */
  async sendMessageToUser(
    userId: string,
    robotId: string,
    messageType: string,
    templateCode: string,
    variables: Record<string, any> = {}
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log(`发送消息给用户: userId=${userId}, messageType=${messageType}, templateCode=${templateCode}`);

      // 获取用户信息
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
      const userResponse = await fetch(`${backendUrl}/api/video-channel/user/${userId}`);
      const userResult = await userResponse.json();

      if (!userResult.success || !userResult.user) {
        return {
          success: false,
          error: '获取用户信息失败'
        };
      }

      const user = userResult.user;
      const userName = user.userName;

      // 获取消息模板
      const templateResponse = await fetch(`${backendUrl}/api/video-channel/message-template/${templateCode}`);
      const templateResult = await templateResponse.json();

      if (!templateResult.success || !templateResult.template) {
        return {
          success: false,
          error: '获取消息模板失败'
        };
      }

      const template = templateResult.template;
      let messageContent = template.templateContent;

      // 替换变量
      Object.keys(variables).forEach(key => {
        messageContent = messageContent.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
      });

      // 替换用户名
      messageContent = messageContent.replace(new RegExp(`{{userName}}`, 'g'), userName);

      // 发送消息
      const response = await this.sendQrcodeToWorkTool('', robotId, userName, messageContent);

      if (response.success) {
        // 记录消息日志
        await fetch(`${backendUrl}/api/video-channel/message-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            robotId,
            messageType,
            templateCode,
            messageContent,
            status: 'sent'
          })
        });

        return {
          success: true,
          message: '消息发送成功'
        };
      } else {
        return {
          success: false,
          error: response.error || '发送消息失败'
        };
      }
    } catch (error: any) {
      console.error('发送消息给用户失败:', error);
      return {
        success: false,
        error: error.message || '发送消息给用户失败'
      };
    }
  }
}

// 导出单例
export const videoChannelAutomationService = new VideoChannelAutomationService();

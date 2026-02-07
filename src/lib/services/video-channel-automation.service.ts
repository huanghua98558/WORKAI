import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 视频号小店自动化服务
 * 提供：获取二维码、检测登录、提取Cookie、人工审核、页面可访问性检测
 */

interface QrcodeResult {
  success: boolean;
  qrcodeId?: string;
  qrcodePath?: string;
  qrcodeUrl?: string;
  qrcodeBase64?: string;
  expiresAt?: Date;
  error?: string;
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
  private browser: puppeteer.Browser | null = null;
  private qrcodeDir: string;
  private auditDir: string;
  private shopUrl = 'https://channels.weixin.qq.com/shop';
  private assistantUrl = 'https://channels.weixin.qq.com/assistant';
  private currentQrcodeId: string | null = null;
  private currentQrcodeExpiresAt: Date | null = null;
  private qrcodeLifetime = 5 * 60 * 1000; // 5分钟有效期

  constructor() {
    // 确保 /tmp 目录存在
    this.qrcodeDir = path.join('/tmp', 'qrcodes');
    this.auditDir = path.join('/tmp', 'audit');
    this.ensureDirectories();
  }

  /**
   * 检测二维码是否过期
   */
  isQrcodeExpired(): boolean {
    if (!this.currentQrcodeExpiresAt) {
      return true;
    }
    return new Date() > this.currentQrcodeExpiresAt;
  }

  /**
   * 获取二维码剩余有效时间（秒）
   */
  getQrcodeRemainingTime(): number {
    if (!this.currentQrcodeExpiresAt) {
      return 0;
    }
    const remaining = this.currentQrcodeExpiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
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
   * 1. 获取视频号小店二维码
   */
  async getQrcode(): Promise<QrcodeResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // 设置用户代理
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // 访问视频号小店登录页面
      await page.goto(this.shopUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // 等待页面加载完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 尝试查找所有可能的二维码元素
      const allImages = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map(img => ({
          src: img.src,
          alt: img.alt,
          className: img.className,
          width: img.width,
          height: img.height
        }));
      });

      console.log('页面上的图片元素:', JSON.stringify(allImages, null, 2));

      // 查找可能是二维码的图片（通常是正方形或者小图片）
      let qrcodeElement: puppeteer.ElementHandle<Element> | null = null;

      // 策略1：尝试特定的选择器
      const qrcodeSelectors = [
        '.qrcode-img',
        '.qrcode img',
        'img[alt*="二维码"]',
        'img[alt*="scan"]',
        '.login-qrcode img',
        '[class*="qrcode"] img',
        '[class*="login"] img'
      ];

      for (const selector of qrcodeSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          qrcodeElement = await page.$(selector);
          if (qrcodeElement) {
            console.log(`通过选择器 ${selector} 找到二维码元素`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // 策略2：如果没有找到，尝试通过图片尺寸查找（二维码通常是正方形）
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

      // 策略3：如果还是没有找到，截取整个页面，让用户自己识别
      if (!qrcodeElement) {
        console.log('未找到二维码元素，截取整个页面');
        const fullPageScreenshot = await page.screenshot();
        const timestamp = Date.now();
        const qrcodeId = `${timestamp}_full`;
        const qrcodePath = path.join(this.qrcodeDir, `${qrcodeId}.png`);

        await fs.writeFile(qrcodePath, fullPageScreenshot);

        // 更新当前二维码状态
        this.currentQrcodeId = qrcodeId;
        this.currentQrcodeExpiresAt = new Date(Date.now() + this.qrcodeLifetime);

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

      // 生成访问URL（实际应用中应该通过API路由提供）
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
      await page.close();
    }
  }

  /**
   * 2. 检测登录状态
   */
  async checkLoginStatus(): Promise<LoginStatusResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // 访问视频号小店页面
      await page.goto(this.shopUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // 检查是否已登录（检查页面是否有登录后的元素）
      const isLoggedIn = await page.evaluate(() => {
        // 检查是否存在登录按钮（未登录状态）
        const loginButton = document.querySelector('.login-btn') ||
                           document.querySelector('button[type="submit"]') ||
                           document.querySelector('.scan-login-tip');

        // 检查是否存在用户头像或店铺信息（已登录状态）
        const userAvatar = document.querySelector('.user-avatar') ||
                          document.querySelector('.shop-name') ||
                          document.querySelector('.nav-user');

        // 如果没有登录按钮且有用户信息，说明已登录
        return !loginButton && !!userAvatar;
      });

      if (isLoggedIn) {
        // 获取Cookie
        const cookies = await page.cookies();

        return {
          success: true,
          isLoggedIn: true,
          cookies,
          qrcodeExpired: false
        };
      } else {
        // 检测二维码是否过期
        const qrcodeExpired = this.isQrcodeExpired();

        return {
          success: true,
          isLoggedIn: false,
          qrcodeExpired
        };
      }
    } catch (error: any) {
      console.error('检测登录状态失败:', error);
      return {
        success: false,
        isLoggedIn: false,
        qrcodeExpired: this.isQrcodeExpired(),
        error: error.message || '检测登录状态失败'
      };
    } finally {
      await page.close();
    }
  }

  /**
   * 3. 检测页面可访问性
   */
  async checkPageAccessibility(cookies: any[]): Promise<PageAccessibilityResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // 设置Cookie
      await page.setCookie(...cookies);

      // 检测视频号小店页面
      const shopResponse = await page.goto(this.shopUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // 检测视频号助手页面
      const assistantResponse = await page.goto(this.assistantUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      return {
        success: true,
        shopAccessible: shopResponse?.status() === 200,
        assistantAccessible: assistantResponse?.status() === 200,
        shopStatusCode: shopResponse?.status(),
        assistantStatusCode: assistantResponse?.status()
      };
    } catch (error: any) {
      console.error('检测页面可访问性失败:', error);
      return {
        success: false,
        error: error.message || '检测页面可访问性失败'
      };
    } finally {
      await page.close();
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
   */
  async manualAudit(cookies: any[]): Promise<ManualAuditResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // 设置Cookie
      await page.setCookie(...cookies);

      const timestamp = Date.now();
      let shopAccessible = false;
      let assistantAccessible = false;
      let shopStatusCode = 0;
      let assistantStatusCode = 0;

      // 访问视频号小店页面并截图
      const shopResponse = await page.goto(this.shopUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      shopStatusCode = shopResponse?.status() || 0;

      // 检查小店页面是否真的可访问（检查是否有登录按钮）
      const shopPageAccessible = await page.evaluate(() => {
        const loginButton = document.querySelector('.login-btn') ||
                           document.querySelector('button[type="submit"]') ||
                           document.querySelector('.scan-login-tip');
        const userAvatar = document.querySelector('.user-avatar') ||
                          document.querySelector('.shop-name') ||
                          document.querySelector('.nav-user');
        return !loginButton && !!userAvatar;
      });
      shopAccessible = shopStatusCode === 200 && shopPageAccessible;

      const shopScreenshotPath = path.join(this.auditDir, `shop_${timestamp}.png`);
      await page.screenshot({
        path: shopScreenshotPath,
        fullPage: true
      });

      // 访问视频号助手页面并截图
      const assistantResponse = await page.goto(this.assistantUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      assistantStatusCode = assistantResponse?.status() || 0;

      // 检查助手页面是否真的可访问
      const assistantPageAccessible = await page.evaluate(() => {
        const loginButton = document.querySelector('.login-btn') ||
                           document.querySelector('button[type="submit"]') ||
                           document.querySelector('.scan-login-tip');
        const userAvatar = document.querySelector('.user-avatar') ||
                          document.querySelector('.nav-user');
        return !loginButton && !!userAvatar;
      });
      assistantAccessible = assistantStatusCode === 200 && assistantPageAccessible;

      const assistantScreenshotPath = path.join(this.auditDir, `assistant_${timestamp}.png`);
      await page.screenshot({
        path: assistantScreenshotPath,
        fullPage: true
      });

      // 生成权限消息
      let message = '';
      if (shopAccessible && assistantAccessible) {
        message = 'Cookie权限完整，可访问视频号小店和视频号助手';
      } else if (shopAccessible && !assistantAccessible) {
        message = 'Cookie权限不完整，只能访问视频号小店，无法访问视频号助手';
      } else if (!shopAccessible && assistantAccessible) {
        message = 'Cookie权限不完整，只能访问视频号助手，无法访问视频号小店';
      } else {
        message = 'Cookie无效，无法访问视频号小店和视频号助手';
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
    } catch (error: any) {
      console.error('人工审核失败:', error);
      return {
        success: false,
        error: error.message || '人工审核失败'
      };
    } finally {
      await page.close();
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
}

// 导出单例
export const videoChannelAutomationService = new VideoChannelAutomationService();

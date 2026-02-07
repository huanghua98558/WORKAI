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
  private browser: puppeteer.Browser | null = null;
  private qrcodeDir: string;
  private auditDir: string;
  // 视频号小店主页面（包含带货助手和视频号助手）
  private shopUrl = 'https://store.weixin.qq.com/talent/';
  // 视频号助手和小店在同一个页面内，通过导航切换
  private assistantUrl = 'https://store.weixin.qq.com/talent/';
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

/**
 * 视频号转化系统 API 路由
 * 提供用户管理、二维码管理、Cookie管理、消息模板管理等功能
 */

const videoChannelRoutes = async function (fastify, options) {
  const { getDb } = require('coze-coding-dev-sdk');
  const {
    videoChannelUsers,
    videoChannelQrcodes,
    videoChannelCookies,
    videoChannelMessageLogs,
    videoChannelMessageTemplates
  } = require('../database/video-channel-schema');
  const { eq } = require('drizzle-orm');
  const logger = require('../services/system-logger.service');

  const db = await getDb();

  // 成功响应
  const successResponse = (data = {}, message = 'success') => ({
    success: true,
    message,
    data
  });

  // 错误响应
  const errorResponse = (message = 'error', code = 400) => ({
    success: false,
    message,
    code
  });

  /**
   * 1. 创建二维码记录
   * POST /api/video-channel/qrcode
   */
  fastify.post('/qrcode', async (request, reply) => {
    try {
      const body = request.body;
      const { userId, qrcodeId, qrcodePath, qrcodeUrl, ossObjectName, expiresAt } = body;

      if (!userId || !qrcodeId || !qrcodePath) {
        return reply.status(400).send(errorResponse('缺少必要参数：userId, qrcodeId, qrcodePath'));
      }

      // 检查是否已存在该用户的二维码
      const existingQrcode = await db.select()
        .from(videoChannelQrcodes)
        .where(eq(videoChannelQrcodes.userId, userId))
        .limit(1);

      let qrcodeData;

      if (existingQrcode && existingQrcode.length > 0) {
        // 更新现有二维码
        qrcodeData = {
          qrcodeId,
          qrcodePath,
          qrcodeUrl: qrcodeUrl || existingQrcode[0].qrcodeUrl,
          ossObjectName: ossObjectName || existingQrcode[0].ossObjectName,
          expiresAt: expiresAt || new Date(Date.now() + 5 * 60 * 1000),
          status: 'created',
          updatedAt: new Date()
        };

        await db.update(videoChannelQrcodes)
          .set(qrcodeData)
          .where(eq(videoChannelQrcodes.userId, userId));

        logger.info('VideoChannel', '更新二维码记录', {
          userId,
          qrcodeId
        });
      } else {
        // 创建新二维码
        qrcodeData = {
          userId,
          qrcodeId,
          qrcodePath,
          qrcodeUrl,
          ossObjectName,
          status: 'created',
          expiresAt: expiresAt || new Date(Date.now() + 5 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.insert(videoChannelQrcodes).values(qrcodeData);

        logger.info('VideoChannel', '创建二维码记录', {
          userId,
          qrcodeId
        });
      }

      reply.send(successResponse(qrcodeData, '二维码记录创建成功'));
    } catch (error) {
      logger.error('VideoChannel', '创建二维码记录失败', { error: error.message });
      reply.status(500).send(errorResponse('创建二维码记录失败: ' + error.message));
    }
  });

  /**
   * 2. 更新二维码状态
   * POST /api/video-channel/qrcode/update-status
   */
  fastify.post('/qrcode/update-status', async (request, reply) => {
    try {
      const body = request.body;
      const { userId, status, scannedAt } = body;

      if (!userId || !status) {
        return reply.status(400).send(errorResponse('缺少必要参数：userId, status'));
      }

      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (scannedAt) {
        updateData.scannedAt = new Date(scannedAt);
      }

      await db.update(videoChannelQrcodes)
        .set(updateData)
        .where(eq(videoChannelQrcodes.userId, userId));

      logger.info('VideoChannel', '更新二维码状态', {
        userId,
        status
      });

      reply.send(successResponse({}, '二维码状态更新成功'));
    } catch (error) {
      logger.error('VideoChannel', '更新二维码状态失败', { error: error.message });
      reply.status(500).send(errorResponse('更新二维码状态失败: ' + error.message));
    }
  });

  /**
   * 3. 获取用户二维码信息
   * GET /api/video-channel/qrcode/user/:userId
   */
  fastify.get('/qrcode/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;

      const qrcode = await db.select()
        .from(videoChannelQrcodes)
        .where(eq(videoChannelQrcodes.userId, userId))
        .limit(1);

      if (!qrcode || qrcode.length === 0) {
        return reply.status(404).send(errorResponse('未找到二维码记录'));
      }

      reply.send(successResponse(qrcode[0], '获取二维码信息成功'));
    } catch (error) {
      logger.error('VideoChannel', '获取二维码信息失败', { error: error.message });
      reply.status(500).send(errorResponse('获取二维码信息失败: ' + error.message));
    }
  });

  /**
   * 4. 获取用户信息
   * GET /api/video-channel/user/:userId
   */
  fastify.get('/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;

      const user = await db.select()
        .from(videoChannelUsers)
        .where(eq(videoChannelUsers.userId, userId))
        .limit(1);

      if (!user || user.length === 0) {
        return reply.status(404).send(errorResponse('未找到用户'));
      }

      reply.send(successResponse({ user: user[0] }, '获取用户信息成功'));
    } catch (error) {
      logger.error('VideoChannel', '获取用户信息失败', { error: error.message });
      reply.status(500).send(errorResponse('获取用户信息失败: ' + error.message));
    }
  });

  /**
   * 5. 获取所有用户列表
   * GET /api/video-channel/users
   */
  fastify.get('/users', async (request, reply) => {
    try {
      const users = await db.select()
        .from(videoChannelUsers)
        .orderBy(videoChannelUsers.createdAt);

      reply.send(successResponse({ users }, '获取用户列表成功'));
    } catch (error) {
      logger.error('VideoChannel', '获取用户列表失败', { error: error.message });
      reply.status(500).send(errorResponse('获取用户列表失败: ' + error.message));
    }
  });

  /**
   * 6. 保存Cookie记录
   * POST /api/video-channel/cookie
   */
  fastify.post('/cookie', async (request, reply) => {
    try {
      const body = request.body;
      const {
        userId,
        cookieData,
        cookieCount,
        shopAccessible,
        assistantAccessible,
        shopStatusCode,
        assistantStatusCode,
        permissionStatus
      } = body;

      if (!userId || !cookieData) {
        return reply.status(400).send(errorResponse('缺少必要参数：userId, cookieData'));
      }

      // 检查是否已存在该用户的Cookie
      const existingCookie = await db.select()
        .from(videoChannelCookies)
        .where(eq(videoChannelCookies.userId, userId))
        .limit(1);

      let cookieDataObj;

      if (existingCookie && existingCookie.length > 0) {
        // 更新现有Cookie
        cookieDataObj = {
          cookieData,
          cookieCount: cookieCount || 0,
          shopAccessible: shopAccessible || false,
          assistantAccessible: assistantAccessible || false,
          shopStatusCode,
          assistantStatusCode,
          permissionStatus: permissionStatus || 'unknown',
          updatedAt: new Date()
        };

        await db.update(videoChannelCookies)
          .set(cookieDataObj)
          .where(eq(videoChannelCookies.userId, userId));

        logger.info('VideoChannel', '更新Cookie记录', {
          userId,
          permissionStatus
        });
      } else {
        // 创建新Cookie
        cookieDataObj = {
          userId,
          cookieData,
          cookieCount: cookieCount || 0,
          shopAccessible: shopAccessible || false,
          assistantAccessible: assistantAccessible || false,
          shopStatusCode,
          assistantStatusCode,
          permissionStatus: permissionStatus || 'unknown',
          extractedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          auditStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.insert(videoChannelCookies).values(cookieDataObj);

        logger.info('VideoChannel', '创建Cookie记录', {
          userId,
          permissionStatus
        });
      }

      reply.send(successResponse(cookieDataObj, 'Cookie记录保存成功'));
    } catch (error) {
      logger.error('VideoChannel', '保存Cookie记录失败', { error: error.message });
      reply.status(500).send(errorResponse('保存Cookie记录失败: ' + error.message));
    }
  });

  /**
   * 7. 获取用户Cookie信息
   * GET /api/video-channel/cookie/user/:userId
   */
  fastify.get('/cookie/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;

      const cookie = await db.select()
        .from(videoChannelCookies)
        .where(eq(videoChannelCookies.userId, userId))
        .limit(1);

      if (!cookie || cookie.length === 0) {
        return reply.status(404).send(errorResponse('未找到Cookie记录'));
      }

      reply.send(successResponse(cookie[0], '获取Cookie信息成功'));
    } catch (error) {
      logger.error('VideoChannel', '获取Cookie信息失败', { error: error.message });
      reply.status(500).send(errorResponse('获取Cookie信息失败: ' + error.message));
    }
  });

  /**
   * 8. 获取所有Cookie列表
   * GET /api/video-channel/cookies
   */
  fastify.get('/cookies', async (request, reply) => {
    try {
      const cookies = await db.select()
        .from(videoChannelCookies)
        .orderBy(videoChannelCookies.createdAt);

      reply.send(successResponse({ cookies }, '获取Cookie列表成功'));
    } catch (error) {
      logger.error('VideoChannel', '获取Cookie列表失败', { error: error.message });
      reply.status(500).send(errorResponse('获取Cookie列表失败: ' + error.message));
    }
  });

  /**
   * 9. 记录消息日志
   * POST /api/video-channel/message-log
   */
  fastify.post('/message-log', async (request, reply) => {
    try {
      const body = request.body;
      const { userId, robotId, messageType, templateCode, messageContent, status, errorMessage } = body;

      if (!userId || !robotId || !messageType) {
        return reply.status(400).send(errorResponse('缺少必要参数：userId, robotId, messageType'));
      }

      const messageLog = {
        userId,
        robotId,
        messageType,
        templateCode,
        messageContent,
        status: status || 'sent',
        sentAt: new Date(),
        errorMessage,
        createdAt: new Date()
      };

      await db.insert(videoChannelMessageLogs).values(messageLog);

      logger.info('VideoChannel', '记录消息日志', {
        userId,
        messageType,
        status
      });

      reply.send(successResponse({}, '消息日志记录成功'));
    } catch (error) {
      logger.error('VideoChannel', '记录消息日志失败', { error: error.message });
      reply.status(500).send(errorResponse('记录消息日志失败: ' + error.message));
    }
  });

  /**
   * 10. 获取消息模板
   * GET /api/video-channel/message-template/:code
   */
  fastify.get('/message-template/:code', async (request, reply) => {
    try {
      const { code } = request.params;

      const template = await db.select()
        .from(videoChannelMessageTemplates)
        .where(eq(videoChannelMessageTemplates.code, code))
        .limit(1);

      if (!template || template.length === 0) {
        return reply.status(404).send(errorResponse('未找到消息模板'));
      }

      reply.send(successResponse({ template: template[0] }, '获取消息模板成功'));
    } catch (error) {
      logger.error('VideoChannel', '获取消息模板失败', { error: error.message });
      reply.status(500).send(errorResponse('获取消息模板失败: ' + error.message));
    }
  });

  /**
   * 11. 获取所有消息模板
   * GET /api/video-channel/message-templates
   */
  fastify.get('/message-templates', async (request, reply) => {
    try {
      const templates = await db.select()
        .from(videoChannelMessageTemplates)
        .orderBy(videoChannelMessageTemplates.priority);

      reply.send(successResponse({ templates }, '获取消息模板列表成功'));
    } catch (error) {
      logger.error('VideoChannel', '获取消息模板列表失败', { error: error.message });
      reply.status(500).send(errorResponse('获取消息模板列表失败: ' + error.message));
    }
  });

  /**
   * 12. 更新用户状态
   * POST /api/video-channel/user/update-status
   */
  fastify.post('/user/update-status', async (request, reply) => {
    try {
      const body = request.body;
      const { userId, status } = body;

      if (!userId || !status) {
        return reply.status(400).send(errorResponse('缺少必要参数：userId, status'));
      }

      await db.update(videoChannelUsers)
        .set({
          status,
          updatedAt: new Date(),
          lastActiveAt: new Date()
        })
        .where(eq(videoChannelUsers.userId, userId));

      logger.info('VideoChannel', '更新用户状态', {
        userId,
        status
      });

      reply.send(successResponse({}, '用户状态更新成功'));
    } catch (error) {
      logger.error('VideoChannel', '更新用户状态失败', { error: error.message });
      reply.status(500).send(errorResponse('更新用户状态失败: ' + error.message));
    }
  });

  /**
   * 13. 发送消息给用户
   * POST /api/video-channel/send-message
   */
  fastify.post('/send-message', async (request, reply) => {
    try {
      const body = request.body;
      const { userId, robotId, messageType, templateCode, variables, messageContent } = body;

      if (!userId || !robotId || !messageType) {
        return reply.status(400).send(errorResponse('缺少必要参数：userId, robotId, messageType'));
      }

      // 获取用户信息
      const user = await db.select()
        .from(videoChannelUsers)
        .where(eq(videoChannelUsers.userId, userId))
        .limit(1);

      if (!user || user.length === 0) {
        return reply.status(404).send(errorResponse('未找到用户'));
      }

      const userName = user[0].userName;

      let finalMessageContent = messageContent;

      // 如果没有提供消息内容，从模板获取
      if (!finalMessageContent && templateCode) {
        const template = await db.select()
          .from(videoChannelMessageTemplates)
          .where(eq(videoChannelMessageTemplates.code, templateCode))
          .limit(1);

        if (!template || template.length === 0) {
          return reply.status(404).send(errorResponse('未找到消息模板'));
        }

        finalMessageContent = template[0].templateContent;

        // 替换变量
        if (variables) {
          Object.keys(variables).forEach(key => {
            finalMessageContent = finalMessageContent.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
          });
        }

        // 替换用户名
        finalMessageContent = finalMessageContent.replace(new RegExp(`{{userName}}`, 'g'), userName);
      }

      // 发送消息
      const worktoolService = require('../services/worktool.service');
      const result = await worktoolService.sendTextMessage(robotId, userName, finalMessageContent);

      if (result.success) {
        // 记录消息日志
        await db.insert(videoChannelMessageLogs).values({
          userId,
          robotId,
          messageType,
          templateCode,
          messageContent: finalMessageContent,
          status: 'sent',
          sentAt: new Date(),
          createdAt: new Date()
        });

        logger.info('VideoChannel', '消息发送成功', {
          userId,
          userName,
          messageType,
          templateCode
        });

        reply.send(successResponse({}, '消息发送成功'));
      } else {
        // 记录失败的消息日志
        await db.insert(videoChannelMessageLogs).values({
          userId,
          robotId,
          messageType,
          templateCode,
          messageContent: finalMessageContent,
          status: 'failed',
          errorMessage: result.message,
          sentAt: new Date(),
          createdAt: new Date()
        });

        logger.error('VideoChannel', '消息发送失败', {
          userId,
          userName,
          messageType,
          templateCode,
          error: result.message
        });

        reply.status(500).send(errorResponse('消息发送失败: ' + result.message));
      }
    } catch (error) {
      logger.error('VideoChannel', '发送消息失败', { error: error.message });
      reply.status(500).send(errorResponse('发送消息失败: ' + error.message));
    }
  });
};

module.exports = videoChannelRoutes;

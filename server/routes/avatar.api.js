/**
 * 用户头像上传 API
 * 使用对象存储上传和管理用户头像
 */

const { S3Storage } = require('coze-coding-dev-sdk');
const { userManager } = require('../database/userManager');
const sessionService = require('../services/session.service');
const { getLogger } = require('../lib/logger');
const { auditLogService } = require('../services/audit-log.service');

const logger = getLogger('AVATAR_API');

// 初始化对象存储客户端
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 允许的图片类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

// 最大文件大小（5MB）
const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function avatarRoutes(fastify, options) {
  /**
   * 上传头像
   */
  fastify.post('/upload', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          code: 401,
          message: '未授权',
          error: 'Unauthorized'
        });
      }

      const token = authHeader.substring(7);
      const sessionData = await sessionService.verifySession(token);

      if (!sessionData) {
        return reply.status(401).send({
          code: 401,
          message: '令牌无效或已过期',
          error: 'Unauthorized'
        });
      }

      request.user = sessionData.user;
      request.session = sessionData.session;
    }]
  }, async (request, reply) => {
    const { user } = request;

    try {
      // 获取上传的文件
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          code: 400,
          message: '未找到上传文件',
          error: 'Bad Request'
        });
      }

      // 检查文件类型
      if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          code: 400,
          message: `不支持的文件类型，仅支持: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
          error: 'Bad Request'
        });
      }

      // 检查文件大小
      const fileSize = data.file.size || data.file.bytesRead;
      if (fileSize > MAX_FILE_SIZE) {
        return reply.status(400).send({
          code: 400,
          message: `文件大小超过限制，最大允许 ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          error: 'Bad Request'
        });
      }

      // 读取文件内容
      const buffer = await data.toBuffer();

      // 生成文件名
      const fileExtension = data.filename.split('.').pop();
      const fileName = `avatars/${user.id}_${Date.now()}.${fileExtension}`;

      logger.info('[Avatar] 开始上传头像', {
        userId: user.id,
        username: user.username,
        fileName,
        fileSize,
        mimeType: data.mimetype
      });

      // 上传到对象存储
      const fileKey = await storage.uploadFile({
        fileContent: buffer,
        fileName: fileName,
        contentType: data.mimetype,
      });

      logger.info('[Avatar] 头像上传成功', {
        userId: user.id,
        fileKey
      });

      // 生成访问 URL（有效期7天）
      const avatarUrl = await storage.generatePresignedUrl({
        key: fileKey,
        expireTime: 7 * 24 * 60 * 60, // 7天
      });

      // 更新用户头像
      const updatedUser = await userManager.updateUser(user.id, {
        avatarUrl: avatarUrl,
        avatarKey: fileKey
      });

      // 记录审计日志
      await auditLogService.logAction({
        userId: user.id,
        action: 'update_avatar',
        actionType: 'update',
        resourceType: 'user',
        resourceId: user.id,
        resourceName: user.username,
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: {
          fileKey,
          fileSize
        }
      });

      return reply.send({
        code: 0,
        message: '头像上传成功',
        data: {
          avatarUrl,
          avatarKey: fileKey,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    } catch (error) {
      logger.error('[Avatar] 上传头像失败', {
        userId: request.user?.id,
        error: error.message
      });

      // 记录审计日志
      if (request.user) {
        await auditLogService.logAction({
          userId: request.user.id,
          action: 'update_avatar',
          actionType: 'update',
          resourceType: 'user',
          resourceId: request.user.id,
          status: 'failed',
          errorMessage: error.message,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        });
      }

      return reply.status(500).send({
        code: 500,
        message: '上传失败',
        error: error.message
      });
    }
  });

  /**
   * 刷新头像访问 URL
   */
  fastify.post('/refresh-url', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          code: 401,
          message: '未授权',
          error: 'Unauthorized'
        });
      }

      const token = authHeader.substring(7);
      const sessionData = await sessionService.verifySession(token);

      if (!sessionData) {
        return reply.status(401).send({
          code: 401,
          message: '令牌无效或已过期',
          error: 'Unauthorized'
        });
      }

      request.user = sessionData.user;
      request.session = sessionData.session;
    }]
  }, async (request, reply) => {
    const { user } = request;

    try {
      if (!user.avatarKey) {
        return reply.status(404).send({
          code: 404,
          message: '用户未设置头像',
          error: 'Not Found'
        });
      }

      // 生成新的访问 URL
      const avatarUrl = await storage.generatePresignedUrl({
        key: user.avatarKey,
        expireTime: 7 * 24 * 60 * 60, // 7天
      });

      // 更新用户头像 URL
      await userManager.updateUser(user.id, {
        avatarUrl
      });

      return reply.send({
        code: 0,
        message: '头像 URL 刷新成功',
        data: {
          avatarUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    } catch (error) {
      logger.error('[Avatar] 刷新头像 URL 失败', {
        userId: request.user?.id,
        error: error.message
      });

      return reply.status(500).send({
        code: 500,
        message: '刷新失败',
        error: error.message
      });
    }
  });

  /**
   * 删除头像
   */
  fastify.delete('/delete', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          code: 401,
          message: '未授权',
          error: 'Unauthorized'
        });
      }

      const token = authHeader.substring(7);
      const sessionData = await sessionService.verifySession(token);

      if (!sessionData) {
        return reply.status(401).send({
          code: 401,
          message: '令牌无效或已过期',
          error: 'Unauthorized'
        });
      }

      request.user = sessionData.user;
      request.session = sessionData.session;
    }]
  }, async (request, reply) => {
    const { user } = request;

    try {
      if (!user.avatarKey) {
        return reply.status(404).send({
          code: 404,
          message: '用户未设置头像',
          error: 'Not Found'
        });
      }

      // 删除对象存储中的文件
      await storage.deleteFile({
        fileKey: user.avatarKey
      });

      // 更新用户记录，清除头像
      await userManager.updateUser(user.id, {
        avatarUrl: null,
        avatarKey: null
      });

      logger.info('[Avatar] 头像删除成功', {
        userId: user.id,
        fileKey: user.avatarKey
      });

      // 记录审计日志
      await auditLogService.logAction({
        userId: user.id,
        action: 'delete_avatar',
        actionType: 'delete',
        resourceType: 'user',
        resourceId: user.id,
        resourceName: user.username,
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: {
          deletedKey: user.avatarKey
        }
      });

      return reply.send({
        code: 0,
        message: '头像删除成功'
      });
    } catch (error) {
      logger.error('[Avatar] 删除头像失败', {
        userId: request.user?.id,
        error: error.message
      });

      return reply.status(500).send({
        code: 500,
        message: '删除失败',
        error: error.message
      });
    }
  });
}

module.exports = avatarRoutes;

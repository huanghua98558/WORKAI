/**
 * 上传图片到OSS并发送到WorkTool机器人
 */

const ossService = require('../services/oss.service');
const worktoolService = require('../services/worktool.service');
const { successResponse, errorResponse } = require('../lib/utils');
const logger = require('../services/system-logger.service');

/**
 * 上传Base64图片到OSS并发送到WorkTool
 */
async function sendOssImageRoute(fastify) {
  fastify.post('/api/worktool/send-oss-image', async (request, reply) => {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { base64Data, objectName, robotId, toName, extraText, folder } = request.body;

      // 验证参数
      if (!base64Data || !objectName || !robotId || !toName) {
        logger.warn('WorkTool', '发送OSS图片失败：缺少必要参数', {
          requestId,
          hasBase64Data: !!base64Data,
          hasObjectName: !!objectName,
          hasRobotId: !!robotId,
          hasToName: !!toName
        });
        return reply.status(400).send(errorResponse(400, '缺少必要参数'));
      }

      logger.info('WorkTool', '开始处理发送OSS图片请求', {
        requestId,
        robotId,
        toName,
        objectName,
        folder,
        hasExtraText: !!extraText,
        base64Length: base64Data.length,
        timestamp: new Date().toISOString()
      });

      console.log('[WorkTool] 开始处理发送OSS图片:', {
        requestId,
        robotId,
        toName,
        objectName,
        folder
      });

      // 步骤1：上传Base64图片到OSS
      const uploadResult = await ossService.uploadBase64Image(base64Data, objectName, folder);

      if (!uploadResult.success) {
        logger.error('WorkTool', '上传图片到OSS失败', {
          requestId,
          robotId,
          objectName,
          folder,
          error: uploadResult.error,
          errorCode: uploadResult.errorCode
        });

        return reply.status(500).send(errorResponse(500, '上传图片到OSS失败: ' + uploadResult.error));
      }

      logger.info('WorkTool', '图片上传到OSS成功', {
        requestId,
        robotId,
        objectName,
        url: uploadResult.url,
        processingTime: uploadResult.processingTime
      });

      console.log('[WorkTool] 图片上传到OSS成功:', {
        requestId,
        url: uploadResult.url
      });

      // 步骤2：通过WorkTool发送图片消息
      const sendResult = await worktoolService.sendImage(
        robotId,
        toName,
        uploadResult.url,
        objectName,
        extraText || ''
      );

      if (!sendResult.success) {
        logger.error('WorkTool', '发送WorkTool图片消息失败', {
          requestId,
          robotId,
          toName,
          url: uploadResult.url,
          error: sendResult.message,
          code: sendResult.code
        });

        // 如果WorkTool发送失败，尝试删除已上传的OSS文件
        try {
          await ossService.deleteFile(uploadResult.objectName);
          logger.info('WorkTool', '已清理OSS文件', {
            requestId,
            objectName: uploadResult.objectName
          });
        } catch (deleteError) {
          logger.warn('WorkTool', '清理OSS文件失败', {
            requestId,
            objectName: uploadResult.objectName,
            error: deleteError.message
          });
        }

        return reply.status(500).send(errorResponse(500, '发送WorkTool图片消息失败: ' + sendResult.message));
      }

      const processingTime = Date.now() - startTime;

      logger.info('WorkTool', '发送OSS图片成功', {
        requestId,
        robotId,
        toName,
        url: uploadResult.url,
        sendId: sendResult.sendId,
        processingTime,
        timestamp: new Date().toISOString()
      });

      console.log('[WorkTool] 发送OSS图片成功:', {
        requestId,
        url: uploadResult.url,
        sendId: sendResult.sendId,
        processingTime
      });

      return reply.send(successResponse({
        url: uploadResult.url,
        objectName: uploadResult.objectName,
        sendId: sendResult.sendId,
        processingTime
      }, '发送成功'));
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('WorkTool', '发送OSS图片异常', {
        requestId,
        error: error.message,
        stack: error.stack,
        errorType: error.constructor.name,
        processingTime,
        timestamp: new Date().toISOString()
      });

      console.error('[WorkTool] 发送OSS图片异常:', error);

      return reply.status(500).send(errorResponse(500, error.message));
    }
  });
}

module.exports = sendOssImageRoute;

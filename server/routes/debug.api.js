/**
 * 调试功能 API 路由
 */

const worktoolService = require('../services/worktool.service');
const logger = require('../services/system-logger.service');

// 认证中间件
const { authMiddleware, requireRole, ROLES } = require('../middleware/auth');

const debugApiRoutes = async function (fastify, options) {
  console.log('[debug.api.js] 调试功能 API 路由已加载');

  // 发送消息 - 需要认证，仅管理员和操作员可操作
  fastify.post('/debug/send-message', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    const startTime = Date.now();
    const debugId = `debug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const { robotId, messageType, recipient, content } = request.body;

      // 参数标准化：确保 robotId 正确读取（兼容不同大小写形式）
      const normalizedRobotId = request.body.robotId || request.body.robotid;

      console.log('[debug.api.js] 发送消息请求:', {
        debugId,
        robotId,
        normalizedRobotId,
        messageType,
        recipient,
        content,
        allBody: request.body
      });

      // 记录调试开始日志
      logger.info('DebugOperation', '调试发送消息开始', {
        debugId,
        robotId: normalizedRobotId,
        messageType,
        recipient,
        content: content ? content.substring(0, 100) : '',
        timestamp: new Date().toISOString()
      });

      if (!normalizedRobotId) {
        console.error('[debug.api.js] 缺少 robotId 参数');
        logger.warn('DebugOperation', '调试发送消息失败：缺少 robotId', { debugId });
        return reply.status(400).send({
          code: -1,
          message: '缺少必要参数：robotId'
        });
      }

      if (!recipient || !content) {
        logger.warn('DebugOperation', '调试发送消息失败：缺少接收方或内容', { debugId, robotId: normalizedRobotId });
        return reply.status(400).send({
          code: -1,
          message: '缺少必要参数：接收方或消息内容'
        });
      }

      // 获取指定的机器人
      const robotService = require('../services/robot.service');
      const robot = await robotService.getRobotByRobotId(normalizedRobotId);

      if (!robot) {
        logger.warn('DebugOperation', '调试发送消息失败：机器人不存在', { debugId, robotId: normalizedRobotId });
        return reply.status(404).send({
          code: -1,
          message: `机器人不存在: ${normalizedRobotId}`
        });
      }

      if (!robot.isActive) {
        logger.warn('DebugOperation', '调试发送消息失败：机器人未启用', { debugId, robotId: normalizedRobotId });
        return reply.status(403).send({
          code: -1,
          message: `机器人未启用: ${normalizedRobotId}`
        });
      }

      let result;

      logger.info('DebugOperation', '调试发送消息：调用 WorkTool API', {
        debugId,
        robotId: normalizedRobotId,
        robotName: robot.name,
        messageType,
        recipient
      });

      if (messageType === 'private') {
        // 发送私聊消息
        result = await worktoolService.sendPrivateMessage(robot.robotId, recipient, content);
      } else if (messageType === 'group') {
        // 发送群聊消息
        result = await worktoolService.sendGroupMessage(robot.robotId, recipient, content);
      } else {
        logger.warn('DebugOperation', '调试发送消息失败：无效的发送类型', { debugId, messageType });
        return reply.status(400).send({
          code: -1,
          message: '无效的发送类型'
        });
      }

      const processingTime = Date.now() - startTime;

      if (result.success) {
        logger.info('DebugOperation', '调试发送消息成功', {
          debugId,
          robotId: normalizedRobotId,
          robotName: robot.name,
          messageType,
          recipient,
          contentLength: content.length,
          processingTime,
          response: result.data
        });

        return reply.send({
          code: 0,
          message: '发送成功',
          data: {
            robotId: robot.robotId,
            robotName: robot.name,
            recipient,
            messageType,
            content,
            response: result.data,
            debugId,
            processingTime
          }
        });
      } else {
        logger.error('DebugOperation', '调试发送消息失败', {
          debugId,
          robotId: normalizedRobotId,
          robotName: robot.name,
          messageType,
          recipient,
          error: result.message || result.error,
          processingTime
        });

        return reply.status(400).send({
          code: -1,
          message: result.message || '发送失败',
          error: result.error
        });
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error('[debug.api.js] 发送消息失败:', error);
      logger.error('DebugOperation', '调试发送消息异常', {
        debugId,
        robotId: normalizedRobotId,
        error: error.message,
        stack: error.stack,
        processingTime
      });

      return reply.status(500).send({
        code: -1,
        message: '发送消息失败',
        error: error.message
      });
    }
  });

  // 群操作 - 需要认证，仅管理员和操作员可操作
  fastify.post('/debug/group-operation', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    const debugId = `group-op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    let robot = null;
    
    try {
      const { robotId, operationType, groupName, newGroupName, members, groupAnnouncement, groupRemark, selectList, removeList, showMessageHistory, groupTemplate } = request.body;

      logger.info('群操作开始', {
        debugId,
        robotId,
        operationType,
        groupName,
        timestamp: new Date().toISOString()
      });

      if (!robotId) {
        logger.warn('群操作参数缺失', {
          debugId,
          error: '缺少必要参数：robotId'
        });
        return reply.status(400).send({
          code: -1,
          message: '缺少必要参数：robotId'
        });
      }

      if (!groupName) {
        logger.warn('群操作参数缺失', {
          debugId,
          robotId,
          error: '缺少必要参数：群名称'
        });
        return reply.status(400).send({
          code: -1,
          message: '缺少必要参数：群名称'
        });
      }

      // 获取指定的机器人
      const robotService = require('../services/robot.service');
      robot = await robotService.getRobotByRobotId(robotId);

      if (!robot) {
        logger.warn('群操作机器人不存在', {
          debugId,
          robotId,
          error: `机器人不存在: ${robotId}`
        });
        return reply.status(404).send({
          code: -1,
          message: `机器人不存在: ${robotId}`
        });
      }

      if (!robot.isActive) {
        logger.warn('群操作机器人未启用', {
          debugId,
          robotId,
          robotName: robot.name,
          error: `机器人未启用: ${robotId}`
        });
        return reply.status(403).send({
          code: -1,
          message: `机器人未启用: ${robotId}`
        });
      }

      // 构建 API 请求
      const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
      const apiUrl = `${baseUrl}/wework/sendRawMessage`;
      const axios = require('axios');

      let requestBody;

      if (operationType === 'create') {
        // 创建群 - type = 206
        requestBody = {
          socketType: 2,
          list: [
            {
              type: 206,
              groupName: groupName,
              selectList: selectList || [],
              ...(groupAnnouncement && { groupAnnouncement }),
              ...(groupRemark && { groupRemark }),
              ...(groupTemplate && { groupTemplate })
            }
          ]
        };
      } else if (operationType === 'modify') {
        // 修改群 - type = 207
        requestBody = {
          socketType: 2,
          list: [
            {
              type: 207,
              groupName: groupName,
              ...(newGroupName && { newGroupName }),
              ...(groupAnnouncement && { newGroupAnnouncement: groupAnnouncement }),
              ...(groupRemark && { groupRemark }),
              ...(groupTemplate && { groupTemplate }),
              ...(selectList && { selectList }),
              ...(showMessageHistory !== undefined && { showMessageHistory }),
              ...(removeList && { removeList })
            }
          ]
        };
      } else if (operationType === 'dismiss') {
        // 解散群 - type = 219
        requestBody = {
          socketType: 2,
          list: [
            {
              type: 219,
              groupName: groupName
            }
          ]
        };
      } else {
        logger.warn('群操作无效操作类型', {
          debugId,
          robotId,
          robotName: robot.name,
          operationType,
          error: '无效的操作类型'
        });
        return reply.status(400).send({
          code: -1,
          message: '无效的操作类型'
        });
      }

      logger.info('群操作调用API', {
        debugId,
        robotId,
        robotName: robot.name,
        operationType,
        groupName,
        apiUrl,
        requestBody: JSON.stringify(requestBody)
      });

      // 调用 WorkTool API
      const response = await axios.post(apiUrl, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        params: { robotId: robot.robotId },
        timeout: 15000
      });

      const processingTime = Date.now() - startTime;

      if (response.data && response.data.code === 0) {
        logger.info('群操作成功', {
          debugId,
          robotId,
          robotName: robot.name,
          operationType,
          groupName,
          processingTime,
          response: JSON.stringify(response.data),
          timestamp: new Date().toISOString()
        });
        
        return reply.send({
          code: 0,
          message: '操作成功',
          data: {
            robotId: robot.robotId,
            robotName: robot.name,
            operationType,
            groupName,
            response: response.data
          }
        });
      } else {
        logger.warn('群操作API返回失败', {
          debugId,
          robotId,
          robotName: robot.name,
          operationType,
          groupName,
          processingTime,
          apiResponse: JSON.stringify(response.data),
          timestamp: new Date().toISOString()
        });
        
        return reply.status(400).send({
          code: -1,
          message: response.data?.message || '操作失败',
          data: response.data
        });
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('群操作异常', {
        debugId,
        robotId: robot?.robotId,
        robotName: robot?.name,
        operationType,
        groupName,
        processingTime,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      console.error('群操作失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '群操作失败',
        error: error.message
      });
    }
  });

  // 推送文件 - 需要认证，仅管理员和操作员可操作
  fastify.post('/debug/push-file', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { robotId, recipient, fileType, fileName, fileUrl, remark } = request.body;

      if (!robotId) {
        return reply.status(400).send({
          code: -1,
          message: '缺少必要参数：robotId'
        });
      }

      if (!recipient || !fileUrl) {
        return reply.status(400).send({
          code: -1,
          message: '缺少必要参数：接收方或文件 URL'
        });
      }

      // 验证文件类型
      const validFileTypes = ['image', 'audio', 'video', '*'];
      if (!validFileTypes.includes(fileType)) {
        return reply.status(400).send({
          code: -1,
          message: '无效的文件类型，必须是：image, audio, video 或 *'
        });
      }

      // 获取指定的机器人
      const robotService = require('../services/robot.service');
      const robot = await robotService.getRobotByRobotId(robotId);

      if (!robot) {
        return reply.status(404).send({
          code: -1,
          message: `机器人不存在: ${robotId}`
        });
      }

      if (!robot.isActive) {
        return reply.status(403).send({
          code: -1,
          message: `机器人未启用: ${robotId}`
        });
      }

      // 构建 API 请求 - type = 218
      const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
      const apiUrl = `${baseUrl}/wework/sendRawMessage`;
      const axios = require('axios');

      const requestBody = {
        socketType: 2,
        list: [
          {
            type: 218,
            titleList: [recipient],
            objectName: fileName || `file_${Date.now()}`,
            fileUrl: fileUrl,
            fileType: fileType,
            ...(remark && { extraText: remark })
          }
        ]
      };

      // 调用 WorkTool API
      const response = await axios.post(apiUrl, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        params: { robotId: robot.robotId },
        timeout: 30000 // 文件可能需要更长时间
      });

      if (response.data && response.data.code === 0) {
        return reply.send({
          code: 0,
          message: '推送成功',
          data: {
            robotId: robot.robotId,
            robotName: robot.name,
            recipient,
            fileType,
            fileName,
            fileUrl,
            remark,
            response: response.data
          }
        });
      } else {
        return reply.status(400).send({
          code: -1,
          message: response.data?.message || '推送失败',
          data: response.data
        });
      }
    } catch (error) {
      console.error('推送文件失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '推送文件失败',
        error: error.message
      });
    }
  });
};

module.exports = debugApiRoutes;

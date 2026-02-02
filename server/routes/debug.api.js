/**
 * 调试功能 API 路由
 */

const worktoolService = require('../services/worktool.service');

const debugApiRoutes = async function (fastify, options) {
  console.log('[debug.api.js] 调试功能 API 路由已加载');
  
  // 发送消息
  fastify.post('/debug/send-message', async (request, reply) => {
    try {
      const { messageType, recipient, content } = request.body;

      if (!recipient || !content) {
        return reply.status(400).send({
          code: -1,
          message: '缺少必要参数：接收方或消息内容'
        });
      }

      // 获取在线的机器人
      const robotService = require('../services/robot.service');
      const robots = await robotService.getAllRobots({ isActive: true, status: 'online' });

      if (robots.length === 0) {
        return reply.status(400).send({
          code: -1,
          message: '没有可用的在线机器人'
        });
      }

      // 使用第一个在线机器人
      const robot = robots[0];
      let result;

      if (messageType === 'private') {
        // 发送私聊消息
        result = await worktoolService.sendPrivateMessage(robot.robotId, recipient, content);
      } else if (messageType === 'group') {
        // 发送群聊消息
        result = await worktoolService.sendGroupMessage(robot.robotId, recipient, content);
      } else {
        return reply.status(400).send({
          code: -1,
          message: '无效的发送类型'
        });
      }

      if (result.success) {
        return reply.send({
          code: 0,
          message: '发送成功',
          data: {
            robotId: robot.robotId,
            robotName: robot.name,
            recipient,
            messageType,
            content,
            response: result.data
          }
        });
      } else {
        return reply.status(400).send({
          code: -1,
          message: result.message || '发送失败',
          error: result.error
        });
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '发送消息失败',
        error: error.message
      });
    }
  });

  // 群操作
  fastify.post('/debug/group-operation', async (request, reply) => {
    try {
      const { operationType, groupName, newGroupName, members, groupAnnouncement, groupRemark, selectList, removeList, showMessageHistory, groupTemplate } = request.body;

      if (!groupName) {
        return reply.status(400).send({
          code: -1,
          message: '缺少必要参数：群名称'
        });
      }

      // 获取在线的机器人
      const robotService = require('../services/robot.service');
      const robots = await robotService.getAllRobots({ isActive: true, status: 'online' });

      if (robots.length === 0) {
        return reply.status(400).send({
          code: -1,
          message: '没有可用的在线机器人'
        });
      }

      const robot = robots[0];

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
        return reply.status(400).send({
          code: -1,
          message: '无效的操作类型'
        });
      }

      // 调用 WorkTool API
      const response = await axios.post(apiUrl, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        params: { robotId: robot.robotId },
        timeout: 15000
      });

      if (response.data && response.data.code === 0) {
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
        return reply.status(400).send({
          code: -1,
          message: response.data?.message || '操作失败',
          data: response.data
        });
      }
    } catch (error) {
      console.error('群操作失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '群操作失败',
        error: error.message
      });
    }
  });

  // 推送文件
  fastify.post('/debug/push-file', async (request, reply) => {
    try {
      const { recipient, fileType, fileName, fileUrl, remark } = request.body;

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

      // 获取在线的机器人
      const robotService = require('../services/robot.service');
      const robots = await robotService.getAllRobots({ isActive: true, status: 'online' });

      if (robots.length === 0) {
        return reply.status(400).send({
          code: -1,
          message: '没有可用的在线机器人'
        });
      }

      const robot = robots[0];

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

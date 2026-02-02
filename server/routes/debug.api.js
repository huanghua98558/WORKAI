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

  // 群操作（待实现，需要 WorkTool API 信息）
  fastify.post('/debug/group-operation', async (request, reply) => {
    try {
      const { operationType, groupName, newGroupName, members } = request.body;

      // TODO: 实现群操作功能
      // 需要以下 API 信息：
      // - 创建群 API 端点和参数
      // - 修改群 API 端点和参数
      // - 解散群 API 端点和参数

      return reply.status(501).send({
        code: -1,
        message: '群操作功能待实现，请联系开发者获取 WorkTool API 文档'
      });
    } catch (error) {
      console.error('群操作失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '群操作失败',
        error: error.message
      });
    }
  });

  // 推送文件（待实现，需要 WorkTool API 信息）
  fastify.post('/debug/push-file', async (request, reply) => {
    try {
      const { recipient, fileType, fileName, fileUrl, remark } = request.body;

      // TODO: 实现推送文件功能
      // 需要以下 API 信息：
      // - 推送文件 API 端点
      // - 请求参数格式

      return reply.status(501).send({
        code: -1,
        message: '推送文件功能待实现，请联系开发者获取 WorkTool API 文档'
      });
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

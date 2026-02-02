/**
 * AI IO API 路由
 * 提供实时 AI 输入输出查询接口
 */

const aiIoApiRoutes = async function (fastify, options) {
  const { getDb } = require('coze-coding-dev-sdk');
  const { sql } = require('drizzle-orm');

  /**
   * 获取实时 AI 输入输出
   */
  fastify.get('/ai-io', async (request, reply) => {
    try {
      const { limit = 50, robotId, type } = request.query;

      const db = await getDb();

      // 构建基础查询
      let query = sql`
        SELECT 
          id, 
          session_id as "sessionId", 
          message_id as "messageId", 
          user_id as "userId", 
          group_id as "groupId", 
          user_name as "userName", 
          group_name as "groupName", 
          robot_id as "robotId", 
          robot_name as "robotName", 
          content, 
          is_from_user as "isFromUser", 
          is_from_bot as "isFromBot", 
          is_human as "isHuman", 
          intent, 
          confidence, 
          timestamp, 
          created_at as "createdAt",
          extra_data as "extraData"
        FROM session_messages 
        WHERE 1=1
      `;

      // 应用类型过滤
      if (type && type !== 'all') {
        if (type === 'user') {
          query = sql`${query} AND is_from_user = true`;
        } else if (type === 'bot') {
          query = sql`${query} AND is_from_bot = true`;
        }
      }

      // 应用机器人过滤
      if (robotId) {
        query = sql`${query} AND robot_id = ${robotId}`;
      }

      // 排序和限制
      query = sql`${query} ORDER BY created_at DESC LIMIT ${limit}`;

      const result = await db.execute(query);
      const messages = result.rows || [];

      // 格式化返回数据
      const formattedMessages = messages.map((msg) => ({
        id: msg.id,
        type: msg.isFromUser ? 'user' : msg.isFromBot ? 'bot' : 'other',
        sessionId: msg.sessionId,
        messageId: msg.messageId,
        userId: msg.userId,
        groupId: msg.groupId,
        userName: msg.userName || 'Unknown',
        groupName: msg.groupName || 'Unknown',
        robotId: msg.robotId,
        robotName: msg.robotName,
        content: msg.content,
        intent: msg.intent,
        confidence: msg.confidence,
        timestamp: msg.createdAt,
        metadata: msg.extraData || {}
      }));

      return {
        success: true,
        data: formattedMessages
      };
    } catch (error) {
      console.error('获取实时 AI 输入输出失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
};

module.exports = aiIoApiRoutes;

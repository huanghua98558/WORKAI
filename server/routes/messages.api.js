/**
 * 消息管理API
 *
 * 提供消息发送、查询等功能
 */

const { getDb } = require('coze-coding-dev-sdk');
const { getLogger } = require('../lib/logger');

const logger = getLogger('MESSAGES-API');

async function messagesApiRoutes(fastify, options) {
  console.log('[MESSAGES-API] 消息API正在注册...');

  /**
   * 发送消息
   * POST /api/messages
   */
  fastify.post('/messages', async (request, reply) => {
    const { sessionId, robotId, content, senderId, senderType, senderName } = request.body;

    try {
      const db = await getDb();
      const sql = db.session.client;
      
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 插入消息到数据库（触发器会自动发送SSE通知）
      await sql.query(`
        INSERT INTO messages (
          id,
          session_id,
          robot_id,
          content,
          sender_id,
          sender_type,
          sender_name,
          message_type,
          content_type,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        messageId,
        sessionId,
        robotId || 'default-robot',
        content,
        senderId || 'unknown',
        senderType || 'user',
        senderName || senderType || 'user',
        'message',
        'text'
      ]);

      logger.info('消息已发送', { sessionId, messageId });

      return reply.send({
        success: true,
        data: {
          id: messageId,
          sessionId,
          content,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('发送消息失败', { error: error.message });
      return reply.status(500).send({
        success: false,
        message: '发送消息失败',
        error: error.message,
      });
    }
  });

  /**
   * 获取消息历史
   * GET /api/messages?sessionId=xxx&limit=50
   */
  fastify.get('/messages', async (request, reply) => {
    const { sessionId, limit = 50, offset = 0 } = request.query;

    try {
      const db = await getDb();
      const sql = db.session.client;

      // 获取消息历史
      const result = await sql.query(`
        SELECT 
          id,
          session_id as "sessionId",
          robot_id as "robotId",
          content,
          sender_id as "senderId",
          sender_type as "senderType",
          sender_name as "senderName",
          message_type as "messageType",
          created_at as "createdAt"
        FROM messages
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [sessionId, parseInt(limit), parseInt(offset)]);

      // 反转数组，按时间正序返回
      const messages = result.rows.reverse();

      logger.info('获取消息历史', { sessionId, count: messages.length });

      return reply.send({
        success: true,
        data: {
          messages,
          total: messages.length,
        },
      });
    } catch (error) {
      logger.error('获取消息历史失败', { error: error.message });
      return reply.status(500).send({
        success: false,
        message: '获取消息历史失败',
        error: error.message,
      });
    }
  });

  /**
   * 清空会话消息
   * DELETE /api/messages?sessionId=xxx
   */
  fastify.delete('/messages', async (request, reply) => {
    const { sessionId } = request.query;

    if (!sessionId) {
      return reply.status(400).send({
        success: false,
        message: '缺少sessionId参数',
      });
    }

    try {
      const db = await getDb();
      const sql = db.session.client;

      // 删除会话的所有消息
      await sql.query(`
        DELETE FROM messages
        WHERE session_id = $1
      `, [sessionId]);

      logger.info('清空消息成功', { sessionId });

      return reply.send({
        success: true,
        message: '消息已清空',
      });
    } catch (error) {
      logger.error('清空消息失败', { error: error.message });
      return reply.status(500).send({
        success: false,
        message: '清空消息失败',
        error: error.message,
      });
    }
  });

  console.log('[MESSAGES-API] 消息API注册完成');
}

module.exports = messagesApiRoutes;

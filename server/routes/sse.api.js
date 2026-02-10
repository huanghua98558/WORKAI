/**
 * SSE（Server-Sent Events）实时消息推送API
 *
 * 使用PostgreSQL LISTEN/NOTIFY机制实现实时消息推送
 *
 * 功能：
 * - 实时推送新消息
 * - 支持按会话过滤
 * - 自动重连机制
 * - 心跳保活
 */

const { getDb } = require('coze-coding-dev-sdk');
const { getLogger } = require('../lib/logger');
const pg = require('pg');

const logger = getLogger('SSE-API');

/**
 * SSE消息推送路由
 *
 * GET /api/sse/messages?sessionId=<sessionId>
 *
 * 参数：
 * - sessionId: 会话ID（可选，如果不提供则监听全局消息）
 * - robotId: 机器人ID（可选）
 *
 * 返回：
 * - SSE流，实时推送消息
 */
async function sseMessageRoutes(fastify, options) {
  console.log('[SSE-API] SSE路由正在注册...');

  // 存储所有活跃的SSE连接
  const activeConnections = new Map();

  // 测试路由
  fastify.get('/sse/test', async (request, reply) => {
    console.log('[SSE-API] 测试路由被调用');
    return reply.send({ success: true, message: 'SSE路由正常工作' });
  });

  // 消息推送函数
  const broadcastMessage = (channel, message) => {
    const connections = activeConnections.get(channel);
    if (connections) {
      connections.forEach((connection) => {
        try {
          connection.write(`data: ${JSON.stringify(message)}\n\n`);
        } catch (error) {
          logger.error('推送消息失败', { error: error.message });
          // 移除失效的连接
          connections.delete(connection);
        }
      });
    }
  };

  // 定期清理失效的连接
  setInterval(() => {
    activeConnections.forEach((connections, channel) => {
      connections.forEach((connection) => {
        if (connection.writableEnded) {
          connections.delete(connection);
        }
      });

      if (connections.size === 0) {
        activeConnections.delete(channel);
      }
    });
  }, 30000); // 每30秒清理一次

  // SSE消息推送端点
  fastify.get('/sse/messages', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: '会话ID' },
          robotId: { type: 'string', description: '机器人ID' },
        },
        required: [],
      },
    },
  }, async (request, reply) => {
    const { sessionId, robotId } = request.query;

    // 设置SSE响应头
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // 发送SSE消息的辅助函数
    const sendSSEMessage = (data) => {
      try {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        logger.error('发送SSE消息失败', { error: error.message });
      }
    };

    // 发送连接成功消息
    sendSSEMessage({
      type: 'connected',
      message: 'SSE连接成功',
      timestamp: new Date().toISOString(),
      sessionId: sessionId || 'global',
    });

    // 监听的通道
    const channel = sessionId ? `session_messages:${sessionId}` : 'session_messages:global';

    try {
      // 获取原始PostgreSQL客户端
      const db = await getDb();
      const sql = db.session.client;

      if (!sql) {
        throw new Error('无法获取PostgreSQL客户端');
      }

      // 开始监听PostgreSQL通知
      await sql.query(`LISTEN ${channel}`);

      logger.info('开始监听SSE通道', { channel, sessionId, robotId });

      // 添加到活跃连接列表
      if (!activeConnections.has(channel)) {
        activeConnections.set(channel, new Set());
      }
      activeConnections.get(channel).add(reply.raw);

      // 监听PostgreSQL通知事件
      const handleNotification = (notification) => {
        try {
          const payload = JSON.parse(notification.payload);

          // 如果指定了robotId，则过滤
          if (robotId && payload.robotId && payload.robotId !== robotId) {
            return;
          }

          // 发送新消息到前端
          sendSSEMessage({
            type: 'message',
            data: payload,
            timestamp: new Date().toISOString(),
          });

          logger.info('推送新消息', {
            messageId: payload.id,
            sessionId: payload.sessionId,
            channel,
          });
        } catch (error) {
          logger.error('处理通知失败', { error: error.message, payload: notification.payload });
        }
      };

      // 注册通知监听器
      sql.on('notification', handleNotification);

      // 心跳保活（每30秒发送一次）
      const heartbeatInterval = setInterval(() => {
        try {
          sendSSEMessage({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          // 客户端已断开，清理资源
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // 客户端断开连接时清理资源
      request.raw.on('close', () => {
        logger.info('SSE连接已断开', { channel, sessionId });

        // 移除连接
        const connections = activeConnections.get(channel);
        if (connections) {
          connections.delete(reply.raw);
        }

        // 清理定时器
        clearInterval(heartbeatInterval);

        // 取消监听PostgreSQL通知
        const sql = db.session.client;
        sql.removeListener('notification', handleNotification);
        sql.query(`UNLISTEN ${channel}`).catch((err) => {
          logger.warn('取消监听失败', { error: err.message });
        });
      });

    } catch (error) {
      logger.error('SSE连接初始化失败', { error: error.message, sessionId });
      sendSSEMessage({
        type: 'error',
        message: 'SSE连接初始化失败',
        error: error.message,
      });
      reply.raw.end();
    }
  });

  // 获取SSE连接统计信息
  fastify.get('/sse/stats', async (request, reply) => {
    const stats = {
      totalConnections: 0,
      channels: {},
    };

    activeConnections.forEach((connections, channel) => {
      stats.totalConnections += connections.size;
      stats.channels[channel] = connections.size;
    });

    return reply.send({
      success: true,
      data: stats,
    });
  });
}

module.exports = sseMessageRoutes;

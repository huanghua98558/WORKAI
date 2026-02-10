/**
 * 添加SSE通知机制
 *
 * 使用PostgreSQL的LISTEN/NOTIFY功能，当有新消息插入时自动触发通知
 *
 * 使用方法：
 * 1. 运行此脚本创建触发器函数和触发器
 * 2. 在后端SSE连接中监听对应的通道
 * 3. 当有新消息插入时，PostgreSQL会自动发送通知
 */

const { getDb } = require('coze-coding-dev-sdk');
const { getLogger } = require('../../lib/logger');

const logger = getLogger('SSE-TRIGGER');

async function addSSENotificationTrigger() {
  const db = await getDb();

  try {
    logger.info('开始添加SSE通知触发器...');

    // 1. 创建通知函数（如果不存在）
    await db.execute(`
      CREATE OR REPLACE FUNCTION notify_new_message()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 发送通知到对应的会话通道
        -- 通道格式：session_messages:<sessionId>
        PERFORM pg_notify(
          'session_messages:' || NEW.session_id,
          json_build_object(
            'id', NEW.id,
            'sessionId', NEW.session_id,
            'content', NEW.content,
            'isFromBot', NEW.is_from_bot,
            'isHuman', NEW.is_human,
            'intent', NEW.intent,
            'createdAt', NEW.created_at
          )::text
        );

        -- 同时发送到全局消息通道（用于监控等）
        PERFORM pg_notify(
          'session_messages:global',
          json_build_object(
            'id', NEW.id,
            'sessionId', NEW.session_id,
            'content', NEW.content,
            'isFromBot', NEW.is_from_bot,
            'createdAt', NEW.created_at
          )::text
        );

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    logger.info('✓ 通知函数创建成功');

    // 2. 检查是否已存在触发器
    const triggerCheckResult = await db.execute(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_notify_new_message'
      ) AS exists
    `);

    const triggerExists = triggerCheckResult[0]?.exists || false;

    if (triggerExists) {
      logger.info('触发器已存在，跳过创建');
    } else {
      // 3. 在session_messages表上创建触发器
      await db.execute(`
        CREATE TRIGGER trigger_notify_new_message
        AFTER INSERT ON session_messages
        FOR EACH ROW
        EXECUTE FUNCTION notify_new_message();
      `);

      logger.info('✓ 触发器创建成功');
    }

    logger.info('✅ SSE通知机制添加成功！');
    console.log('\n✅ SSE通知机制添加成功！');
    console.log('📋 使用说明：');
    console.log('   - 频道格式：session_messages:<sessionId>');
    console.log('   - 全局频道：session_messages:global');
    console.log('   - 通知内容：新消息的JSON数据\n');

  } catch (error) {
    logger.error('添加SSE通知触发器失败', { error: error.message });
    console.error('❌ 添加SSE通知触发器失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addSSENotificationTrigger()
    .then(() => {
      console.log('✓ 完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ 失败:', error);
      process.exit(1);
    });
}

module.exports = { addSSENotificationTrigger };

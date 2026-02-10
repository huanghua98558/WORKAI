/**
 * 修复触发器：删除旧触发器并重新创建到正确的表上
 */

const { getDb } = require('coze-coding-dev-sdk');
const { getLogger } = require('./server/lib/logger');

const logger = getLogger('TRIGGER-FIX');

async function fixTrigger() {
  const db = await getDb();

  try {
    console.log('开始修复触发器...\n');

    // 1. 删除session_messages表上的触发器（如果存在）
    console.log('1. 检查并删除旧的触发器...');
    try {
      await db.execute(`
        DROP TRIGGER IF EXISTS trigger_notify_new_message ON session_messages;
      `);
      console.log('   ✓ 已删除session_messages表上的触发器');
    } catch (error) {
      console.log('   (无需删除)');
    }

    // 2. 删除messages表上的触发器（如果存在）
    console.log('2. 检查并删除messages表上的触发器...');
    try {
      await db.execute(`
        DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
      `);
      console.log('   ✓ 已删除messages表上的触发器');
    } catch (error) {
      console.log('   (无需删除)');
    }

    // 3. 删除触发器函数（如果存在）
    console.log('3. 删除旧的触发器函数...');
    try {
      await db.execute(`
        DROP FUNCTION IF EXISTS notify_new_message() CASCADE;
      `);
      console.log('   ✓ 已删除旧的触发器函数');
    } catch (error) {
      console.log('   (无需删除)');
    }

    // 4. 重新创建触发器函数
    console.log('4. 创建新的触发器函数...');
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
            'senderType', NEW.sender_type,
            'senderId', NEW.sender_id,
            'senderName', NEW.sender_name,
            'messageType', NEW.message_type,
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
            'senderType', NEW.sender_type,
            'createdAt', NEW.created_at
          )::text
        );

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ 触发器函数创建成功');

    // 5. 在messages表上创建触发器
    console.log('5. 在messages表上创建触发器...');
    await db.execute(`
      CREATE TRIGGER trigger_notify_new_message
      AFTER INSERT ON messages
      FOR EACH ROW
      EXECUTE FUNCTION notify_new_message();
    `);
    console.log('   ✓ 触发器创建成功');

    console.log('\n✅ 触发器修复完成！');
    console.log('📋 触发器现在绑定到正确的表: messages');

    process.exit(0);

  } catch (error) {
    logger.error('修复触发器失败', { error: error.message });
    console.error('❌ 修复触发器失败:', error.message);
    process.exit(1);
  }
}

fixTrigger();

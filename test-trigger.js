/**
 * 测试PostgreSQL触发器
 */

const { getDb } = require('coze-coding-dev-sdk');

async function testTrigger() {
  const db = await getDb();
  const sql = db.session.client;

  const sessionId = 'test-trigger-' + Date.now();
  const messageId = 'msg-' + Date.now();

  console.log('测试触发器...');
  console.log('会话ID:', sessionId);
  console.log('消息ID:', messageId);

  // 1. 监听通道
  console.log('1. 开始监听通道...');
  await sql.query(`LISTEN "session_messages:${sessionId}"`);
  console.log('   ✓ 监听成功');

  // 2. 设置通知监听器
  let notificationReceived = false;
  let notificationData = null;
  sql.on('notification', (notification) => {
    console.log('2. 收到通知:', notification);
    notificationReceived = true;
    notificationData = notification;
  });

  // 3. 插入测试消息
  console.log('3. 插入测试消息...');
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
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
  `, [messageId, sessionId, 'test-robot', '测试触发器消息', 'test-user', 'user', '测试用户', 'message']);

  console.log('   ✓ 消息插入成功');

  // 4. 等待通知
  console.log('4. 等待通知...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 5. 取消监听
  await sql.query(`UNLISTEN "session_messages:${sessionId}"`);
  console.log('5. ✓ 取消监听');

  // 6. 结果
  if (notificationReceived) {
    console.log('\n✅ 触发器测试成功！');
    console.log('通知数据:', notificationData);
  } else {
    console.log('\n❌ 触发器测试失败：未收到通知');
  }

  process.exit(notificationReceived ? 0 : 1);
}

testTrigger().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});

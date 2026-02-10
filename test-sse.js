/**
 * 完整的SSE功能测试
 */

const pg = require('pg');

// 从环境变量读取数据库配置
const dbConfig = {
  connectionString: process.env.PGDATABASE_URL,
};

async function testSSE() {
  console.log('=== SSE功能完整测试 ===\n');

  // 1. 创建数据库连接用于插入测试数据
  const dbClient = new pg.Client(dbConfig);
  await dbClient.connect();
  console.log('✓ 数据库连接已建立');

  // 2. 创建独立的SSE监听连接
  const sseClient = new pg.Client(dbConfig);
  await sseClient.connect();
  console.log('✓ SSE监听连接已建立');

  // 3. 设置通知监听器
  let notificationReceived = false;
  let notificationData = null;

  sseClient.on('notification', (notification) => {
    console.log('\n📨 收到通知:', notification);
    notificationReceived = true;
    notificationData = notification;
  });

  // 4. 监听特定会话的通道
  const sessionId = 'test-sse-' + Date.now();
  const channel = `session_messages:${sessionId}`;
  console.log('\n监听通道:', channel);

  await sseClient.query(`LISTEN "${channel}"`);
  console.log('✓ 开始监听');

  // 5. 插入测试消息
  console.log('\n插入测试消息...');
  const messageId = 'msg-' + Date.now();

  await dbClient.query(`
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
  `, [messageId, sessionId, 'test-robot', 'SSE测试消息', 'test-user', 'user', '测试用户', 'message']);

  console.log('✓ 消息已插入');

  // 6. 等待通知
  console.log('\n等待通知...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 7. 清理
  await sseClient.query(`UNLISTEN "${channel}"`);
  await sseClient.end();
  await dbClient.end();
  console.log('\n✓ 连接已关闭');

  // 8. 结果
  console.log('\n=== 测试结果 ===');
  if (notificationReceived) {
    console.log('✅ SSE功能测试成功！');
    console.log('通知数据:', notificationData);
  } else {
    console.log('❌ SSE功能测试失败：未收到通知');
  }

  process.exit(notificationReceived ? 0 : 1);
}

testSSE().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});

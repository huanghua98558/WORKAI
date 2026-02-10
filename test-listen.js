const { getDb } = require('coze-coding-dev-sdk');

async function testListen() {
  const db = await getDb();
  const sql = db.session.client;

  const channel = 'session_messages:test-v4';

  console.log('尝试监听:', channel);

  try {
    await sql.query(`LISTEN "${channel}"`);
    console.log('✓ 监听成功');

    // 监听通知
    sql.on('notification', (notification) => {
      console.log('收到通知:', notification);
    });

    // 5秒后取消监听
    setTimeout(async () => {
      await sql.query(`UNLISTEN "${channel}"`);
      console.log('✓ 取消监听');
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('✗ 监听失败:', error.message);
    process.exit(1);
  }
}

testListen().catch(console.error);

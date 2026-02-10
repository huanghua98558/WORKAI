/**
 * 测试NOTIFY机制
 */

const { getDb } = require('coze-coding-dev-sdk');

async function testNotify() {
  const db = await getDb();
  const sql = db.session.client;

  console.log('测试PostgreSQL NOTIFY机制...\n');

  // 1. 监听通道
  console.log('1. 开始监听通道 test_channel...');
  await sql.query(`LISTEN test_channel`);
  console.log('   ✓ 监听成功');

  // 2. 设置通知监听器
  let notificationReceived = false;
  sql.on('notification', (notification) => {
    console.log('\n2. 收到通知:', notification);
    notificationReceived = true;
  });

  // 3. 发送通知
  console.log('\n3. 发送NOTIFY...');
  await sql.query(`NOTIFY test_channel, 'test message'`);
  console.log('   ✓ NOTIFY发送成功');

  // 4. 等待通知
  console.log('\n4. 等待通知...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 5. 取消监听
  await sql.query(`UNLISTEN test_channel`);
  console.log('\n5. ✓ 取消监听');

  // 6. 结果
  if (notificationReceived) {
    console.log('\n✅ NOTIFY机制测试成功！');
  } else {
    console.log('\n❌ NOTIFY机制测试失败：未收到通知');
  }

  process.exit(notificationReceived ? 0 : 1);
}

testNotify().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});

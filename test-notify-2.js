/**
 * 使用独立的PostgreSQL连接测试NOTIFY机制
 */

const pg = require('pg');

// 从环境变量读取数据库配置
const dbConfig = {
  connectionString: process.env.PGDATABASE_URL,
};

async function testNotifyWithNewConnection() {
  console.log('测试PostgreSQL NOTIFY机制（使用独立连接）...\n');

  // 1. 创建一个连接用于监听
  const listenerClient = new pg.Client(dbConfig);
  await listenerClient.connect();
  console.log('1. 监听连接已建立');

  // 2. 创建一个连接用于发送通知
  const senderClient = new pg.Client(dbConfig);
  await senderClient.connect();
  console.log('2. 发送连接已建立');

  // 3. 设置通知监听器
  let notificationReceived = false;
  listenerClient.on('notification', (notification) => {
    console.log('\n4. 收到通知:', notification);
    notificationReceived = true;
  });

  // 4. 监听通道
  console.log('\n3. 开始监听通道 test_channel...');
  await listenerClient.query(`LISTEN test_channel`);
  console.log('   ✓ 监听成功');

  // 5. 发送通知
  console.log('\n3. 发送NOTIFY...');
  await senderClient.query(`NOTIFY test_channel, 'test message'`);
  console.log('   ✓ NOTIFY发送成功');

  // 6. 等待通知
  console.log('\n4. 等待通知...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 7. 清理
  await listenerClient.query(`UNLISTEN test_channel`);
  await listenerClient.end();
  await senderClient.end();
  console.log('\n5. ✓ 连接已关闭');

  // 8. 结果
  if (notificationReceived) {
    console.log('\n✅ NOTIFY机制测试成功！');
  } else {
    console.log('\n❌ NOTIFY机制测试失败：未收到通知');
  }

  process.exit(notificationReceived ? 0 : 1);
}

testNotifyWithNewConnection().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});

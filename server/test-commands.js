/**
 * 测试 Upstash REST API 支持的命令
 */

require('dotenv').config({ path: './.env' });

const redisClient = require('./lib/redis');

async function testCommands() {
  try {
    console.log('开始测试 Upstash REST API 支持的命令...\n');

    const client = await redisClient.getClient();
    console.log('✅ 获取客户端成功\n');

    // 测试 ping
    console.log('1. 测试 ping:');
    const pong = await client.ping();
    console.log('   ✅ PING →', pong, '\n');

    // 测试 set/get
    console.log('2. 测试 set/get:');
    await client.set('test:key', 'test-value');
    const value = await client.get('test:key');
    console.log('   ✅ SET test:key → test-value');
    console.log('   ✅ GET test:key →', value, '\n');

    // 测试 info
    console.log('3. 测试 info:');
    try {
      const info = await client.info('stats');
      console.log('   ✅ INFO stats → 成功');
      console.log('   前 5 行:');
      const lines = info.split('\n').slice(0, 5);
      lines.forEach(line => console.log('   ', line));
    } catch (error) {
      console.log('   ❌ INFO stats → 失败:', error.message);
    }
    console.log();

    // 测试 dbsize
    console.log('4. 测试 dbsize:');
    try {
      const dbsize = await client.dbsize();
      console.log('   ✅ DBSIZE →', dbsize);
    } catch (error) {
      console.log('   ❌ DBSIZE → 失败:', error.message);
    }
    console.log();

    // 测试 keys
    console.log('5. 测试 keys:');
    try {
      const keys = await client.keys('test:*');
      console.log('   ✅ KEYS test:* →', keys);
    } catch (error) {
      console.log('   ❌ KEYS → 失败:', error.message);
    }
    console.log();

    // 清理测试数据
    await client.del('test:key');
    console.log('6. 清理测试数据: ✅ DEL test:key\n');

    console.log('✅ 所有测试完成！');

    await redisClient.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

testCommands();

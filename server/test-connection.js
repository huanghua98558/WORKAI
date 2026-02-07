/**
 * 测试 Upstash Redis REST API 连接
 */

// 加载环境变量
require('dotenv').config({ path: './.env' });

console.log('环境变量检查:');
console.log('  UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ 已设置' : '❌ 未设置');
console.log('  UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ 已设置' : '❌ 未设置');
console.log('  REDIS_URL:', process.env.REDIS_URL ? '✅ 已设置' : '❌ 未设置');

const redisClient = require('./lib/redis');

async function testConnection() {
  try {
    console.log('\n开始测试 Redis 连接...\n');

    const info = redisClient.getConnectionInfo();
    console.log('连接信息:', info);

    const client = await redisClient.getClient();
    console.log('✅ 获取客户端成功');

    // 测试 ping
    const pong = await client.ping();
    console.log('✅ Ping 成功:', pong);

    // 测试 set/get
    await client.set('test:connection', 'Hello, Redis!');
    const value = await client.get('test:connection');
    console.log('✅ Set/Get 成功:', value);

    // 清理测试数据
    await client.del('test:connection');
    console.log('✅ 清理测试数据成功');

    console.log('\n✅ 所有测试通过！\n');

    await redisClient.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

testConnection();

/**
 * 检查环境变量加载
 */

// 加载环境变量
require('dotenv').config({ path: './.env' });

console.log('环境变量检查:');
console.log('  UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ 已设置' : '❌ 未设置');
console.log('  UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ 已设置' : '❌ 未设置');
console.log('  REDIS_URL:', process.env.REDIS_URL ? '✅ 已设置' : '❌ 未设置');
console.log('  REDIS_HOST:', process.env.REDIS_HOST);
console.log('  REDIS_PORT:', process.env.REDIS_PORT);

const redisClient = require('./lib/redis');

async function checkConnection() {
  try {
    console.log('\n检查 Redis 连接...\n');
    
    const info = redisClient.getConnectionInfo();
    console.log('连接信息:', JSON.stringify(info, null, 2));
    
    const client = await redisClient.getClient();
    console.log('\n✅ 获取客户端成功');
    
    // 测试 ping
    const pong = await client.ping();
    console.log('✅ Ping 成功:', pong);
    
    console.log('\n✅ 连接检查完成！');
    
    await redisClient.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 连接检查失败:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

checkConnection();

/**
 * Redis 连接测试脚本
 */

// 加载环境变量
require('dotenv').config();

const redisClient = require('./lib/redis');

async function testRedis() {
  console.log('=== Redis 连接测试 ===');
  console.log('环境变量 REDIS_URL:', process.env.REDIS_URL ? '已设置' : '未设置');
  console.log('环境变量 USE_UPSTASH_REDIS:', process.env.USE_UPSTASH_REDIS);
  console.log('');

  try {
    // 获取 Redis 客户端
    const client = await redisClient.connect();
    console.log('✅ Redis 客户端连接成功');

    // 测试 SET 操作
    await client.set('test_key', 'test_value');
    console.log('✅ SET 操作成功: test_key = test_value');

    // 测试 GET 操作
    const value = await client.get('test_key');
    console.log('✅ GET 操作成功:', value);

    // 测试 SETEX 操作（带过期时间）
    await client.setex('test_expiring_key', 60, 'expiring_value');
    console.log('✅ SETEX 操作成功: test_expiring_key (60秒过期)');

    // 测试 TTL 操作
    const ttl = await client.ttl('test_expiring_key');
    console.log('✅ TTL 操作成功: test_expiring_key 剩余时间', ttl, '秒');

    // 测试 DEL 操作
    await client.del('test_key');
    console.log('✅ DEL 操作成功: test_key 已删除');

    // 验证删除
    const deletedValue = await client.get('test_key');
    console.log('✅ 验证删除: test_key =', deletedValue);

    // 测试 HSET/HGET 操作
    await client.hset('test_hash', 'field1', 'value1');
    await client.hset('test_hash', 'field2', 'value2');
    console.log('✅ HSET 操作成功: test_hash.field1 = value1, test_hash.field2 = value2');

    const hashValue = await client.hgetall('test_hash');
    console.log('✅ HGETALL 操作成功:', hashValue);

    // 测试 LPUSH/LRANGE 操作
    await client.lpush('test_list', 'item1');
    await client.lpush('test_list', 'item2');
    await client.lpush('test_list', 'item3');
    console.log('✅ LPUSH 操作成功: test_list 添加了3个元素');

    const listValue = await client.lrange('test_list', 0, -1);
    console.log('✅ LRANGE 操作成功: test_list =', listValue);

    // 测试 INCR 操作
    await client.set('test_counter', '0');
    const count1 = await client.incr('test_counter');
    const count2 = await client.incr('test_counter');
    const count3 = await client.incr('test_counter');
    console.log('✅ INCR 操作成功: test_counter =', count3);

    // 清理测试数据
    await client.del('test_expiring_key');
    await client.del('test_hash');
    await client.del('test_list');
    await client.del('test_counter');
    console.log('✅ 清理测试数据完成');

    console.log('\n=== 所有测试通过 ✅ ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 运行测试
testRedis();

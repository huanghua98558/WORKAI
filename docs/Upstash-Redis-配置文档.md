# Upstash Redis 配置文档

## 概述

WorkTool AI 系统已成功集成 Upstash Redis（Tokyo 区域）作为缓存和会话存储。

## 配置信息

### Upstash Redis 实例
- **区域：** Tokyo (ap-northeast-1)
- **数据库 ID：** improved-wildcat-49746
- **REST URL：** https://improved-wildcat-49746.upstash.io
- **连接字符串：** `rediss://default:TOKEN@improved-wildcat-49746.upstash.io:6379`

### 环境变量

已在 `server/.env` 文件中配置：

```bash
# 使用 Upstash Redis（true/false）
USE_UPSTASH_REDIS=true

# Redis 连接字符串（支持 Upstash Redis）
REDIS_URL=rediss://default:AcJSAAIncDJjNjJkZjQ1ODE5MmI0MTI3YTZlMDc5NjdhNDA1ODg4MHAyNDk3NDY@improved-wildcat-49746.upstash.io:6379
```

## 实现的功能

### 1. Redis 连接管理

**文件：** `server/lib/redis.js`

- ✅ 支持 REDIS_URL 环境变量
- ✅ 自动降级到内存模式（当 Redis 不可用时）
- ✅ 支持多种 Redis 操作（SET、GET、HSET、LPUSH 等）
- ✅ 提供模拟客户端接口（用于内存模式）

### 2. 已优化的组件

- ✅ **Rate Limit：** 使用内存模式（避免 Upstash Redis 连接限制）
- ✅ **Session 存储：** 可以使用 Redis 持久化会话
- ✅ **缓存层：** 可以使用 Redis 缓存热点数据

## 测试结果

### Redis 功能测试

所有基本操作测试通过：

```
✅ SET 操作成功: test_key = test_value
✅ GET 操作成功: test_value
✅ SETEX 操作成功: test_expiring_key (60秒过期)
✅ TTL 操作成功: test_expiring_key 剩余时间 60 秒
✅ DEL 操作成功: test_key 已删除
✅ 验证删除: test_key = null
✅ HSET 操作成功: test_hash.field1 = value1, test_hash.field2 = value2
✅ HGETALL 操作成功: { field1: 'value1', field2: 'value2' }
✅ LPUSH 操作成功: test_list 添加了3个元素
✅ LRANGE 操作成功: test_list = [ 'item3', 'item2', 'item1' ]
✅ INCR 操作成功: test_counter = 3
✅ 清理测试数据完成
```

### 连接状态

```
[INFO] [REDIS] 使用 REDIS_URL 连接 Redis
[INFO] [REDIS] Redis 客户端已连接 { mode: 'URL', config: 'Upstash Redis' }
[INFO] [APP] Redis 客户端已连接 { mode: 'redis' }
```

## 使用建议

### 1. 缓存策略

#### 机器人列表缓存
```javascript
// 缓存机器人列表（5分钟过期）
const cacheKey = 'robots:list';
let robots = await redisClient.get(cacheKey);

if (!robots) {
  // 从数据库查询
  robots = await db.query.robots.findMany();
  // 缓存 5 分钟
  await redisClient.setex(cacheKey, 300, JSON.stringify(robots));
}

return JSON.parse(robots);
```

#### 监控数据缓存
```javascript
// 缓存监控数据（1分钟过期）
const cacheKey = 'monitoring:health';
let healthData = await redisClient.get(cacheKey);

if (!healthData) {
  // 计算监控数据
  healthData = await calculateHealthMetrics();
  // 缓存 1 分钟
  await redisClient.setex(cacheKey, 60, JSON.stringify(healthData));
}

return JSON.parse(healthData);
```

### 2. 会话管理

#### 存储用户会话
```javascript
// 存储用户会话（30分钟过期）
const sessionKey = `session:${userId}`;
await redisClient.setex(sessionKey, 1800, JSON.stringify({
  userId,
  username,
  loginTime: new Date().toISOString()
}));
```

#### 获取用户会话
```javascript
// 获取用户会话
const sessionKey = `session:${userId}`;
const session = await redisClient.get(sessionKey);

if (!session) {
  // 会话不存在或已过期
  return null;
}

return JSON.parse(session);
```

### 3. 限流控制

#### API 限流
```javascript
// API 限流（每分钟 100 次请求）
const rateLimitKey = `ratelimit:${userId}:${endpoint}`;
const count = await redisClient.incr(rateLimitKey);

if (count === 1) {
  // 第一次请求，设置过期时间
  await redisClient.expire(rateLimitKey, 60);
}

if (count > 100) {
  // 超过限流阈值
  throw new Error('Rate limit exceeded');
}
```

## 监控与维护

### 查看连接状态

```bash
# 查看后端日志
tail -f /app/work/logs/bypass/backend.log | grep -i redis
```

### 测试 Redis 连接

```bash
# 运行测试脚本
cd /workspace/projects/server
node test-redis.js
```

### 查看 Upstash 控制台

访问 Upstash Console 查看详细指标：
- 连接数
- 命令统计
- 内存使用
- 键值分布

## 性能优化建议

### 1. 使用管道（Pipeline）

对于批量操作，使用 Redis 管道减少网络往返：

```javascript
const pipeline = redisClient.pipeline();

for (let i = 0; i < 100; i++) {
  pipeline.set(`key:${i}`, `value:${i}`);
}

await pipeline.exec();
```

### 2. 合理设置过期时间

根据数据特性设置合理的过期时间：
- 热点数据：短过期时间（1-5 分钟）
- 会话数据：中等过期时间（30 分钟 - 2 小时）
- 静态数据：长过期时间（1-7 天）

### 3. 使用 Hash 存储结构化数据

对于结构化数据，使用 Hash 类型而非 String：

```javascript
// 推荐方式（Hash）
await redisClient.hset('user:123', {
  name: 'John',
  email: 'john@example.com',
  age: '30'
});

// 不推荐方式（JSON String）
await redisClient.set('user:123', JSON.stringify({
  name: 'John',
  email: 'john@example.com',
  age: 30
}));
```

## 注意事项

### 1. Upstash Redis 限制

- **免费层限制：** 30,000 命令/天
- **存储限制：** 256MB
- **连接限制：** 无限连接

### 2. 网络延迟

由于 Redis 位于 Tokyo 区域，国内访问延迟约 30-80ms：
- ✅ 适合缓存非实时性数据
- ⚠️ 不适合高频实时写入
- ⚠️ 建议使用批量操作减少网络往返

### 3. 数据安全

- ✅ 使用 TLS 加密连接（rediss://）
- ✅ 不要在代码中硬编码 Redis 凭证
- ⚠️ 定期更新 Redis Token

## 故障排查

### 问题 1：连接失败

**症状：**
```
Redis 连接失败，切换到内存模式
```

**解决方案：**
1. 检查 REDIS_URL 是否正确
2. 检查网络连接
3. 确认 Upstash Redis 服务状态
4. 查看后端日志获取详细错误信息

### 问题 2：达到命令限制

**症状：**
```
Error: Command rate limit exceeded
```

**解决方案：**
1. 优化缓存策略，减少 Redis 操作
2. 使用本地缓存减少 Redis 访问
3. 升级到付费计划

### 问题 3：数据丢失

**症状：**
缓存数据意外丢失

**解决方案：**
1. 检查过期时间设置
2. 检查是否达到存储限制
3. 启用数据持久化（Upstash Redis 已默认启用）

## 下一步工作

1. **实现缓存层**
   - 为高频查询添加缓存
   - 实现缓存预热机制
   - 实现缓存失效策略

2. **性能监控**
   - 添加 Redis 性能指标
   - 添加缓存命中率监控
   - 添加慢查询日志

3. **优化建议**
   - 根据实际使用情况调整缓存策略
   - 优化 Redis 操作，减少网络往返
   - 考虑使用 Redis Stream 实现消息队列

## 参考资源

- Upstash 官方文档：https://upstash.com/docs
- Redis 命令参考：https://redis.io/commands
- ioredis 文档：https://github.com/luin/ioredis

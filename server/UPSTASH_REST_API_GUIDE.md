# Upstash Redis REST API 配置指南

## 概述

WorkTool AI 系统现已支持 Upstash Redis 的三种连接模式：

1. **REST API 模式**（推荐）：基于 HTTP 的无状态连接，最稳定
2. **ioredis 模式**：传统的 Redis 连接方式，使用 Redis 协议
3. **内存模式**：降级方案，当 Redis 不可用时使用

## 配置优先级

系统会按以下优先级自动选择连接方式：

1. **UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN** → 使用 REST API
2. **REDIS_URL** → 使用 ioredis
3. **内存模式** → 降级方案

## 配置方法

### 方法 1：使用 Upstash REST API（推荐）

在 `.env` 文件中添加：

```env
# Upstash Redis REST API 配置
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-rest-token"
```

**优点**：
- ✅ 无连接数限制
- ✅ 连接更稳定
- ✅ 适合 serverless 环境
- ✅ 不会出现连接断开问题

**获取方式**：
1. 登录 Upstash Console
2. 创建 Redis 数据库
3. 在 "Details" 页面找到 "REST API" 部分
4. 复制 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`

### 方法 2：使用 ioredis（传统方式）

在 `.env` 文件中添加：

```env
# Redis 配置（传统方式）
REDIS_URL="rediss://default:password@host:port"
# 或
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
```

**注意**：
- Upstash 免费版有连接数限制（建议使用 REST API）
- 可能出现连接断开问题
- 需要维护长连接

### 方法 3：强制使用内存模式（测试用）

在 `.env` 文件中添加：

```env
# 强制使用内存模式
USE_MEMORY_MODE=true
```

**注意**：
- 仅用于测试
- 数据不持久化
- 重启后数据丢失

## 连接测试

### 测试脚本

创建测试脚本 `test-redis-connection.js`：

```javascript
const redisClient = require('./server/lib/redis');

async function testConnection() {
  try {
    console.log('开始测试 Redis 连接...');
    
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
    
    console.log('✅ 所有测试通过！');
    
    await redisClient.close();
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testConnection();
```

运行测试：

```bash
node test-redis-connection.js
```

### 通过健康检查测试

```bash
# 检查健康状态
curl http://localhost:5001/health

# 查看缓存统计
curl http://localhost:5001/api/monitoring/cache-stats
```

## 监控和日志

### 查看连接日志

```bash
# 查看 Redis 相关日志
tail -f /app/work/logs/bypass/dev.log | grep -i "redis"
```

### Prometheus 监控

访问 `/metrics` 端点查看：

```bash
curl http://localhost:5001/metrics | grep cache
```

监控指标：
- `cache_l1_hits_total` - L1 缓存命中数
- `cache_l1_misses_total` - L1 缓存未命中数
- `cache_l2_redis_commands_total` - Redis 命令总数
- `cache_l2_redis_keys` - Redis 键数

### 健康检查端点

```bash
curl http://localhost:5001/health
```

返回示例：

```json
{
  "status": "healthy",
  "uptime": 123.456,
  "cache": {
    "l1": {
      "hits": 10,
      "misses": 2,
      "sets": 8,
      "deletes": 1,
      "size": 7,
      "hitRate": 0.833
    },
    "l2": {
      "total_commands": 262,
      "total_connections": 56,
      "total_keys": 13
    }
  }
}
```

## 故障排查

### 问题 1：REST API 连接失败

**症状**：
```
❌ Upstash REST API 连接失败
```

**解决方案**：
1. 检查 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 是否正确
2. 确认 Token 是否有效（未过期）
3. 检查网络连接
4. 查看详细错误日志

### 问题 2：ioredis 连接断开

**症状**：
```
[ioredis] Unhandled error event: AggregateError
MaxRetriesPerRequestError: Reached the max retries per request limit
```

**解决方案**：
1. 切换到 REST API 模式（推荐）
2. 检查网络连接
3. 增加 `maxRetriesPerRequest` 配置
4. 检查 Upstash 连接数限制

### 问题 3：降级到内存模式

**症状**：
```
⚠️ Redis 连接失败，切换到内存模式
```

**说明**：
- 系统自动降级到内存模式
- 功能继续可用，但数据不持久化
- 需要检查 Redis 配置

## 性能优化建议

### 1. 减少命令使用量

Upstash 免费版限制 30,000 命令/天。优化建议：

- 优先使用 L1 内存缓存（热点数据）
- 增加 L1 缓存命中率
- 减少不必要的 Redis 操作
- 使用批量操作（mget、mset）

### 2. 缓存策略优化

```javascript
// L1: 内存缓存（热点数据，60秒 TTL）
// L2: Redis 缓存（主缓存源，300秒 TTL）

await cache.set('key', value, {
  l1TTL: 60,
  l2TTL: 300
});
```

### 3. 监控使用量

定期检查：

```bash
# 查看当前使用量
curl http://localhost:5001/metrics | grep cache_l2_redis_commands_total
```

## 最佳实践

### 推荐配置

```env
# 生产环境：使用 Upstash REST API
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-rest-token"

# 开发环境：使用本地 Redis（可选）
REDIS_URL="redis://localhost:6379"

# 测试环境：强制内存模式（可选）
USE_MEMORY_MODE=false
```

### 降级策略

系统已实现三层降级：

1. **REST API 失败** → 尝试 ioredis
2. **ioredis 失败** → 降级到内存模式
3. **内存模式** → 功能继续可用，数据不持久化

### 错误处理

```javascript
try {
  const client = await redisClient.getClient();
  await client.set('key', 'value');
} catch (error) {
  // 自动降级，无需手动处理
  logger.error('Redis 操作失败', { error: error.message });
}
```

## 迁移指南

### 从 ioredis 迁移到 REST API

1. 获取 Upstash REST API 配置
2. 更新 `.env` 文件
3. 重启服务
4. 验证连接

无需修改代码，系统会自动选择最佳连接方式。

## 总结

| 模式 | 稳定性 | 连接限制 | 性能 | 推荐场景 |
|------|--------|----------|------|----------|
| REST API | ⭐⭐⭐⭐⭐ | 无 | ⭐⭐⭐⭐ | 生产环境 |
| ioredis | ⭐⭐⭐ | 有 | ⭐⭐⭐⭐⭐ | 本地开发 |
| 内存模式 | ⭐⭐⭐ | 无 | ⭐⭐⭐⭐⭐ | 测试环境 |

**推荐**：生产环境使用 Upstash REST API

---

**文档更新时间**：2026-02-08  
**版本**：v1.0

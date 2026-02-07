# Redis 连接问题排查与优化指南

## 问题概述

用户报告的 Redis 连接错误：

```
2026-02-08 07:49:15 error: [ioredis] Unhandled error event: AggregateError:
2026-02-08 07:49:15 error: at internalConnectMultiple (node:net:1134:18)
2026-02-08 07:49:15 error: at afterConnectMultiple (node:net:1715:7)
2026-02-08 07:49:15 error: at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17)
```

## 原因分析

### 1. Upstash Redis 连接限制
- Upstash Redis 免费版有连接数限制
- 网络不稳定可能导致连接中断
- 超时设置过短导致连接失败

### 2. 原配置问题
```javascript
// 旧配置
{
  connectTimeout: 10000,      // 超时时间过短（10秒）
  maxRetriesPerRequest: 3,    // 重试次数过少（3次）
  retryStrategy: (times) => Math.min(times * 100, 3000) // 重试间隔过短
}
```

## 已实施的优化

### 1. 增强错误处理
```javascript
// 正确的错误处理和日志记录
this.client.on('error', (err) => {
  this.logger.error('Redis 客户端错误', { error: err.message });
});

this.client.on('close', () => {
  this.logger.warn('Redis 客户端连接已关闭');
});

this.client.on('reconnecting', () => {
  this.logger.info('Redis 客户端正在重连...');
});
```

### 2. 优化连接配置
```javascript
// 新配置
{
  connectTimeout: 15000,       // 增加超时时间到 15 秒
  maxRetriesPerRequest: 5,     // 增加重试次数到 5 次
  retryStrategy: (times) => Math.min(times * 200, 5000), // 优化重试策略
  lazyConnect: false,          // 立即连接
  keepAlive: 30000,            // 保持连接 30 秒
  enableReadyCheck: true       // 启用就绪检查
}
```

### 3. 添加健康检查机制
```javascript
// 每 30 秒检查一次 Redis 连接状态
startHealthCheck() {
  const checkHealth = async () => {
    try {
      if (this.client && !this.useMemoryMode) {
        await this.client.ping();
      }
    } catch (error) {
      this.logger.error('Redis 健康检查失败，切换到内存模式', { error: error.message });
      this.useMemoryMode = true;
    }
  };

  setInterval(checkHealth, 30000);
}
```

### 4. 双层缓存降级策略
- **L1 内存缓存**：优先访问，无网络开销
- **L2 Redis 缓存**：降级访问，持久化存储
- **自动降级**：Redis 不可用时自动切换到内存模式

## 监控指标

### Prometheus 监控
访问 `/metrics` 端点查看：
- `cache_l1_hits_total` - L1 缓存命中数
- `cache_l1_misses_total` - L1 缓存未命中数
- `cache_l2_redis_commands_total` - Redis 命令总数
- `cache_l2_redis_keys` - Redis 键数

### 健康检查端点
访问 `/health` 端点查看：
```json
{
  "status": "healthy",
  "cache": {
    "l1": {
      "hits": 0,
      "misses": 4,
      "sets": 8,
      "deletes": 1,
      "size": 7,
      "hitRate": 0
    },
    "l2": {
      "total_commands": 267,
      "total_connections": 65,
      "total_keys": 13
    }
  }
}
```

## 故障处理流程

### 1. 连接失败
1. 自动重试（最多 5 次）
2. 记录错误日志
3. 切换到内存模式降级

### 2. 连接中断
1. 检测连接状态（健康检查）
2. 尝试自动重连
3. 重连失败后降级到内存模式

### 3. Redis 服务不可用
1. 自动切换到内存模式
2. 继续提供服务（功能降级）
3. Redis 恢复后自动重连

## 性能优化建议

### 1. 减少 Redis 使用量
- 优先使用 L1 内存缓存（热点数据）
- 增加 L1 缓存命中率
- 减少不必要的 Redis 操作

### 2. 连接池优化
- 复用 Redis 连接
- 避免频繁创建/销毁连接
- 使用连接池管理

### 3. 缓存策略优化
- 合理设置 TTL（L1: 60秒，L2: 300秒）
- 使用缓存预热机制
- 模糊删除时注意通配符性能

## 后续优化方向

### 1. 智能降级
- 根据错误率自动调整策略
- 渐进式降级（部分功能降级）
- 降级恢复机制

### 2. 连接池管理
- 实现连接池
- 限制最大连接数
- 连接复用

### 3. 性能监控
- 实时监控 Redis 命令数
- 预警机制（接近额度上限）
- 性能优化建议

## 使用说明

### 检查 Redis 状态
```bash
# 检查健康状态
curl http://localhost:5001/health

# 查看监控指标
curl http://localhost:5001/metrics
```

### 查看日志
```bash
# 查看 Redis 相关日志
tail -f /app/work/logs/bypass/dev.log | grep -i "redis"

# 查看错误日志
tail -f /app/work/logs/bypass/dev.log | grep -i "error"
```

### 强制使用内存模式
```bash
# 设置环境变量
export USE_MEMORY_MODE=true

# 重启服务
coze dev
```

## 总结

当前系统已实现：
✅ Redis 连接错误正确处理
✅ 自动重连机制
✅ 健康检查机制
✅ 双层缓存降级策略
✅ 监控指标暴露
✅ 日志记录完善

系统在 Redis 不可用时能够：
- 自动降级到内存模式
- 继续提供服务（功能降级）
- 记录详细日志
- Redis 恢复后自动重连

---

**文档生成时间**：2026-02-08
**版本**：v1.0

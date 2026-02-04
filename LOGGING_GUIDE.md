# 日志系统优化文档

## 📊 概述

本系统已全面优化日志功能，提供统一、结构化、可追踪的日志记录能力。

---

## ✨ 主要改进

### 1. 统一日志接口 (`server/lib/logger.js`)

创建了专业的日志工具类，提供以下功能：

- ✅ **结构化日志** - 所有日志以JSON格式记录，便于解析和查询
- ✅ **请求追踪** - 自动生成请求ID，追踪完整请求链路
- ✅ **性能监控** - 记录关键操作耗时
- ✅ **安全过滤** - 自动过滤敏感信息（密码、token等）
- ✅ **日志级别** - DEBUG, INFO, WARN, ERROR, FATAL
- ✅ **自动轮转** - 定期清理旧日志

### 2. 数据库日志中间件 (`server/lib/database-logger.js`)

自动记录所有数据库查询：

- ✅ **查询耗时监控** - 自动记录超过100ms的慢查询
- ✅ **错误追踪** - 记录失败的查询和错误信息
- ✅ **统计信息** - 提供查询统计数据

### 3. HTTP请求日志中间件

自动记录所有HTTP请求：

- ✅ **请求信息** - 方法、URL、查询参数、请求体
- ✅ **响应信息** - 状态码、响应时间
- ✅ **错误追踪** - 记录请求错误和堆栈信息

### 4. 模块日志分类

每个模块有独立的日志实例：

| 模块 | 日志名称 | 说明 |
|------|---------|------|
| APP | APP | 应用主入口 |
| HTTP | HTTP | HTTP请求处理 |
| AI | AI | AI服务调用 |
| ROBOT | ROBOT | 机器人管理 |
| DATABASE | DATABASE | 数据库操作 |
| REDIS | REDIS | Redis操作 |
| SYSTEM | SYSTEM | 系统级操作 |

---

## 🚀 使用方法

### 1. 在服务中使用Logger

```javascript
const { getLogger } = require('../lib/logger');

class MyService {
  constructor() {
    this.logger = getLogger('MY_MODULE');
  }

  async doSomething() {
    // 设置请求上下文
    this.logger.setRequestContext({
      requestId: 'req_123',
      userId: 'user_456',
      sessionId: 'session_789'
    });

    // 记录日志
    this.logger.info('开始执行操作', { operation: 'doSomething' });

    try {
      const result = await someOperation();

      // 记录性能
      await this.logger.performance('doSomething', duration, {
        success: true,
        resultCount: result.length
      });

      return result;
    } catch (error) {
      this.logger.error('操作失败', {
        operation: 'doSomething',
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      // 清除请求上下文
      this.logger.clearRequestContext();
    }
  }
}
```

### 2. 日志级别配置

在 `.env` 文件中设置：

```bash
LOG_LEVEL=info  # 可选: debug, info, warn, error, fatal
```

| 级别 | 说明 | 使用场景 |
|------|------|---------|
| DEBUG | 调试信息 | 开发调试，详细日志 |
| INFO | 一般信息 | 正常运行，关键操作 |
| WARN | 警告信息 | 潜在问题，不影响运行 |
| ERROR | 错误信息 | 错误发生，需要关注 |
| FATAL | 致命错误 | 系统崩溃，必须立即处理 |

### 3. 日志查询

```javascript
const systemLogger = require('../services/system-logger.service');

// 查询最近7天的错误日志
const logs = await systemLogger.getDatabaseLogs({
  level: 'error',
  days: 7,
  limit: 100
});

// 查询特定模块的日志
const logs = await systemLogger.getDatabaseLogs({
  module: 'AI',
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-31T23:59:59Z'
});

// 查询特定请求的所有日志
const logs = await systemLogger.getDatabaseLogs({
  request_id: 'req_1234567890_abc123'
});
```

### 4. 日志清理

```javascript
// 清理30天前的日志
await systemLogger.cleanup(30);
```

---

## 📊 日志格式

### 控制台输出

```
[INFO] 2024-02-04T01:00:00.000Z [AI] [req_1234567890_abc123] 开始意图识别 { sessionId: '...', messageId: '...' }
```

### 数据库存储

```json
{
  "id": "log_1234567890_abc123",
  "timestamp": "2024-02-04T01:00:00.000Z",
  "level": "INFO",
  "module": "AI",
  "message": "开始意图识别",
  "data": {
    "sessionId": "...",
    "messageId": "..."
  },
  "request_id": "req_1234567890_abc123",
  "user_id": "user_456",
  "session_id": "session_789",
  "robot_id": null,
  "environment": "production",
  "pid": 1234
}
```

---

## 🔒 安全特性

### 敏感信息过滤

自动过滤以下敏感字段：

- password
- token
- apiKey
- apiSecret
- accessToken
- secret
- authorization
- cookie

示例：

```javascript
logger.info('用户登录', {
  username: 'user123',
  password: 'secret123'  // 自动替换为 [REDACTED]
});

// 输出:
// [INFO] ... 用户登录 { username: 'user123', password: '[REDACTED]' }
```

---

## 📈 性能监控

### 内置性能日志

```javascript
// 记录API调用性能
await logger.apiCall('GET', '/api/users', 200, 45, true);

// 记录数据库查询性能
await logger.database('SELECT * FROM users', [], 120, true);

// 记录自定义操作性能
await logger.performance('数据处理', 150, {
  recordCount: 1000,
  processed: 950
});
```

### 慢查询警告

自动检测并警告慢查询（>100ms）：

```
[WARN] ... 检测到慢查询 { queryType: 'SELECT', duration: 150, threshold: 100 }
```

---

## 🛠️ 已更新的文件

| 文件 | 更新内容 |
|------|---------|
| `server/lib/logger.js` | ✨ 新建 - 统一日志工具类 |
| `server/lib/database-logger.js` | ✨ 新建 - 数据库日志中间件 |
| `server/app.js` | 🔧 更新 - 集成日志中间件 |
| `server/services/ai.service.js` | 🔧 更新 - 使用新Logger |
| `server/services/robot.service.js` | 🔧 更新 - 使用新Logger |
| `server/lib/redis.js` | 🔧 更新 - 使用新Logger |
| `server/database/userManager.js` | 🔧 更新 - 使用新Logger |
| `.env` | 🔧 更新 - 添加日志配置 |

---

## 📝 下一步建议

### 1. 完善其他服务

继续更新其他服务文件，使用新的Logger：

- `server/services/*.service.js`
- `server/routes/*.api.js`

### 2. 添加日志分析

创建日志分析工具：

- 日志聚合和统计
- 错误趋势分析
- 性能瓶颈识别

### 3. 集成日志服务

考虑集成专业日志服务：

- ELK Stack (Elasticsearch + Logstash + Kibana)
- Graylog
- Splunk

### 4. 添加告警机制

基于日志的告警：

- 错误率超过阈值
- 慢查询过多
- API响应时间过长

---

## 🔍 问题排查

### 查看实时日志

```bash
# 查看所有日志
tail -f /app/work/logs/bypass/app.log

# 查看错误日志
tail -f /app/work/logs/bypass/app.log | grep ERROR

# 查看特定模块的日志
tail -f /app/work/logs/bypass/app.log | grep "\[AI\]"
```

### 查询数据库日志

```sql
-- 查询最近的错误日志
SELECT * FROM system_logs
WHERE level = 'ERROR'
ORDER BY timestamp DESC
LIMIT 100;

-- 查询特定请求的所有日志
SELECT * FROM system_logs
WHERE request_id = 'req_1234567890_abc123'
ORDER BY timestamp;

-- 统计各模块的日志数量
SELECT module, COUNT(*) as count
FROM system_logs
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY module
ORDER BY count DESC;
```

---

## 📚 参考资料

- Drizzle ORM: https://orm.drizzle.team/
- Fastify: https://www.fastify.io/
- Winston (备选日志库): https://github.com/winstonjs/winston

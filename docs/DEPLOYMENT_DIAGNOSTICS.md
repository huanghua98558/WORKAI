# 部署环境诊断指南

## 问题：消息保存失败

如果在部署环境中遇到"保存用户消息失败"错误，请按照以下步骤进行诊断。

## 快速诊断步骤

### 1. 运行数据库诊断脚本

```bash
# 在部署环境中运行
node server/lib/database-diagnostics.js
```

**输出示例**：
```
===== 数据库诊断开始 =====

[诊断] 1. 测试数据库连接...
[诊断] ✓ 数据库连接正常: 2026-02-03 15:47:37

[诊断] 2. 检查 session_messages 表...
[诊断] ✓ session_messages 表存在

[诊断] 3. 获取表结构...
[诊断] ✓ 表结构: 14 列
  - id: uuid(36) NULL=YES
  - session_id: varchar(255) NULL=YES
  - message_id: varchar(255) NULL=YES
  - robot_id: varchar(64) NULL=YES
  - robot_name: varchar(255) NULL=YES
  - content: text(2147483647) NULL=YES
  - is_from_user: boolean() NULL=YES
  - timestamp: timestamp with time zone() NULL=YES
  ...

[诊断] 4. 测试插入数据...
[诊断] 插入测试数据: {...}
[诊断] ✓ 测试插入成功
[诊断] ✓ 测试数据已清理

[诊断] ===== 诊断结果汇总 =====
数据库连接: ✓
表存在: ✓
表结构: ✓
测试插入: ✓

===== 诊断完成 =====
```

**如果诊断失败**：
- 检查数据库连接配置
- 检查表是否创建
- 检查字段约束

### 2. 运行消息保存测试脚本

```bash
# 在部署环境中运行
node test-message-save.js
```

**输出示例**：
```
===== 消息保存测试开始 =====

1. 运行数据库诊断...
...

2. 获取机器人列表...
找到 1 个机器人:
  1. 客服机器人 (robot_001)

3. 测试保存用户消息...
✓ 用户消息保存成功
  sessionId: test_session_xxx
  messageId: test_msg_xxx
  robotId: robot_001
  robotName: 客服机器人

4. 测试保存机器人消息...
✓ 机器人消息保存成功
  sessionId: test_session_xxx
  messageId: bot_msg_xxx

5. 验证消息是否已保存...
找到 2 条消息:
  1. bot_msg_xxx
     类型: 机器人
     robotId: robot_001
     robotName: 客服机器人
     ...

===== 测试总结 =====
数据库连接: ✓
表存在: ✓
用户消息保存: ✓
机器人消息保存: ✓
数据验证: ✓
数据清理: ✓

===== 测试完成 =====
```

### 3. 查看详细错误日志

当消息保存失败时，系统会自动运行详细诊断。查看日志中的诊断信息：

```javascript
// 错误日志包含以下信息：
{
  errorType: "PostgresError",      // 错误类型
  errorMessage: "...",              // 错误消息
  errorCode: "22001",               // PostgreSQL 错误代码
  errorConstraint: "...",           // 违反的约束
  errorTable: "session_messages",   // 错误的表
  errorColumn: "...",               // 错误的列
  context: {                        // 上下文信息
    sessionId: "...",
    sessionIdLength: 123,
    robotId: "...",
    robotName: "...",
    content: "...",
    timestamp: "..."
  },
  suggestions: [                    // 修复建议
    {
      type: "length_exceeded",
      suggestion: "检查字段长度：sessionId(255), robotId(64), robotName(255)"
    }
  ],
  databaseDiagnostics: {            // 数据库诊断结果
    databaseConnection: {...},
    tableExists: true,
    tableStructure: [...],
    testInsert: {...}
  }
}
```

## 常见错误及解决方案

### 错误 1: sessionId 长度超限

**错误信息**：
```
error: value too long for type character varying(255)
errorConstraint: session_messages_session_id_key
```

**原因**：
- 原始 sessionId 格式：`${groupId}_${userId}`
- 如果群名或用户名很长，可能超过 255 字符

**解决方案**：
系统已自动修复，使用哈希值代替原始 ID：
```javascript
// 新格式：sess_xxx (固定长度)
const sessionId = hashSessionId(`${groupId}_${userId}`);
```

**验证**：
检查日志中是否有以下信息：
```
[诊断] sessionId: sess_xxx (长度: 15)
[诊断] ✓ sessionId 长度正常
```

### 错误 2: robotId 长度超限

**错误信息**：
```
error: value too long for type character varying(64)
errorConstraint: session_messages_robot_id_key
```

**原因**：
- robotId 超过 64 字符限制

**解决方案**：
1. 检查机器人配置中的 robotId
2. 确保 robotId 在 64 字符以内
3. 如果 WorkTool 返回的 robotId 过长，可以使用机器人名称作为替代

### 错误 3: timestamp 格式错误

**错误信息**：
```
error: invalid input syntax for type timestamp
```

**原因**：
- timestamp 字段格式不正确

**解决方案**：
系统已自动修复，确保 timestamp 是有效的 ISO 字符串：
```javascript
// 自动处理各种格式
let timestamp = messageContext.timestamp || new Date();
if (typeof timestamp === 'string') {
  timestamp = new Date(timestamp);
}
const timestampISO = timestamp.toISOString();
```

### 错误 4: 机器人信息缺失

**错误信息**：
```
robotName 为空或 "未知机器人"
```

**原因**：
- 机器人的 name 和 nickname 都为空
- robot 对象传递不完整

**解决方案**：
系统已自动修复，使用优先级获取机器人名称：
```javascript
const robotName = robot?.nickname || robot?.name || robot?.robotId || '未知机器人';
```

并自动从 robots 表补充信息。

## 手动验证步骤

### 1. 检查数据库表结构

```sql
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'session_messages'
ORDER BY ordinal_position;
```

### 2. 检查最近的错误日志

```sql
SELECT 
  id,
  level,
  module,
  message,
  error,
  error_constraint,
  error_table,
  timestamp
FROM system_logs
WHERE level = 'ERROR' 
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 10;
```

### 3. 检查最近保存的消息

```sql
SELECT 
  session_id,
  message_id,
  robot_id,
  robot_name,
  content,
  is_from_user,
  timestamp
FROM session_messages
ORDER BY created_at DESC
LIMIT 10;
```

### 4. 验证字段长度

```sql
SELECT 
  session_id,
  length(session_id) as session_id_length,
  robot_id,
  length(robot_id) as robot_id_length,
  robot_name,
  length(robot_name) as robot_name_length
FROM session_messages
ORDER BY created_at DESC
LIMIT 10;
```

## 日志位置

部署环境的日志位置可能不同，常见的位置：

- **Docker**: `/app/logs/` 或 `/var/log/app/`
- **Kubernetes**: `kubectl logs <pod-name>`
- **云服务**: 查看云平台提供的日志服务

## 联系支持

如果以上步骤都无法解决问题，请提供以下信息：

1. 完整的错误日志（包含诊断信息）
2. 数据库诊断脚本输出
3. 消息保存测试脚本输出
4. 数据库表结构（从步骤 1 获取）
5. 最近错误日志（从步骤 2 获取）

## 预防措施

1. **定期运行诊断**：
   ```bash
   # 每天运行一次
   node server/lib/database-diagnostics.js
   ```

2. **监控错误日志**：
   - 设置告警，当出现 ERROR 级别日志时通知
   - 定期检查 system_logs 表

3. **数据清理**：
   ```bash
   # 定期清理旧数据
   node server/services/session-message.service.js cleanup
   ```

## 更新说明

最新版本已修复以下问题：

- ✓ sessionId 长度超限（使用哈希值）
- ✓ timestamp 格式错误（自动转换）
- ✓ 机器人名称缺失（自动补充）
- ✓ 增强错误日志（详细诊断）
- ✓ 添加诊断工具（自动检测）

如果问题仍然存在，说明可能是环境特定的配置问题，需要根据实际的错误信息进行针对性修复。

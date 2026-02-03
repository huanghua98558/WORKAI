# 机器人角色测试文档

## 测试环境

- 前端服务：http://localhost:5000
- 后端服务：http://localhost:5001
- 数据库：PostgreSQL

## 测试准备

### 1. 创建测试机器人

在数据库中创建多个测试机器人：

```sql
-- 营销机器人（自动使用转化客服）
INSERT INTO robots (id, name, robot_id, api_base_url, robot_group, conversion_mode, is_active)
VALUES (
  'test-marketing-bot',
  '测试营销机器人',
  'test_marketing_001',
  'https://api.example.com',
  '营销',
  false,
  true
);

-- 角色机器人（自动使用转化客服）
INSERT INTO robots (id, name, robot_id, api_base_url, robot_type, conversion_mode, is_active)
VALUES (
  'test-role-bot',
  '测试角色机器人',
  'test_role_001',
  'https://api.example.com',
  '角色',
  false,
  true
);

-- 显式转化客服机器人
INSERT INTO robots (id, name, robot_id, api_base_url, conversion_mode, is_active)
VALUES (
  'test-conversion-bot',
  '测试转化客服机器人',
  'test_conversion_001',
  'https://api.example.com',
  true,
  true
);

-- 客服机器人（常规流程）
INSERT INTO robots (id, name, robot_id, api_base_url, robot_group, robot_type, conversion_mode, is_active)
VALUES (
  'test-service-bot',
  '测试客服机器人',
  'test_service_001',
  'https://api.example.com',
  '服务',
  '客服',
  false,
  true
);
```

### 2. 配置 AI 模型

在系统设置中配置 AI 模型：

```json
{
  "ai": {
    "intentRecognition": {
      "useBuiltin": true,
      "builtinModelId": "doubao-pro-4k"
    },
    "serviceReply": {
      "useBuiltin": true,
      "builtinModelId": "doubao-pro-32k"
    },
    "chat": {
      "useBuiltin": true,
      "builtinModelId": "doubao-pro-4k"
    },
    "conversion": {
      "useBuiltin": true,
      "builtinModelId": "doubao-seed-1-8-251228"
    }
  }
}
```

## 测试用例

### 测试用例 1：营销机器人自动使用转化客服

**前置条件**：
- 机器人 `robotGroup = '营销'`
- `conversionMode = false`

**测试步骤**：
1. 发送消息到营销机器人
2. 检查日志输出

**预期结果**：
- 日志输出：`检测到机器人分组为营销，使用转化AI回复`
- 使用转化客服 AI 生成回复
- 不执行常规意图识别流程

**验证命令**：
```bash
# 查看日志
tail -f /app/work/logs/bypass/backend.log | grep "营销"
```

---

### 测试用例 2：角色机器人自动使用转化客服

**前置条件**：
- 机器人 `robotType = '角色'`
- `conversionMode = false`

**测试步骤**：
1. 发送消息到角色机器人
2. 检查日志输出

**预期结果**：
- 日志输出：`检测到机器人类型为角色，使用转化AI回复`
- 使用转化客服 AI 生成回复
- 不执行常规意图识别流程

**验证命令**：
```bash
# 查看日志
tail -f /app/work/logs/bypass/backend.log | grep "角色"
```

---

### 测试用例 3：显式转化客服模式

**前置条件**：
- 机器人 `conversionMode = true`
- `robotGroup` 和 `robotType` 为任意值

**测试步骤**：
1. 发送消息到机器人
2. 检查日志输出

**预期结果**：
- 日志输出：`检测到转化客服模式已启用，使用转化AI回复`
- 使用转化客服 AI 生成回复
- 不执行常规意图识别流程

**验证命令**：
```bash
# 查看日志
tail -f /app/work/logs/bypass/backend.log | grep "转化客服模式"
```

---

### 测试用例 4：客服机器人常规流程 - 服务请求

**前置条件**：
- 机器人 `robotGroup = '服务'`
- `robotType = '客服'`
- `conversionMode = false`

**测试步骤**：
1. 发送服务类问题（如："如何使用产品？"）
2. 检查日志输出

**预期结果**：
- 执行意图识别
- 意图识别结果：`intent = 'service'`
- 使用服务回复 AI 生成回复

**验证命令**：
```bash
# 查看日志
tail -f /app/work/logs/bypass/backend.log | grep "意图识别结果"
tail -f /app/work/logs/bypass/backend.log | grep "服务回复"
```

---

### 测试用例 5：客服机器人常规流程 - 闲聊

**前置条件**：
- 机器人 `robotGroup = '服务'`
- `robotType = '客服'`
- `conversionMode = false`
- 配置 `chatMode = 'ai'`

**测试步骤**：
1. 发送闲聊消息（如："你好啊"）
2. 检查日志输出

**预期结果**：
- 执行意图识别
- 意图识别结果：`intent = 'chat'`
- 使用闲聊 AI 生成回复

**验证命令**：
```bash
# 查看日志
tail -f /app/work/logs/bypass/backend.log | grep "闲聊"
```

---

### 测试用例 6：客服机器人常规流程 - 风险内容

**前置条件**：
- 机器人 `robotGroup = '服务'`
- `conversionMode = false`

**测试步骤**：
1. 发送敏感内容（触发风险识别）
2. 检查日志输出

**预期结果**：
- 执行意图识别
- 意图识别结果：`intent = 'risk'` 或 `needHuman = true`
- 生成风险回复
- 会话状态切换为人工接管

**验证命令**：
```bash
# 查看日志
tail -f /app/work/logs/bypass/backend.log | grep "风险"
```

---

### 测试用例 7：多条件触发（优先级测试）

**前置条件**：
- 机器人同时满足多个转化客服条件：
  - `robotGroup = '营销'`
  - `robotType = '角色'`
  - `conversionMode = true`

**测试步骤**：
1. 发送消息到机器人
2. 检查日志输出

**预期结果**：
- 日志输出：`检测到转化客服模式已启用，使用转化AI回复`（conversionMode 优先级最高）
- 只执行一次转化客服处理

**验证命令**：
```bash
# 查看日志
tail -f /app/work/logs/bypass/backend.log | grep "转化AI"
```

## 监控和日志

### 关键日志关键词

**转化客服模式**：
- `检测到转化客服模式已启用`
- `检测到机器人分组为营销`
- `检测到机器人类型为角色`
- `使用转化AI回复`

**常规流程**：
- `AI 意图识别开始`
- `意图识别结果`
- `使用服务回复模型`
- `闲聊模式`
- `检测到风险内容`

### 查看实时日志

```bash
# 后端日志
tail -f /app/work/logs/bypass/backend.log

# 前端日志
tail -f /app/work/logs/bypass/console.log

# 开发日志
tail -f /app/work/logs/bypass/dev.log
```

## 性能监控

### 检查服务状态

```bash
# 检查后端服务
curl http://localhost:5001/health

# 检查前端服务
curl http://localhost:5000

# 检查服务端口
ss -tuln | grep -E '5000|5001'
```

### 查看处理统计

```bash
# 查看消息处理统计
curl http://localhost:5001/api/execution-tracker/stats?timeRange=24h

# 查看最近处理记录
curl http://localhost:5001/api/execution-tracker/recent?limit=20
```

## 常见问题排查

### 问题 1：机器人没有使用转化客服

**排查步骤**：
1. 检查机器人配置
```sql
SELECT id, name, robot_group, robot_type, conversion_mode FROM robots WHERE id = 'xxx';
```

2. 检查日志输出
```bash
grep "机器人.*分组\|类型" /app/work/logs/bypass/backend.log | tail -20
```

3. 确认触发条件是否匹配

### 问题 2：常规流程没有执行

**排查步骤**：
1. 检查机器人配置是否意外开启了转化客服模式

2. 检查意图识别是否正常
```bash
grep "意图识别结果" /app/work/logs/bypass/backend.log | tail -20
```

3. 检查决策逻辑
```bash
grep "决策逻辑执行" /app/work/logs/bypass/backend.log | tail -20
```

### 问题 3：回复没有发送

**排查步骤**：
1. 检查 WorkTool API 调用
```bash
grep "发送消息" /app/work/logs/bypass/backend.log | tail -20
```

2. 检查网络连接
```bash
curl -I https://api.example.com
```

3. 检查机器人在线状态
```bash
curl http://localhost:5001/api/admin/robots/check-status-all
```

## 测试总结

| 测试项 | 状态 | 备注 |
|-------|------|------|
| 营销机器人转化客服 | ✅ | 自动触发 |
| 角色机器人转化客服 | ✅ | 自动触发 |
| 显式转化客服模式 | ✅ | 优先级最高 |
| 客服机器人常规流程 | ✅ | 意图识别正常 |
| 服务请求处理 | ✅ | 使用服务回复 AI |
| 闲聊处理 | ✅ | 支持多种模式 |
| 风险内容处理 | ✅ | 自动转人工 |
| 多条件触发 | ✅ | 只执行一次 |

## 下一步优化

1. 添加更多机器人类型和分组的测试用例
2. 完善 Prompt 训练和测试流程
3. 添加自动化测试脚本
4. 优化日志输出和错误提示

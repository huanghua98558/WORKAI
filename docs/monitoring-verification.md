# 前端监控面板实时验证指南

## 概述

本指南帮助你验证前端监控面板能否实时看到消息处理和系统运行状况。

## 架构说明

当前系统使用**轮询机制**进行实时监控，而非WebSocket或SSE。

- **刷新间隔**: 15秒（可手动调整）
- **数据源**: 监控API
- **更新方式**: 定时调用API获取最新数据

## 验证步骤

### 方法1: 使用自动化验证脚本（推荐）

运行自动化验证脚本：

```bash
cd /workspace/projects
chmod +x scripts/verify-monitoring.sh
./scripts/verify-monitoring.sh
```

该脚本会自动完成：
1. 检查服务状态
2. 发送5条不同类型的测试消息
3. 验证监控数据是否正确
4. 显示详细的验证结果

### 方法2: 手动验证

#### 步骤1: 检查服务运行

```bash
curl -I http://localhost:5000
```

#### 步骤2: 发送测试消息

方式1: 使用消息模拟器

1. 访问 `http://localhost:5000/test/message-simulator`
2. 点击预设测试场景的"测试"按钮
3. 或点击"运行全部测试"按钮

方式2: 使用API

```bash
curl -X POST -H "Content-Type: application/json" -d '{
  "robotId": "robot_test_001",
  "content": "测试消息内容",
  "senderId": "user_test_001",
  "senderName": "测试用户",
  "senderType": "user",
  "groupId": "test_group_001",
  "groupName": "测试社群"
}' http://localhost:5000/api/flow-engine/test
```

#### 步骤3: 查看监控面板

1. 访问 `http://localhost:5000/monitoring`
2. 观察页面数据

### 验证要点

#### 1. 系统健康状态

检查页面顶部的4个卡片：

- ✅ **总执行数**: 应该增加（发送了多少条消息就增加多少）
- ✅ **成功率**: 应该是100%（如果消息都成功）
- ✅ **AI调用数**: 如果流程中调用了AI，这里会增加
- ✅ **活跃会话**: 显示最近1小时内的活跃会话数

#### 2. 消息处理列表

切换到"消息处理"标签页，查看执行记录：

- ✅ 显示最新的消息处理记录
- ✅ 每条记录包含：状态、机器人ID、消息内容、时间等
- ✅ 点击记录可以查看详细信息

#### 3. AI对话列表

如果流程中调用了AI，切换到"AI对话"标签页：

- ✅ 显示AI调用记录
- ✅ 包含操作类型、输入输出、状态等

#### 4. 实时更新测试

1. 保持监控面板打开
2. 确保右上角的"开始刷新"按钮是激活状态
3. 打开新标签页，访问消息模拟器
4. 发送新的测试消息
5. 切换回监控面板，等待最多15秒
6. 数据应该自动更新，显示新消息

#### 5. 手动刷新

点击右上角的"刷新"按钮，立即获取最新数据。

## 监控面板功能说明

### 顶部操作按钮

- **返回**: 返回首页
- **告警设置**: 配置告警规则
- **开始刷新/停止刷新**: 控制自动刷新（每15秒）
- **刷新**: 手动立即刷新
- **创建测试消息**: 快速创建测试消息

### 系统健康卡片

显示关键指标：
- 总执行数
- 成功率
- AI调用
- 活跃会话
- 待处理告警

### 消息处理标签页

显示流程执行记录：
- 状态图标（成功/失败/处理中）
- 机器人ID和名称
- 消息内容
- 执行时间
- 点击查看详情

### AI对话标签页

显示AI调用日志：
- 操作类型
- AI输入和输出
- 模型ID
- 调用状态和耗时

### 执行详情

点击任意执行记录，查看：
- 执行概览
- 节点执行步骤
- 决策过程
- 错误信息（如有）

## 监控API说明

### 系统健康

```bash
GET /api/monitoring/health
```

返回系统健康状态、执行统计、AI统计等。

### 执行记录

```bash
GET /api/monitoring/executions?limit=50
```

返回流程执行记录列表。

### AI日志

```bash
GET /api/monitoring/ai-logs?limit=50
```

返回AI调用日志列表。

### 执行详情

```bash
GET /api/monitoring/executions/:processingId
```

返回指定执行的详细信息。

### 系统监控

```bash
GET /api/monitor/system
```

返回数据库、队列、系统状态。

### 队列监控

```bash
GET /api/queue/monitor
```

返回队列状态和消息列表。

## 实时性能优化建议

当前使用轮询机制，如果需要更实时的监控，可以考虑：

### 1. 调整刷新间隔

编辑 `/src/app/monitoring/page.tsx`:

```typescript
const interval = setInterval(() => {
  fetchHealth();
  fetchExecutions();
  fetchAiLogs();
}, 5000); // 从15秒改为5秒
```

### 2. 使用Server-Sent Events (SSE)

创建SSE端点，前端使用EventSource监听。

### 3. 使用WebSocket

建立WebSocket连接，实现真正的实时推送。

## 故障排查

### 问题1: 监控面板显示"未找到执行记录"

**原因**: 可能是数据库查询失败或没有数据

**解决方案**:
```bash
# 检查数据库连接
curl http://localhost:5000/api/monitor/system | jq '.database.health'

# 手动发送测试消息
curl -X POST -H "Content-Type: application/json" -d '{
  "robotId": "robot_test_001",
  "content": "测试消息",
  "senderId": "user_test_001",
  "senderName": "测试用户",
  "senderType": "user"
}' http://localhost:5000/api/flow-engine/test
```

### 问题2: 自动刷新不工作

**原因**: 浏览器限制了后台定时器

**解决方案**:
- 刷新页面
- 确保页面标签处于活动状态
- 使用"刷新"按钮手动刷新

### 问题3: 数据更新延迟

**原因**: 轮询间隔是15秒

**解决方案**:
- 点击"刷新"按钮立即更新
- 或调整刷新间隔（见上面"实时性能优化建议"）

## 下一步

1. ✅ 运行验证脚本确认功能正常
2. ✅ 打开监控面板查看实时数据
3. ✅ 使用消息模拟器发送测试消息
4. ✅ 观察数据实时更新
5. 📊 根据需要调整刷新频率
6. 🚀 考虑升级到SSE或WebSocket实现真正的实时推送

## 相关文件

- 监控面板: `/src/app/monitoring/page.tsx`
- 消息模拟器: `/src/app/test/message-simulator/page.tsx`
- 验证脚本: `/scripts/verify-monitoring.sh`
- 监控API: `/src/app/api/monitoring/`

# 工作人员类型系统实施总结

## 概述

本次更新实施了多机器人角色系统（社群运营、转化客服、售后客服）的第一阶段核心基础功能，包括数据库Schema修改、核心服务层、消息处理API和关键接口。

## 修改文件清单

### 数据库 Schema (5个文件)
1. `src/storage/database/new-schemas/staff.ts` - 添加 `staff_type` 字段
2. `src/storage/database/new-schemas/interventions.ts` - 添加 `staff_type` 字段
3. `src/storage/database/shared/schema.ts` - 修改 `alertHistory`, `collaborationDecisionLogs` 表
4. `src/storage/database/new-schemas/after-sales-tasks.ts` - 新建售后任务表
5. `src/storage/database/new-schemas/staff-identification-logs.ts` - 新建工作人员识别日志表

### 服务层 (4个文件)
6. `src/services/staff-type-service.ts` - 工作人员类型管理服务
7. `src/services/after-sales-task-service.ts` - 售后任务管理服务
8. `src/services/staff-message-context-service.ts` - 工作人员消息上下文服务
9. `src/lib/cache/staff-type-cache.ts` - 工作人员类型缓存
10. `src/lib/services/collaboration-decision-service.ts` - 协同决策服务（已修改）

### API 层 (4个文件)
11. `src/app/api/messages/route.ts` - 消息处理 API（已增强）
12. `src/app/api/staff/type/route.ts` - 工作人员类型管理 API
13. `src/app/api/after-sales/tasks/route.ts` - 售后任务列表和创建 API
14. `src/app/api/after-sales/tasks/[id]/route.ts` - 售后任务详情、更新、取消 API
15. `src/app/api/sessions/[id]/reply-status/route.ts` - 消息回复状态 API

### 配置 (1个文件)
16. `src/config/keywords.ts` - 关键词配置

### 迁移脚本 (5个文件)
17. `scripts/migrate/backup-db.ts` - 数据库备份
18. `scripts/migrate/migrate-staff-type.ts` - 迁移脚本
19. `scripts/migrate/verify-migration.ts` - 验证脚本
20. `scripts/migrate/rollback-migration.ts` - 回滚脚本
21. `scripts/migrate/create-indexes.ts` - 创建索引
22. `scripts/migrate/index.ts` - 统一迁移入口

## 核心功能

### 1. 工作人员类型管理

**工作人员类型定义：**
- `management` - 管理人员
- `community` - 社群运维
- `conversion` - 转化客服
- `after_sales` - 售后客服
- `sales` - 销售客服
- `notification` - 通知机器人

**主要功能：**
- 设置工作人员类型
- 批量设置工作人员类型
- 获取工作人员类型
- 缓存优化（1小时TTL）

**使用示例：**
```typescript
// 设置工作人员类型
const result = await staffTypeService.setStaffType('user_123', 'community');

// 获取工作人员类型
const result = await staffTypeService.getStaffTypeByIdentifier('user_123');
```

### 2. 售后任务管理

**任务状态流转：**
- `pending` - 待处理
- `in_progress` - 处理中
- `waiting_response` - 等待用户确认
- `completed` - 已完成
- `cancelled` - 已取消

**任务优先级：**
- `low` - 低
- `normal` - 普通
- `high` - 高
- `urgent` - 紧急

**主要功能：**
- 创建售后任务
- 分配任务
- 更新任务状态
- 完成任务
- 取消任务
- 升级任务优先级
- 超时提醒（6h/12h/24h）

**使用示例：**
```typescript
// 创建售后任务
const task = await afterSalesTaskService.createTask({
  sessionId: 'session_123',
  staffUserId: 'staff_456',
  userId: 'user_789',
  userName: '张三',
  taskType: 'general',
  priority: 'normal',
  status: 'pending',
  title: '售后任务 - 用户反馈问题',
  description: '用户反馈无法正常使用',
});

// 完成任务
await afterSalesTaskService.completeTask(task.id, 'staff_456', '问题已解决');

// 升级任务
await afterSalesTaskService.escalateTask(task.id, 'urgent', '用户投诉升级');
```

### 3. 消息处理增强

**新增功能：**
- 工作人员类型自动识别
- 工作人员消息上下文记录
- 决策日志增强（包含 staff_type 和 message_type 字段）
- 售后任务自动创建（检测售后人员 @用户 + 关键词）

**决策日志字段扩展：**
```typescript
{
  staff_type: string;      // 工作人员类型
  message_type: string;    // 消息类型
  // ... 原有字段
}
```

### 4. 消息回复状态查询

**API：** `GET /api/sessions/[id]/reply-status`

**返回数据：**
```typescript
{
  messageId: string;
  shouldAiReply: boolean;
  aiAction: string;
  staffAction: string;
  replied: boolean;
  replyType: 'ai' | 'staff' | 'none' | 'both';
  repliedAt?: string;
  repliedBy?: string;
  staffType?: string;
  messageType?: string;
  priority?: string;
  reason?: string;
}
```

**统计信息：**
- `total` - 总消息数
- `pending` - 待回复数
- `aiReplied` - AI回复数
- `staffReplied` - 人工回复数
- `bothReplied` - 同时回复数
- `shouldAiReply` - 应该AI回复数

### 5. 关键词配置

**场景关键词：**
- `community` - 社群运营关键词
- `conversion` - 转化客服关键词
- `after_sales` - 售后客服关键词
- `sales` - 销售客服关键词
- `notification` - 通知机器人关键词

**主要功能：**
- 获取场景关键词
- 检查文本是否包含关键词
- 匹配文本中的关键词
- 猜测文本场景

**使用示例：**
```typescript
// 获取售后关键词
const keywords = getKeywordsByScenario('after_sales');

// 检查文本是否包含售后关键词
const hasKeyword = hasKeywords('用户反馈无法使用', 'after_sales');

// 匹配关键词
const matched = matchKeywords('需要你配合处理', 'after_sales');
```

## 数据库迁移

### 迁移步骤

**1. 备份数据库（可选但推荐）：**
```bash
pnpm tsx scripts/migrate/backup-db.ts
```

**2. 执行迁移：**
```bash
# 预览迁移步骤
pnpm tsx scripts/migrate/index.ts dry-run

# 执行迁移
pnpm tsx scripts/migrate/index.ts execute
```

**3. 验证迁移：**
```bash
pnpm tsx scripts/migrate/verify-migration.ts
```

**4. 回滚（如果需要）：**
```bash
pnpm tsx scripts/migrate/index.ts rollback
```

### 迁移内容

**新增表：**
- `after_sales_tasks` - 售后任务表
- `staff_identification_logs` - 工作人员识别日志表

**新增字段：**
- `staff.staff_type` - 工作人员类型
- `interventions.staff_type` - 介入工作人员类型
- `alert_history.related_task_id` - 关联任务ID
- `alert_history.source` - 告警来源
- `collaboration_decision_logs.staff_type` - 工作人员类型
- `collaboration_decision_logs.message_type` - 消息类型

**新增索引：**
- 售后任务表：8个索引
- 工作人员识别日志表：7个索引
- staff表：1个索引
- interventions表：1个索引
- alert_history表：3个索引
- collaboration_decision_logs表：3个索引

## API 文档

### 工作人员类型管理 API

**GET /api/staff/type**
- 查询参数：`staffUserId`（可选）
- 返回：工作人员类型列表或单个工作人员类型

**POST /api/staff/type**
- 请求体：`{ staffUserId, staffType }`
- 返回：设置结果

**PUT /api/staff/type**
- 请求体：`{ items: [{ staffUserId, staffType }] }`
- 返回：批量设置结果

### 售后任务管理 API

**GET /api/after-sales/tasks**
- 查询参数：`sessionId`, `staffUserId`, `userId`, `status`, `priority`, `taskType`, `assignedTo`, `limit`, `offset`
- 返回：任务列表

**POST /api/after-sales/tasks**
- 请求体：任务详情对象
- 返回：创建的任务

**GET /api/after-sales/tasks/[id]**
- 返回：任务详情

**PUT /api/after-sales/tasks/[id]**
- 请求体：更新字段
- 返回：更新后的任务

**POST /api/after-sales/tasks/[id]/assign**
- 请求体：`{ assignedTo }`
- 返回：分配结果

**POST /api/after-sales/tasks/[id]/complete**
- 请求体：`{ completedBy, completionNote }`
- 返回：完成结果

**POST /api/after-sales/tasks/[id]/cancel**
- 请求体：`{ cancelReason }`
- 返回：取消结果

**POST /api/after-sales/tasks/[id]/escalate**
- 请求体：`{ priority, escalationReason }`
- 返回：升级结果

**DELETE /api/after-sales/tasks/[id]**
- 返回：删除结果

### 消息回复状态 API

**GET /api/sessions/[id]/reply-status**
- 返回：会话中所有消息的回复状态和统计信息

## 机器人角色配置

### 社群运营机器人（community）
- **识别所有人员**：包括工作人员
- **AI回复用户**：自动回复用户消息
- **记录工作人员消息**：记录但不回复
- **关键词**：需要你、配合、扫脸、帮忙、协助等

### 转化客服机器人（conversion）
- **不识别工作人员**：完全禁止工作人员介入
- **所有消息AI回复**：包括用户消息
- **关键词**：购买、订单、支付、价格、优惠等

### 售后客服机器人（after_sales）
- **识别售后人员**：识别售后类型工作人员
- **配合人工**：记录任务与提醒（第二阶段）
- **创建售后任务**：售后人员 @用户 + 关键词时创建任务
- **关键词**：需要你、配合、扫脸、售后、退款、投诉等

### 通知机器人（notification）
- **复用社群运营机器人**
- **发送提醒通知**
- **关键词**：提醒、通知、警报、告警等

## 性能优化

### 缓存策略
- 工作人员类型缓存：1小时TTL
- 自动清理过期缓存：每10分钟

### 索引优化
- 售后任务表：8个索引（会话、用户、状态、优先级等）
- 工作人员识别日志表：7个索引
- 关键查询字段都已建立索引

### 性能目标
- 单消息处理性能影响控制在 +50ms 以内
- 工作人员类型查询优化（缓存 + 索引）

## 后续工作

### 第一阶段（当前已完成）
- ✅ 数据库Schema修改
- ✅ 核心服务层实现
- ✅ 消息处理API增强
- ✅ 工作人员类型管理API
- ✅ 售后任务管理API
- ✅ 消息回复状态API

### 第二阶段（待实施）
- 修改业务消息监控组件（显示回复状态）
- 创建售后任务监控组件
- 创建工作人员类型配置组件
- 修改告警管理组件（售后任务告警）
- 修改流程引擎节点属性（staffTypeFilter）
- 修改流程引擎API联动
- 测试与验证（所有场景测试）

### 第三阶段（待实施）
- 销售客服机器人
- 高级工作人员识别（模式匹配、机器学习）
- 售后任务自动分配
- 智能提醒优化

## 注意事项

1. **迁移前备份**：虽然迁移脚本包含备份功能，但建议在生产环境迁移前手动备份数据库

2. **分批迁移**：对于大量数据，建议分批迁移，避免长时间锁表

3. **性能监控**：迁移后监控性能，确保符合 +50ms 的性能目标

4. **索引创建**：索引创建可能需要较长时间，建议在低峰期执行

5. **回滚准备**：准备好回滚方案，如果遇到问题可以快速回滚

## 测试建议

### 单元测试
- 工作人员类型服务测试
- 售后任务服务测试
- 消息上下文服务测试
- 缓存服务测试

### 集成测试
- 消息处理流程测试
- 工作人员识别测试
- 售后任务创建和流转测试
- 决策日志记录测试

### 场景测试
- 社群运营机器人测试
- 转化客服机器人测试
- 售后客服机器人测试
- 工作人员介入测试
- 售后任务超时提醒测试

## 联系方式

如有问题或需要帮助，请联系开发团队。

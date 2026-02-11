# v8.0 统一消息处理流程架构文档

## 概述

v8.0 统一消息处理流程是 WorkTool AI 智能客服系统的核心流程引擎，负责处理所有企业微信群消息，包括用户消息、工作人员消息、运营消息和机器人消息。

## 流程ID
- **ID**: `unified-message-routing-v8`
- **版本**: `8.0.0`
- **状态**: 已激活
- **节点数**: 15
- **边数**: 19

## 流程架构

### 节点列表

| 节点ID | 节点名称 | 节点类型 | 说明 |
|--------|---------|---------|------|
| node_webhook_trigger | Webhook触发器 | trigger_webhook | 接收企业微信机器人回调 |
| node_message_receive | 消息接收与保存 | multi_task_message | 保存消息到数据库和会话 |
| node_priority_check | 优先级判断 | PRIORITY_CHECK | 判断消息优先级（P0-P3） |
| node_sender_identify | 发送者身份识别 | multi_task_ai | 识别发送者角色 |
| node_image_recognition | 图片识别 | IMAGE_RECOGNITION | 识别图片内容，提取文字 |
| node_route_branch | 角色路由 | condition | 根据优先级和角色路由 |
| node_high_priority_handling | 高优先级处理 | USER_MESSAGE_HANDLER | 处理P0紧急消息 |
| node_operation_handling | 运营消息处理 | OPERATION_MESSAGE | 处理运营（财神爷）消息 |
| node_staff_handling | 工作人员消息处理 | STAFF_MESSAGE_HANDLER | 处理工作人员消息 |
| node_after_sales_handling | 售后任务处理 | after_sales_task | 处理售后任务 |
| node_user_handling | 用户消息处理 | USER_MESSAGE_HANDLER | 处理用户消息 |
| node_robot_handling | 机器人消息处理 | MONITOR_ONLY | 监控机器人消息 |
| node_collaboration_analysis | 协同分析 | COLLABORATION_ANALYSIS_NODE | 分析协同效率和质量 |
| node_intervention_decision | 介入决策 | INTERVENTION_DECISION | 决定是否需要人工介入 |
| node_session_management | 会话管理与分析 | end | 更新会话状态和上下文 |

## 核心功能模块

### 1. 优先级判断（PRIORITY_CHECK）

**节点ID**: `node_priority_check`

**功能**:
- 根据关键词判断消息优先级
- 支持 P0、P1、P2、P3 四个优先级
- 自动触发告警机制

**优先级规则**:

| 优先级 | 关键词 | 说明 | 告警 |
|--------|--------|------|------|
| P0 | 紧急、投诉中、封号、封禁、报警、严重错误、无法使用、系统崩溃、数据丢失 | 最高优先级：紧急问题、严重投诉、系统故障 | ✅ |
| P1 | 投诉、不满意、退款、退费、返现、奖励、赔偿、质量、故障、错误 | 高优先级：投诉、退款、质量问题 | ✅ |
| P2 | 咨询、求助、麻烦、不会、怎么、如何、问题、疑问 | 中优先级：普通咨询、求助 | ❌ |
| P3 | 谢谢、感谢、收到、好的、明白、了解、可以 | 低优先级：确认、感谢 | ❌ |

**配置**:
```json
{
  "defaultPriority": "P2",
  "alertThreshold": "P0"
}
```

### 2. 运营消息处理（OPERATION_MESSAGE）

**节点ID**: `node_operation_handling`

**功能**:
- 识别运营（财神爷）消息
- 解析运营指令和任务分配
- 跟踪号主响应情况
- 检测潜在冲突

**特殊处理**:
- 检测指令关键词：@所有人、全员、紧急、重要通知、任务分配
- 跟踪运营要求响应
- 检测工作冲突

**上下文检索**:
- 会话类型：群聊
- 用户画像字段：合作等级、满意度
- 新用户优化：简短回复、跨群历史

### 3. 图片消息处理（IMAGE_RECOGNITION）

**节点ID**: `node_image_recognition`

**功能**:
- 识别图片内容
- OCR 文字提取
- 物体检测
- 关键信息提取

**配置**:
```json
{
  "enableOCR": true,
  "enableContentAnalysis": true,
  "ocrConfig": {
    "extractText": true,
    "minConfidence": 0.7
  },
  "contentAnalysisConfig": {
    "detectObjects": true,
    "detectText": true,
    "extractKeyInfo": true
  }
}
```

**输出**:
- `hasImage`: 是否包含图片
- `imageContent`: 图片识别结果
- `extractedText`: 从图片中提取的文字

### 4. 协同分析（COLLABORATION_ANALYSIS_NODE）

**节点ID**: `node_collaboration_analysis`

**功能**:
- 分析工作人员活跃度
- 评估用户满意度
- 计算协同效率
- 统计问题解决率

**分析维度**:

#### 活跃度分析
- 响应率：工作人员回复消息的比例
- 平均响应时间：工作人员回复的平均时间
- 活跃时段：工作人员最活跃的时间段

#### 满意度分析
- 好评率：用户给予好评的比例
- 中评率：用户给予中评的比例
- 差评率：用户给予差评的比例
- 平均满意度：用户满意度的平均分

#### 协同效率分析
- 协同次数：工作人员之间协同的次数
- 平均协同时间：完成协同任务的平均时间
- 协同成功率：协同任务成功的比例

#### 问题解决率分析
- 首次解决率：首次回复即解决问题的比例
- 平均解决时间：解决问题的平均时间
- 重新咨询率：用户因同一问题重新咨询的比例

**配置**:
```json
{
  "analysisDimensions": [
    "staff_activity",
    "user_satisfaction",
    "collaboration_efficiency",
    "problem_resolution"
  ],
  "timeWindow": {
    "duration": "7d",
    "type": "rolling"
  },
  "thresholds": {
    "lowActivityRate": 0.3,
    "lowSatisfactionScore": 3.0,
    "highCollaborationTime": 3600,
    "lowResolutionRate": 0.7
  }
}
```

### 5. 介入决策（INTERVENTION_DECISION）

**节点ID**: `node_intervention_decision`

**功能**:
- 基于分析结果和业务规则，决定是否需要人工介入
- 支持多种介入策略

**介入条件**:
- 高优先级消息（P0、P1）
- 负面情绪检测
- 长响应时间（超过 5 分钟）
- 投诉关键词检测
- 低协同效率

**介入规则**:
```json
{
  "priority": ["P0", "P1"],
  "responseTimeThreshold": 300,
  "negativeEmotionThreshold": 0.7,
  "complaintKeywords": ["投诉", "不满意", "质量问题"]
}
```

**介入级别**:
- `normal`: 普通介入
- `urgent`: 紧急介入
- `critical`: 严重介入

## 流程变量

系统定义了 18 个流程变量，用于在流程执行过程中传递和存储数据：

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| priority | string | P2 | 消息优先级（P0-P3） |
| senderRole | string | user | 发送者角色（user/staff/operation/robot） |
| routeToAfterSales | boolean | false | 是否路由到售后处理 |
| hasImage | boolean | false | 是否包含图片 |
| imageContent | object | {} | 图片识别结果 |
| extractedText | string | '' | 从图片中提取的文字 |
| collaborationScore | number | 0 | 协同评分（0-100） |
| staffActivityRate | number | 0 | 工作人员活跃率（0-1） |
| userSatisfactionScore | number | 4.5 | 用户满意度评分（0-5） |
| problemResolutionRate | number | 0 | 问题解决率（0-1） |
| requireIntervention | boolean | false | 是否需要人工介入 |
| interventionReason | string | '' | 介入原因 |
| interventionLevel | string | normal | 介入级别（normal/urgent/critical） |
| responseTime | number | 0 | 响应时间（秒） |
| collaborationTime | number | 0 | 协同处理时间（秒） |
| messageIntent | string | unknown | 消息意图（咨询/投诉/求助/确认/其他） |
| userEmotion | string | neutral | 用户情绪（positive/neutral/negative） |

## 流程链路

### 主流程链路

```
Webhook触发器
  ↓
消息接收与保存
  ↓
优先级判断
  ↓
发送者身份识别
  ↓
图片识别
  ↓
角色路由
  ↓ (根据优先级和角色分发)
  ├─→ 高优先级处理 (P0)
  ├─→ 运营消息处理
  ├─→ 工作人员消息处理
  ├─→ 售后任务处理
  ├─→ 用户消息处理
  └─→ 机器人消息处理
      ↓
  协同分析
      ↓
  介入决策
      ↓
  会话管理与分析
```

### 路由条件

| 条件 | 目标节点 |
|------|---------|
| `context.priority === "P0"` | node_high_priority_handling |
| `context.senderRole === "operation"` | node_operation_handling |
| `context.senderRole === "group_assistant" || context.senderRole === "after_sales"` | node_staff_handling |
| `context.routeToAfterSales === true` | node_after_sales_handling |
| `context.senderRole === "user"` | node_user_handling |
| `context.senderRole === "robot"` | node_robot_handling |

## 机器人角色体系

系统定义了 4 种机器人角色：

| 角色名称 | 角色ID | 优先级 | 说明 |
|---------|--------|--------|------|
| 监控机器人 | MONITOR | 4 | 监控消息，记录日志，不回复 |
| 通知机器人 | NOTIFIER | 2 | 发送通知和告警 |
| 白班回复机器人 | DAY_REPLY | 1 | 白班时段（9:00-21:00）回复 |
| 晚班回复机器人 | NIGHT_REPLY | 1 | 晚班时段（21:00-24:00）回复 |

## 告警级别

系统定义了 4 个告警级别：

| 级别 | 名称 | 颜色 | 立即告警 |
|------|------|------|---------|
| P0 | 紧急 | #ef4444 | ✅ |
| P1 | 高 | #f97316 | ✅ |
| P2 | 中 | #eab308 | ❌ |
| P3 | 低 | #22c55e | ❌ |

## 时间控制

### 时段定义

| 时段 | 时间范围 | 延迟策略 |
|------|---------|---------|
| 白班 | 9:00-21:00 | 即时回复（0s） |
| 晚班 | 21:00-24:00 | 延迟 60-300s |
| 深夜高 | 0:00-2:00 | 延迟 300-600s |
| 深夜中 | 2:00-4:00 | 延迟 600-1800s |
| 深夜低 | 4:00-6:00 | 不回复 |
| 夜班 | 21:00-24:00 | 延迟 30-90s |

### 高优先级消息延迟

| 时段 | 最小延迟 | 最大延迟 |
|------|---------|---------|
| 白班 | 0s | 0s |
| 晚班 | 30s | 90s |
| 深夜高 | 60s | 120s |
| 深夜中 | 180s | 300s |
| 深夜低 | 不回复 | - |

## 数据库表关联

### flow_definitions
- 存储流程定义
- 包含节点配置、边配置、变量配置

### flow_instances
- 存储流程实例
- 记录每次消息处理的执行状态

### flow_execution_logs
- 存储流程执行日志
- 记录每个节点的执行结果

### messages
- 存储消息内容
- 关联流程实例和会话

### sessions
- 存储会话信息
- 记录会话状态和上下文

## 使用指南

### 1. 启用 v8.0 流程

v8.0 流程默认已激活。如需激活或切换流程：

```sql
-- 激活 v8.0 流程
UPDATE flow_definitions SET is_active = true WHERE id = 'unified-message-routing-v8';

-- 禁用其他流程
UPDATE flow_definitions SET is_active = false WHERE id != 'unified-message-routing-v8';
```

### 2. 修改优先级规则

通过更新节点配置来调整优先级规则：

```sql
UPDATE flow_definitions
SET nodes = jsonb_set(
  nodes::jsonb,
  '{2,data,config,priorityRules,P0,keywords}',
  '["紧急", "严重问题", "系统故障"]'::jsonb
)
WHERE id = 'unified-message-routing-v8';
```

### 3. 调整时间限制

修改用户消息处理的时间限制：

```sql
UPDATE flow_definitions
SET nodes = jsonb_set(
  nodes::jsonb,
  '{10,data,config,timeRestriction,dayShift}',
  '{"enabled": true, "start": "8:00", "end": "22:00"}'::jsonb
)
WHERE id = 'unified-message-routing-v8';
```

### 4. 查看流程执行日志

```sql
SELECT
  fel.id,
  fel.node_type,
  fel.node_name,
  fel.status,
  fel.input_data,
  fel.output_data,
  fel.processing_time,
  fel.started_at
FROM flow_execution_logs fel
WHERE fel.flow_instance_id = 'your-instance-id'
ORDER BY fel.started_at;
```

### 5. 监控协同分析结果

```sql
SELECT
  context->>'collaborationScore' as collaboration_score,
  context->>'staffActivityRate' as staff_activity_rate,
  context->>'userSatisfactionScore' as user_satisfaction_score,
  context->>'problemResolutionRate' as problem_resolution_rate
FROM flow_instances
WHERE flow_definition_id = 'unified-message-routing-v8'
ORDER BY started_at DESC
LIMIT 10;
```

## 性能优化

### 1. 流程超时设置

默认超时时间：60 秒

```sql
UPDATE flow_definitions
SET timeout = 60000
WHERE id = 'unified-message-routing-v8';
```

### 2. 重试配置

默认最大重试次数：3 次，重试间隔：1 秒

```sql
UPDATE flow_definitions
SET retry_config = '{"maxRetries": 3, "retryInterval": 1000}'::jsonb
WHERE id = 'unified-message-routing-v8';
```

### 3. 索引优化

以下索引已创建以优化查询性能：

```sql
-- 流程定义索引
CREATE INDEX flow_definitions_is_active_idx ON flow_definitions(is_active);
CREATE INDEX flow_definitions_trigger_type_idx ON flow_definitions(trigger_type);

-- 流程实例索引
CREATE INDEX flow_instances_flow_definition_id_idx ON flow_instances(flow_definition_id);
CREATE INDEX flow_instances_status_idx ON flow_instances(status);

-- 执行日志索引
CREATE INDEX flow_execution_logs_flow_instance_id_idx ON flow_execution_logs(flow_instance_id);
CREATE INDEX flow_execution_logs_node_type_idx ON flow_execution_logs(node_type);
```

## 故障排查

### 1. 流程实例卡住

检查流程实例状态：

```sql
SELECT
  id,
  status,
  current_node_id,
  error_message,
  started_at
FROM flow_instances
WHERE flow_definition_id = 'unified-message-routing-v8'
  AND status = 'running';
```

### 2. 节点执行失败

查看执行日志：

```sql
SELECT
  node_type,
  node_name,
  status,
  error_message,
  started_at
FROM flow_execution_logs
WHERE flow_instance_id = 'your-instance-id'
  AND status = 'failed'
ORDER BY started_at DESC;
```

### 3. 优先级判断异常

检查优先级配置：

```sql
SELECT
  nodes->2->'data'->'config'->'priorityRules' as priority_rules
FROM flow_definitions
WHERE id = 'unified-message-routing-v8';
```

## 版本历史

| 版本 | 发布日期 | 主要变更 |
|------|---------|---------|
| 8.0.0 | 2025-01-XX | 初始版本，包含优先级判断、图片识别、协同分析、介入决策等核心功能 |

## 后续优化

- [ ] 支持动态优先级规则配置
- [ ] 增强图片识别能力（支持二维码、票据等）
- [ ] 优化协同分析算法
- [ ] 增加更多介入决策策略
- [ ] 支持流程可视化编辑
- [ ] 增加流程性能监控面板

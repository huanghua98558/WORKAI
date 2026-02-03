# 意图处理和告警系统设计文档

## 📋 系统概述

本系统实现了一个完整的意图处理和告警机制，用于WorkTool企业微信群智能运营平台。系统根据用户的意图自动分类，并触发相应的告警通知，确保重要信息能够及时传递给负责人。

## 🎯 核心设计理念

### 意图判断目的
1. **分类**：将用户消息按意图类型分类（服务咨询、帮助请求、闲聊、风险内容、垃圾信息、管理指令等）
2. **友好解答**：根据意图和问题内容，提供专业的、个性化的回答
3. **主动服务**：在感知到用户满意后，可以主动结束会话

### 告警机制（两步走）
1. **第1步 - 系统内部显示**：告警信息在系统监控页面显示
2. **第2步 - 通知负责人**：通过多种方式通知相应负责人

## 🔄 正常会话流程

```
用户消息 → 机器人 → 系统 → AI意图判断 → 系统预警（如需要）→
客服AI回答 → 往来多轮对话 → 用户满意 → 主动结束会话
```

### 详细流程
1. **接收消息**：机器人接收用户消息并传递给系统
2. **AI意图判断**：系统调用AI识别用户消息的意图类型
3. **系统预警**：根据意图类型判断是否需要触发告警
4. **客服AI回答**：系统将意图说明和会话原文传递给客服AI
5. **多轮对话**：AI与用户进行多轮对话，直到用户满意
6. **主动结束**：感知用户满意度后，主动结束会话

## 📊 通知方式

系统支持多种通知方式：

### 1. 机器人通知（robot）
- **描述**：通过机器人给指定负责人发送警告消息
- **优势**：直接在微信群内通知，无需切换应用
- **配置项**：
  - `robotId`: 机器人ID
  - `receivers`: 接收人列表（包含userId）

### 2. 邮件通知（email）
- **描述**：通过邮件发送告警信息
- **优势**：正式通知，适合记录和归档
- **配置项**：
  - `emails`: 邮箱列表
- **状态**：待实现（预留接口）

### 3. 短信通知（sms）
- **描述**：通过短信发送紧急告警
- **优势**：即时性强，不依赖网络
- **配置项**：
  - `phones`: 手机号列表
- **状态**：待实现（预留接口）

### 4. 企业微信通知（wechat）
- **描述**：通过企业微信Webhook发送通知
- **优势**：企业内部协作工具，集成度高
- **配置项**：
  - `webhookUrl`: 企业微信Webhook URL

### 5. 钉钉通知（dingtalk）
- **描述**：通过钉钉Webhook发送通知
- **优势**：企业内部协作工具，支持签名验证
- **配置项**：
  - `webhookUrl`: 钉钉Webhook URL
  - `secret`: 签名密钥（可选）

### 6. 飞书通知（feishu）
- **描述**：通过飞书Webhook发送通知
- **优势**：企业内部协作工具，支持富文本
- **配置项**：
  - `webhookUrl`: 飞书Webhook URL

## 🗄️ 数据库设计

### 1. intent_configs（意图配置表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| intent_type | VARCHAR(50) | 意图类型（唯一） |
| intent_name | VARCHAR(100) | 意图名称 |
| intent_description | TEXT | 意图描述 |
| system_prompt | TEXT | AI识别的系统提示词 |
| is_enabled | BOOLEAN | 是否启用 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**预置意图类型**：
- `service`: 服务咨询
- `help`: 帮助请求
- `chat`: 闲聊
- `welcome`: 欢迎
- `risk`: 风险内容
- `spam`: 垃圾信息
- `admin`: 管理指令

### 2. alert_rules（告警规则表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| intent_type | VARCHAR(50) | 关联的意图类型 |
| rule_name | VARCHAR(255) | 规则名称 |
| is_enabled | BOOLEAN | 是否启用 |
| alert_level | VARCHAR(20) | 告警级别（critical/warning/info） |
| threshold | INTEGER | 告警阈值（连续触发N次才告警） |
| cooldown_period | INTEGER | 冷却时间（秒） |
| message_template | TEXT | 告警消息模板 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 3. notification_methods（通知方式配置表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| alert_rule_id | VARCHAR(36) | 关联的告警规则ID |
| method_type | VARCHAR(50) | 通知方式类型 |
| is_enabled | BOOLEAN | 是否启用 |
| recipient_config | JSONB | 接收人配置 |
| message_template | TEXT | 通知消息模板 |
| priority | INTEGER | 优先级（1-10，1最高） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 4. alert_history（告警历史表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 主键 |
| session_id | VARCHAR(255) | 关联的会话ID |
| alert_rule_id | VARCHAR(36) | 关联的告警规则ID |
| intent_type | VARCHAR(50) | 触发告警的意图类型 |
| alert_level | VARCHAR(20) | 告警级别 |
| user_id | VARCHAR(255) | 触发告警的用户ID |
| user_name | VARCHAR(255) | 触发告警的用户名 |
| group_id | VARCHAR(255) | 群组ID |
| group_name | VARCHAR(255) | 群组名 |
| message_content | TEXT | 触发告警的消息内容 |
| alert_message | TEXT | 告警消息 |
| notification_status | VARCHAR(20) | 通知状态（pending/sent/failed） |
| notification_result | JSONB | 通知结果 |
| is_handled | BOOLEAN | 是否已处理 |
| handled_by | VARCHAR(36) | 处理人ID |
| handled_at | TIMESTAMP | 处理时间 |
| created_at | TIMESTAMP | 创建时间 |

## 🔧 核心服务

### 1. AlertConfigService（告警配置服务）
**职责**：
- 管理意图配置（CRUD）
- 管理告警规则（CRUD）
- 管理通知方式配置（CRUD）
- 获取完整的告警配置

**核心方法**：
```javascript
// 获取所有启用的意图配置
getEnabledIntentConfigs()

// 获取意图类型对应的告警规则
getAlertRuleByIntent(intentType)

// 获取告警规则的通知方式
getNotificationMethods(alertRuleId)

// 创建或更新意图配置
upsertIntentConfig(config)

// 创建或更新告警规则
upsertAlertRule(rule)

// 添加通知方式
addNotificationMethod(method)
```

### 2. AlertTriggerService（告警触发服务）
**职责**：
- 检测是否应该触发告警（检查阈值、冷却时间）
- 在系统内部显示告警（写入告警历史表）
- 调用通知服务发送通知
- 管理告警历史记录

**核心方法**：
```javascript
// 触发告警
triggerAlert(context)

// 检查是否应该触发告警
shouldTriggerAlert(intentType, sessionId, userId)

// 获取最近的告警历史
getRecentAlerts(limit)

// 标记告警为已处理
markAlertAsHandled(alertId, handledBy)

// 获取告警统计
getAlertStats(timeRange)
```

### 3. AlertNotificationService（告警通知服务）
**职责**：
- 支持多种通知方式
- 异步发送通知（不阻塞主流程）
- 记录通知结果

**核心方法**：
```javascript
// 发送通知
sendNotification(methodType, message, recipientConfig, context)

// 通过机器人发送通知
sendByRobot(message, recipientConfig, context)

// 通过邮件发送通知
sendByEmail(message, recipientConfig, context)

// 通过短信发送通知
sendBySMS(message, recipientConfig, context)

// 通过企业微信发送通知
sendByWechat(message, recipientConfig, context)

// 通过钉钉发送通知
sendByDingtalk(message, recipientConfig, context)

// 通过飞书发送通知
sendByFeishu(message, recipientConfig, context)

// 测试通知方式
testNotification(methodType, recipientConfig)
```

## 📝 消息模板变量

告警消息模板支持以下变量：

| 变量 | 说明 |
|------|------|
| `{userName}` | 用户名称 |
| `{groupName}` | 群组名称 |
| `{messageContent}` | 消息内容 |
| `{intent}` | 意图名称 |
| `{intentType}` | 意图类型 |
| `{alertLevel}` | 告警级别（中文） |
| `{timestamp}` | 当前时间（中文格式） |

**示例模板**：
```
⚠️ 风险内容告警

用户 {userName} 在群组 {groupName} 发送了风险内容：
{messageContent}

请及时处理！
```

## 🚀 使用示例

### 配置风险内容告警

```javascript
// 1. 配置意图（已预置，可自定义）
const intentConfig = {
  intentType: 'risk',
  intentName: '风险内容',
  intentDescription: '涉及敏感、恶意内容',
  systemPrompt: '你是一个企业微信群消息意图识别专家...',
  isEnabled: true
};

// 2. 配置告警规则
const alertRule = {
  intentType: 'risk',
  ruleName: '风险内容告警',
  isEnabled: true,
  alertLevel: 'critical',
  threshold: 1,
  cooldownPeriod: 300,
  messageTemplate: '⚠️ 风险内容告警\n\n用户 {userName} 在群组 {groupName} 发送了风险内容：\n{messageContent}\n\n请及时处理！'
};

// 3. 配置通知方式
const notificationMethod = {
  alertRuleId: alertRule.id,
  methodType: 'robot',
  isEnabled: true,
  recipientConfig: {
    robotId: 'your_robot_id',
    receivers: [
      { userId: 'user1', name: '负责人1' },
      { userId: 'user2', name: '负责人2' }
    ]
  },
  priority: 10
};
```

### 手动触发告警测试

```javascript
const alertResult = await alertTriggerService.triggerAlert({
  sessionId: 'session_123',
  intentType: 'risk',
  intent: 'risk',
  userId: 'user_123',
  userName: '张三',
  groupId: 'group_456',
  groupName: '工作群',
  messageContent: '这是测试的风险内容',
  robotId: 'robot_789',
  robotName: '客服机器人',
});
```

## 📈 系统优势

1. **灵活性**：支持多种意图类型和通知方式
2. **可配置性**：所有规则和通知方式均可动态配置
3. **可扩展性**：易于添加新的意图类型和通知方式
4. **实时性**：告警触发后立即发送通知
5. **可靠性**：冷却机制避免重复告警，异步通知不阻塞主流程
6. **可追溯性**：完整的告警历史记录

## 🔄 后续优化方向

1. **前端管理页面**：创建可视化的告警配置管理界面
2. **邮件/短信集成**：实现邮件和短信通知功能
3. **告警分组**：支持告警分组和批量处理
4. **告警升级**：长时间未处理的告警自动升级
5. **统计分析**：增强告警统计和分析功能
6. **自定义脚本**：支持告警触发时执行自定义脚本

## 📞 技术支持

如需技术支持或提出改进建议，请联系开发团队。

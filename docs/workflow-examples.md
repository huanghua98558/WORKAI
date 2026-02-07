# 典型业务场景流程示例

## 目录

- [概述](#概述)
- [标准消息接收流程](#标准消息接收流程)
- [协同分析流程](#协同分析流程)
- [风险处理流程](#风险处理流程)
- [智能客服流程](#智能客服流程)
- [扩展场景](#扩展场景)

---

## 概述

本文档提供了4个典型的业务场景流程示例，展示了如何使用流程引擎构建复杂的业务逻辑。每个示例都包含了完整的节点配置和说明。

---

## 标准消息接收流程

### 场景描述

接收WorkTool消息，自动提取业务角色，智能检测优先级，记录工作人员状态。

### 流程特点

- ✅ 自动识别业务角色（售后、营销、技术等）
- ✅ 智能判断消息优先级（高/中/低）
- ✅ 记录工作人员在线状态
- ✅ 根据优先级分发消息

### 流程图

```
消息接收 → 意图识别 → 优先级决策 → [分发]
                     ↓           ↓
                  高优先级    AI客服回复
                     ↓           ↓
              发送通知 → 流程结束
```

### 关键配置

#### 1. 消息接收节点

```typescript
{
  extractBusinessRole: true,
  roleMapping: `
    售后:包含'售后','客服','支持'字样
    营销:包含'营销','推广','销售'字样
    技术:包含'技术','开发','研发'字样
  `,
  enableSmartPriorityDetection: true,
  priorityKeywords: {
    high: '紧急,投诉,问题,故障,严重',
    low: '闲聊,问候,谢谢,你好',
  },
  trackStaffActivity: true,
}
```

#### 2. 意图识别节点

```typescript
{
  businessRoleMode: 'per_role',
  enableRoleOverride: true,
  fallbackIntentBehavior: 'role_fallback',
}
```

#### 3. 决策节点

```typescript
{
  enableAIBehaviorTrigger: true,
  defaultAIBehaviorMode: 'semi_auto',
  enablePriorityBasedDecision: true,
  priorityRules: {
    high: { branch: 'node_4', aiBehaviorMode: 'full_auto' },
    medium: { branch: 'node_5', aiBehaviorMode: 'semi_auto' },
    low: { branch: 'node_6', aiBehaviorMode: 'record_only' },
  },
}
```

### 实际效果

| 用户类型 | 消息类型 | 优先级 | 处理方式 | 响应时间 |
|---------|---------|-------|---------|---------|
| 技术群组 | 系统故障 | 高 | 立即通知工作人员 | < 1分钟 |
| 营销群组 | 推广咨询 | 低 | AI自动回复 | < 5秒 |
| 售后群组 | 产品问题 | 中 | AI+人工审批 | < 10分钟 |

---

## 协同分析流程

### 场景描述

定期收集和分析业务数据，生成协同分析报告，支持数据丰富和详细日志记录。

### 流程特点

- ✅ 定时执行（每30分钟）
- ✅ 数据分类和意图分析
- ✅ 按业务角色分别分析
- ✅ 详细记录分析日志

### 流程图

```
数据采集 → 意图分类 → 数据分类 → [分析]
                        ↓           ↓
                    客服数据    营销数据
                        ↓           ↓
                 客服分析 → 营销分析
                        ↓           ↓
                     [记录日志] → 生成报告
```

### 关键配置

#### 1. 触发配置

```typescript
{
  triggerType: 'scheduled',
  triggerConfig: {
    cronExpression: '0 */30 * * *', // 每30分钟
  },
}
```

#### 2. 意图分类节点

```typescript
{
  businessRoleMode: 'per_role',
  supportedIntents: ['service', 'complaint', 'inquiry', 'risk', 'spam'],
}
```

#### 3. 指令状态节点

```typescript
{
  roleLogStrategy: 'per_role',
  enableRoleFilter: true,
  logAIBehavior: true,
  logBehaviorMode: true,
  logExecutionTime: true,
  logConfidence: true,
}
```

### 分析报告内容

```
=== 协同分析报告 ===
生成时间: 2026-02-07 16:00:00

【客服数据分析】
- 消息总数: 1,234
- 意图分布: 咨询(45%), 投诉(20%), 其他(35%)
- AI处理率: 78%
- 平均响应时间: 2.5分钟

【营销数据分析】
- 消息总数: 567
- 意图分布: 咨询(60%), 其他(40%)
- AI处理率: 92%
- 平均响应时间: 1.2分钟

【整体统计】
- 总消息数: 1,801
- AI自动处理: 1,456 (81%)
- 需人工介入: 345 (19%)
```

---

## 风险处理流程

### 场景描述

AI安抚用户并通知人工介入，支持任务创建和告警功能。

### 流程特点

- ✅ 自动评估风险等级
- ✅ 严重风险立即处理
- ✅ 自动创建处理任务
- ✅ 支持风险升级策略

### 流程图

```
风险消息 → 风险评估 → 风险等级判断 → [处理]
                      ↓           ↓
                  严重风险    中等风险
                      ↓           ↓
              立即处理 → 记录并通知
                      ↓           ↓
                   告警入库 → 记录状态
                      ↓
                   流程结束
```

### 关键配置

#### 1. 风险评估节点

```typescript
{
  businessRoleMode: 'per_role',
  supportedIntents: ['risk', 'spam', 'complaint', 'security', 'fraud'],
  confidenceThreshold: 0.9,
}
```

#### 2. 严重风险处理节点

```typescript
{
  riskLevel: 'critical',
  pacifyStrategy: 'immediate',
  notifyStaff: true,
  enableTaskCreation: true,
  taskConfig: {
    priority: 'high',
    assignee: 'risk_group',
    deadline: 3600, // 1小时
  },
  escalationStrategy: 'auto',
  escalationRules: {
    critical: {
      escalateAfter: 1800, // 30分钟后升级
      escalateTo: 'incident_manager',
    },
  },
}
```

#### 3. 告警入库节点

```typescript
{
  alertLevel: 'warning',
  alertLevelConfig: {
    critical: {
      autoEscalate: true,
      escalateAfter: 1800,
      notifyChannels: ['email', 'sms', 'webhook'],
    },
  },
  enableTaskCreation: true,
  taskCreationConfig: {
    autoCreate: true,
    taskTemplate: 'risk_handling',
    defaultAssignee: 'risk_manager',
  },
}
```

### 风险处理示例

#### 场景1：严重风险

```
用户消息: "系统出现严重安全漏洞，数据可能泄露！"
├─ 风险评估: 意图=risk, 置信度=0.95
├─ 风险等级: 严重
├─ 处理动作:
│  ├─ 立即通知风险组
│  ├─ 创建紧急任务（截止时间：1小时）
│  ├─ 发送邮件/短信通知
│  └─ 30分钟后自动升级到事故经理
└─ 状态: 已处理
```

#### 场景2：中等风险

```
用户消息: "这个功能有问题，我无法使用"
├─ 风险评估: 意图=complaint, 置信度=0.85
├─ 风险等级: 中等
├─ 处理动作:
│  ├─ 安抚用户
│  ├─ 通知支持组
│  ├─ 创建普通任务（截止时间：2小时）
│  └─ 1小时后可升级到风险组
└─ 状态: 已记录
```

---

## 智能客服流程

### 场景描述

AI智能客服，支持工作人员感知和优先级策略，提供个性化服务。

### 流程特点

- ✅ 识别客户类型（VIP、新客户、普通客户）
- ✅ 工作人员在线检测
- ✅ 根据优先级智能路由
- ✅ 人性化交互体验

### 流程图

```
用户消息 → 意图识别 → 服务策略选择 → [分发]
                        ↓              ↓
                     VIP客户         投诉类
                        ↓              ↓
                 VIP客户分发      投诉处理分发
                        ↓              ↓
              通知工作人员 ←─────────┘
                        ↓
                   记录服务日志
                        ↓
                     服务结束
```

### 关键配置

#### 1. 消息接收节点

```typescript
{
  extractBusinessRole: true,
  roleMapping: `
    VIP客户:包含'VIP','尊贵','金牌'字样
    普通客户:包含'普通','一般'字样
    新客户:包含'新','首次'字样
  `,
  enableSmartPriorityDetection: true,
  priorityKeywords: {
    high: '紧急,投诉,问题,咨询',
    medium: '询问,了解,想知道',
    low: '闲聊,问候,闲谈',
  },
  trackStaffActivity: true,
}
```

#### 2. 决策节点

```typescript
{
  decisionMode: 'priority',
  conditions: [
    {
      label: 'VIP客户',
      expression: 'context.businessRole === "VIP客户"',
      targetNodeId: 'node_4',
    },
    {
      label: '投诉类',
      expression: 'context.intent === "complaint"',
      targetNodeId: 'node_5',
    },
    {
      label: '普通咨询',
      expression: 'true',
      targetNodeId: 'node_6',
    },
  ],
  enableAIBehaviorTrigger: true,
  priorityRules: {
    high: { branch: 'node_4', aiBehaviorMode: 'full_auto' },
    medium: { branch: 'node_5', aiBehaviorMode: 'semi_auto' },
    low: { branch: 'node_6', aiBehaviorMode: 'full_auto' },
  },
}
```

#### 3. VIP客户分发节点

```typescript
{
  enableBusinessRoleDispatch: true,
  staffOnlineCheck: 'priority_if_online',
  enablePriorityDispatch: true,
  priorityRules: {
    high: { targetNodeId: 'node_7' },
  },
}
```

### 服务示例

#### 示例1：VIP客户咨询

```
客户: [VIP用户] "我想了解一下产品的高级功能"
├─ 客户类型识别: VIP客户
├─ 意图识别: inquiry
├─ 优先级: 高
├─ 服务策略:
│  ├─ 优先处理VIP客户
│  ├─ 检测工作人员在线状态
│  ├─ 通知VIP服务团队
│  └─ 提供专业级回复
└─ 响应: < 2分钟
```

#### 示例2：普通客户投诉

```
客户: [普通用户] "这个功能不好用，我要投诉！"
├─ 客户类型识别: 普通客户
├─ 意图识别: complaint
├─ 优先级: 高
├─ 服务策略:
│  ├─ 优先处理投诉
│  ├─ AI安抚用户
│  ├─ 通知支持团队
│  └─ 需人工审批
└─ 响应: < 10分钟
```

#### 示例3：新客户咨询

```
客户: [新用户] "你好，我想了解这个产品"
├─ 客户类型识别: 新客户
├─ 意图识别: inquiry
├─ 优先级: 中
├─ 服务策略:
│  ├─ 提供引导服务
│  ├─ AI自动回复
│  ├─ 介绍产品特点
│  └─ 引导进一步咨询
└─ 响应: < 5分钟
```

---

## 扩展场景

### 场景1：多部门协同流程

**需求**: 跨部门协同处理复杂问题

**流程设计**:

```
消息接收 → 意图识别 → 部门识别 → [并行处理]
                      ↓           ↓
                  技术部门      客服部门
                      ↓           ↓
                  技术分析    客服安抚
                      ↓           ↓
                   [结果汇总] → 流程结束
```

**关键配置**:

```typescript
{
  // 并行处理配置
  enableParallelProcessing: true,
  departments: ['technical', 'support', 'operations'],
  aggregationStrategy: 'wait_all', // 等待所有部门完成
}
```

---

### 场景2：自动化营销流程

**需求**: 自动化营销消息发送和效果追踪

**流程设计**:

```
定时触发 → 客户筛选 → 消息生成 → 消息发送 → 效果追踪
            ↓
         [VIP客户]
            ↓
      个性化消息
```

**关键配置**:

```typescript
{
  // 营销配置
  marketingStrategy: 'personalized',
  targetSegment: 'vip_users',
  messageTemplate: 'vip_promotion',
  enableTracking: true,
  trackingMetrics: ['open_rate', 'click_rate', 'conversion_rate'],
}
```

---

### 场景3：智能质检流程

**需求**: 自动质检客服对话质量

**流程设计**:

```
对话采集 → 质量分析 → 问题识别 → [处理]
                     ↓          ↓
                 语法错误    态度问题
                     ↓          ↓
              记录问题 → 通知主管
                     ↓
                   生成报告
```

**关键配置**:

```typescript
{
  // 质检配置
  qualityMetrics: ['grammar', 'attitude', 'accuracy', 'efficiency'],
  threshold: {
    grammar: 0.8,
    attitude: 0.7,
    accuracy: 0.9,
    efficiency: 0.75,
  },
  autoNotify: true,
  notifyLevel: 'manager',
}
```

---

### 场景4：知识库更新流程

**需求**: 从客服对话中提取知识，自动更新知识库

**流程设计**:

```
对话采集 → 意图识别 → 知识提取 → 质量审核 → 知识入库
                                      ↓
                                  [人工审核]
```

**关键配置**:

```typescript
{
  // 知识提取配置
  extractionMode: 'ai_assisted',
  knowledgeType: ['faq', 'troubleshooting', 'best_practice'],
  qualityThreshold: 0.85,
  enableManualReview: true,
  autoPublish: false, // 需人工审核后发布
}
```

---

## 最佳实践

### 1. 流程设计原则

- **简洁性**: 避免过度复杂的流程设计
- **可读性**: 使用清晰的节点命名和描述
- **可维护性**: 合理使用配置和注释
- **可扩展性**: 预留扩展接口和配置项

### 2. 性能优化

- **合理设置超时时间**: 防止流程长时间阻塞
- **使用异步处理**: 对耗时操作使用异步节点
- **缓存结果**: 对重复计算的结果进行缓存
- **并行处理**: 对独立操作使用并行处理

### 3. 安全考虑

- **权限控制**: 确保操作权限合理分配
- **数据加密**: 敏感数据使用加密传输
- **审计日志**: 记录关键操作的审计日志
- **限流控制**: 防止过度调用导致系统压力

### 4. 监控告警

- **实时监控**: 监控流程执行状态
- **异常告警**: 对异常情况及时告警
- **性能监控**: 监控流程执行性能
- **数据分析**: 分析流程执行数据

---

## 故障排查

### 常见问题

#### 问题1: 流程卡住不执行

**可能原因**:
- 节点配置错误
- 条件表达式不正确
- 缺少必要的连接线

**解决方法**:
1. 检查节点配置是否正确
2. 验证条件表达式语法
3. 确认节点连接线完整

#### 问题2: 消息未收到回复

**可能原因**:
- 意图识别失败
- 决策分支未匹配
- 发送指令配置错误

**解决方法**:
1. 检查意图识别配置
2. 验证决策条件
3. 确认发送指令参数

#### 问题3: 日志记录不完整

**可能原因**:
- 日志策略配置错误
- 数据库连接失败
- 权限不足

**解决方法**:
1. 检查日志策略配置
2. 验证数据库连接
3. 确认写入权限

---

## 参考资源

- [节点配置指南](./node-configuration-guide.md)
- [业务角色配置](../src/app/flow-engine/config/business-roles.ts)
- [默认流程定义](../src/app/flow-engine/default-flows/)

---

## 更新日志

- **2026-02-07**: 初始版本，包含4个典型业务场景流程示例

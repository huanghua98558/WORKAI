# 流程引擎默认流程配置 v4.0

## 📋 概述

本目录包含基于v4节点配置的6个默认流程，覆盖系统的核心功能场景。

---

## 🚀 默认流程列表

### 1. 标准客服流程（默认）⭐
**文件**: `01-standard-customer-service.json`

**流程标识**:
```json
{
  "isDefault": true
}
```

**流程路径**:
```
MESSAGE_ENTRY → SMART_ANALYZE → FLOW_DECISION → AI_AGENT → MESSAGE_EXIT → FLOW_END
```

**节点数**: 6个

**适用场景**:
- ✅ 标准客户咨询
- ✅ AI智能回复
- ✅ 意图识别和情绪分析
- ✅ 企业微信机器人发送
- ✅ 自定义机器人发送

**核心功能**:
- 📥 消息接收、保存、解析
- 🧠 意图识别、情绪分析、敏感信息检测
- 🔀 智能决策路由
- 🤖 AI回复生成（支持角色、话术模板）
- 📤 消息发送（企业微信、自定义）
- ⚖️ 优先级和负载均衡

**预计耗时**: 3-5秒

---

### 2. 风险处理流程
**文件**: `02-risk-handling.json`

**流程路径**:
```
MESSAGE_ENTRY → SMART_ANALYZE → FLOW_DECISION → RISK_HANDLER → MESSAGE_EXIT → FLOW_END
```

**节点数**: 6个

**适用场景**:
- ⚠️ 敏感内容检测
- ⚠️ 垃圾信息过滤
- ⚠️ 攻击性言论处理
- ⚠️ 欺诈识别

**核心功能**:
- ⚠️ 风险检测（关键词、正则、AI模型）
- 📊 风险等级评估（严重/高/中/低）
- 😌 风险安抚回复
- 🔔 风险告警触发
- 👥 工作人员通知
- 📝 风险记录

**预计耗时**: 2-4秒

---

### 3. 人工接管流程
**文件**: `03-human-handover.json`

**流程路径**:
```
MESSAGE_ENTRY → SMART_ANALYZE → FLOW_DECISION → HUMAN_HANDOVER → FLOW_END
```

**节点数**: 5个

**适用场景**:
- 👥 用户投诉
- 😠 负面情绪（愤怒、悲伤、焦虑）
- 🤔 复杂问题需要人工处理
- 📞 高优先级客户

**核心功能**:
- 👥 工作人员分配（轮询/最少负载/优先级）
- 🎯 技能匹配
- 🕐 工作时间检查
- 📧 交接通知（邮件、微信、钉钉）
- 🔄 会话转移
- ⏸️ AI暂停

**预计耗时**: 1-2秒

---

### 4. 告警升级流程 ⭐增强
**文件**: `04-alert-escalation.json`

**流程路径**:
```
MESSAGE_ENTRY → SMART_ANALYZE → FLOW_DECISION → ALERT_ESCALATION → HUMAN_HANDOVER → FLOW_END
```

**节点数**: 6个

**适用场景**:
- 😠 用户愤怒情绪 → 立即介入
- 😔 用户负面情绪（得分≥0.7）→ 提升告警1级
- 📢 用户投诉意图 → 立即介入
- 😤 负面关键词（垃圾/差评/糟糕）→ 提升告警2级

**核心功能** ⭐增强:
- 🔍 **用户不满意检测**（愤怒、负面、投诉、负面关键词）
- ⚡ **立即介入机制**（通知经理、升级到严重级别）
- 📈 **告警级别提升**（根据不满意程度提升1-2级）
- 🔔 **告警升级规则**（时间自动升级、严重自动升级、用户不满意升级）
- 📢 **通知工作人员本人**和**通知经理**
- 📊 **告警升级层级**（level_1 → level_5）

**用户不满意检测规则**:
```json
{
  "angryEmotion": {
    "action": "immediate_intervention",
    "escalateTo": "level_3"
  },
  "negativeEmotion": {
    "action": "elevate_alert",
    "increment": 1
  },
  "complaintIntent": {
    "action": "immediate_intervention",
    "escalateTo": "level_3"
  },
  "negativeKeywords": {
    "action": "elevate_alert",
    "increment": 2
  }
}
```

**预计耗时**: 2-3秒

---

### 5. 智能监控流程 ⭐增强
**文件**: `05-smart-monitor.json`

**流程类型**: 定时任务（每5分钟执行一次）

**流程路径**:
```
SMART_MONITOR → FLOW_END
```

**节点数**: 2个

**适用场景**:
- 📊 实时监控群内消息
- 👥 员工回复监测
- ⚠️ 异常行为检测
- 📈 性能监控

**核心功能** ⭐增强:
- 📊 **实时监控**（消息、成员、活动）
- 👥 **员工回复监测**（检测员工是否回复用户消息）
- 🔄 **频率自动调整**:
  - 员工回复后：降低监控频率（5秒 → 30秒，持续10分钟）
  - 无回复时：提高监控频率（5秒 → 2秒，持续3分钟）
  - 调整结束：恢复默认频率（5秒）
- 📝 **不回复记录**（5分钟未回复触发记录，最多10次/天）
- 🔔 **不回复告警**（连续3次不回复触发告警）
- 📈 **员工回复统计**（回复次数、平均时间、回复率、未回复次数）
- ⚠️ **员工异常行为检测**（回复率低于30%触发告警）

**员工回复监测配置**:
```json
{
  "enableStaffReplyMonitoring": true,
  "frequencyAdjustmentRules": {
    "staffReplyDetected": {
      "newFrequency": 30000,
      "duration": 600000,
      "reason": "员工已回复，降低监控频率"
    },
    "noReplyDetected": {
      "newFrequency": 2000,
      "duration": 180000,
      "reason": "员工未回复，提高监控频率"
    },
    "resetFrequency": {
      "newFrequency": 5000,
      "reason": "调整时间结束，恢复默认频率"
    }
  },
  "noReplyRecord": {
    "enableRecording": true,
    "recordThreshold": 300000,
    "maxRecordsPerDay": 10,
    "alertThreshold": 3
  }
}
```

**预计耗时**: 1-2秒（每5分钟执行一次）

---

### 6. 完整流程（演示）
**文件**: `06-complete-flow.json`

**流程路径**:
```
MESSAGE_ENTRY → SMART_ANALYZE → FLOW_DECISION
    ├→ AI_AGENT → MESSAGE_EXIT → FLOW_END
    ├→ RISK_HANDLER
    │   ├→ ALERT_ESCALATION → HUMAN_HANDOVER → FLOW_END
    │   └→ MESSAGE_EXIT → FLOW_END
    └→ SMART_MONITOR → FLOW_END
```

**节点数**: 10个（所有v4节点）

**适用场景**:
- 🎯 完整功能演示
- 📊 系统测试
- 📖 学习参考

**核心功能**:
- 包含所有v4节点
- 展示所有分支和决策逻辑
- 完整的消息处理流程

**预计耗时**: 3-8秒

---

## 🎯 流程选择指南

### 什么时候使用哪个流程？

| 场景 | 推荐流程 | 说明 |
|------|---------|------|
| 🆕 初次使用 | 标准客服流程（默认） | 最常用的流程，覆盖80%场景 |
| ⚠️ 检测到敏感内容 | 风险处理流程 | 自动检测和处理风险消息 |
| 😠 用户投诉/愤怒 | 人工接管流程 | 转人工客服处理 |
| 😔 用户不满意 | 告警升级流程 | 立即介入并提升告警级别 |
| 📊 员工工作监控 | 智能监控流程 | 定时监控员工回复情况 |
| 🎓 学习/测试 | 完整流程 | 查看所有节点和分支 |

---

## 🔧 流程配置说明

### 1. 自动模式（Auto Mode）

所有流程默认启用自动模式：
```json
{
  "autoMode": true
}
```

**优点**:
- ✅ 无需手动配置
- ✅ 使用生产级别的默认配置
- ✅ 一键启用

**关闭自动模式**:
```json
{
  "autoMode": false
}
```

### 2. 触发类型

| 流程 | 触发类型 | 说明 |
|------|---------|------|
| 标准客服流程 | Webhook | 收到消息时触发 |
| 风险处理流程 | Webhook | 收到消息时触发 |
| 人工接管流程 | Webhook | 收到消息时触发 |
| 告警升级流程 | Webhook | 收到消息时触发 |
| 智能监控流程 | Scheduled | 每5分钟定时触发 |
| 完整流程 | Webhook | 收到消息时触发 |

### 3. 节点类型

所有流程基于v4节点配置：
- ✅ MESSAGE_ENTRY（消息入口）
- ✅ SMART_ANALYZE（智能分析）
- ✅ FLOW_DECISION（流程决策）
- ✅ AI_AGENT（AI代理）
- ✅ RISK_HANDLER（风险处理）
- ✅ SMART_MONITOR（智能监控）⭐增强
- ✅ ALERT_ESCALATION（告警升级）⭐增强
- ✅ HUMAN_HANDOVER（人工接管）
- ✅ MESSAGE_EXIT（消息出口）
- ✅ FLOW_END（流程结束）

---

## 📊 流程对比

| 流程 | 节点数 | 预计耗时 | 特殊功能 | 使用频率 |
|------|--------|---------|---------|---------|
| 标准客服流程 | 6 | 3-5秒 | AI回复、机器人发送 | ⭐⭐⭐⭐⭐ 最高 |
| 风险处理流程 | 6 | 2-4秒 | 风险检测、安抚、告警 | ⭐⭐⭐⭐ 高 |
| 人工接管流程 | 5 | 1-2秒 | 工作人员分配、技能匹配 | ⭐⭐⭐ 中 |
| 告警升级流程 | 6 | 2-3秒 | 用户不满意介入、告警提升 | ⭐⭐⭐ 中 |
| 智能监控流程 | 2 | 1-2秒 | 员工回复监测、频率调整 | ⭐⭐⭐⭐ 高 |
| 完整流程 | 10 | 3-8秒 | 所有节点、多种分支 | ⭐ 低（仅演示） |

---

## 🚀 快速开始

### 1. 加载默认流程

```javascript
// 加载默认流程（标准客服流程）
const defaultFlow = await loadFlow('flow_v4_standard_customer_service');
```

### 2. 创建自定义流程

基于默认流程克隆并修改：
```javascript
// 克隆标准客服流程
const customFlow = cloneFlow('flow_v4_standard_customer_service');

// 修改配置
customFlow.name = "我的客服流程";
customFlow.nodes[0].data.config.someOption = "custom_value";

// 保存自定义流程
await saveFlow(customFlow);
```

### 3. 启用/禁用流程

```javascript
// 启用流程
await enableFlow('flow_v4_standard_customer_service');

// 禁用流程
await disableFlow('flow_v4_standard_customer_service');
```

---

## 📝 版本信息

**版本**: v4.0
**基于**: 节点配置详细设计 v4.0（增强版）
**创建日期**: 2025-01-04
**最后更新**: 2025-01-04

---

## 🔗 相关文档

- 节点配置详细设计 v4.0（增强版）: `src/docs/节点配置详细设计_v4_增强版_索引.md`
- 节点配置详细设计 v4.0（第一部分）: `src/docs/节点配置详细设计_v4_增强版_第一部分.md`
- 节点配置详细设计 v4.0（第二部分）: `src/docs/节点配置详细设计_v4_增强版_第二部分.md`
- 节点配置详细设计 v4.0（第三部分）: `src/docs/节点配置详细设计_v4_增强版_第三部分.md`

---

## 💡 使用建议

1. **初次使用**: 从标准客服流程（默认）开始
2. **功能测试**: 使用完整流程测试所有节点
3. **监控员工**: 启用智能监控流程定时监控
4. **处理投诉**: 使用人工接管流程快速转人工
5. **用户不满**: 使用告警升级流程立即介入

---

**如有问题，请联系开发团队。** 🚀

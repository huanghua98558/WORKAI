# WorkTool AI 2.1 - 默认流程定义

## 📚 流程列表

本目录包含6个开箱即用的默认流程定义，涵盖了WorkTool AI 2.1系统的主要功能场景。

### 1. 标准客服流程 (`standard-customer-service.json`)

**用途**：处理标准客户咨询，支持意图识别、AI回复、人工转接

**触发方式**：Webhook（机器人消息回调）

**流程特性**：
- ✅ 消息接收与发送者识别
- ✅ 会话自动创建与管理
- ✅ AI意图识别（咨询、投诉、售后、互动、购买）
- ✅ 情绪分析（积极、中性、消极）
- ✅ 智能分流决策
- ✅ AI自动回复
- ✅ 投诉自动转人工
- ✅ 风险内容处理

**适用场景**：
- 客户咨询（产品、价格、功能）
- 服务支持（售后、技术问题）
- 一般性对话

---

### 2. 风险监控流程 (`risk-monitoring.json`)

**用途**：实时监控群内消息，检测风险内容并触发告警

**触发方式**：定时任务（每5分钟执行一次）

**流程特性**：
- ✅ 实时监听群内消息
- ✅ 敏感词检测
- ✅ 高频投诉检测
- ✅ 异常行为检测
- ✅ 风险等级判断（高/中/低）
- ✅ 自动告警升级
- ✅ 多渠道通知（邮件、短信、电话）

**适用场景**：
- 群聊风险监控
- 舆情监控
- 异常行为检测

---

### 3. 告警处理流程 (`alert-escalation.json`)

**用途**：处理告警升级，按级别通知不同人员

**触发方式**：Webhook（告警触发）

**流程特性**：
- ✅ 告警级别识别（P1/P2/P3/P4）
- ✅ 分级响应机制
- ✅ P4：记录日志
- ✅ P3：发送邮件通知
- ✅ P2：电话通知+创建工单
- ✅ P1：紧急通知+管理层上报

**适用场景**：
- 系统告警处理
- 紧急事件响应
- 运维告警管理

---

### 4. 群组协作流程 (`group-collaboration.json`)

**用途**：多机器人协同工作，支持群组消息分发和任务分配

**触发方式**：Webhook（群组消息）

**流程特性**：
- ✅ 群组类型识别（VIP群、技术支持群、销售群）
- ✅ 机器人智能分发
- ✅ 意图识别与分类
- ✅ 专属AI回复（不同群组使用不同话术）
- ✅ 消息汇总与去重
- ✅ 多机器人协同

**适用场景**：
- VIP客户服务群
- 技术支持群
- 销售群
- 多机器人协同工作

---

### 5. 数据同步流程 (`data-sync.json`)

**用途**：定时同步消息中心数据到流程引擎，保证数据一致性

**触发方式**：定时任务（每天凌晨2点执行）

**流程特性**：
- ✅ 全量数据同步
- ✅ 数据格式转换
- ✅ 数据完整性验证
- ✅ 错误记录与告警
- ✅ 同步日志记录

**适用场景**：
- 数据中心与流程引擎数据同步
- 定期数据备份
- 数据一致性保证

---

### 6. 满意度调查流程 (`satisfaction-survey.json`)

**用途**：在会话结束后自动发送满意度调查

**触发方式**：Webhook（会话关闭事件）

**流程特性**：
- ✅ 会话信息查询
- ✅ AI满意度推断（基于对话内容）
- ✅ 满意度分级（高/中/低）
- ✅ 高满意度：记录日志
- ✅ 中满意度：发送感谢消息
- ✅ 低满意度：主动回访+创建改进工单

**适用场景**：
- 客服满意度调查
- 服务质量监控
- 客户成功管理

---

## 🚀 快速开始

### 导入默认流程

```bash
# 进入项目根目录
cd /workspace/projects/

# 运行导入脚本
node server/scripts/import-default-flows.js
```

### 导入结果示例

```
=== 导入结果 ===
✅ 标准客服流程: 导入成功
✅ 风险监控流程: 导入成功
✅ 告警处理流程: 导入成功
✅ 群组协作流程: 导入成功
✅ 数据同步流程: 导入成功
✅ 满意度调查流程: 导入成功
================
```

---

## 📖 使用指南

### 1. 标准客服流程使用

**步骤**：
1. 确保机器人已配置Webhook回调
2. 激活流程定义
3. 配置AI模型和话术模板
4. 配置工作人员分配策略

**API调用**：
```javascript
// 触发流程（通过Webhook）
POST /api/worktool/callback
{
  "robotId": "robot-001",
  "message": {
    "content": "我想咨询产品价格",
    "senderId": "user-001",
    "senderType": "user"
  }
}
```

### 2. 风险监控流程使用

**步骤**：
1. 配置定时任务（cron表达式）
2. 设置监控关键词
3. 配置告警通知渠道

**配置示例**：
```json
{
  "monitorType": "group",
  "timeRange": "5m",
  "keywords": ["投诉", "骗子", "差评"],
  "excludeKeywords": ["好的", "谢谢"]
}
```

### 3. 其他流程

其他流程的使用方式类似，请参考各流程的配置说明。

---

## ⚙️ 自定义流程

### 修改默认流程

1. 从本目录复制流程JSON文件
2. 修改节点配置
3. 通过API或流程编辑器更新

```javascript
// 更新流程定义
PUT /api/flow-engine/definitions/{flowId}
{
  "name": "自定义流程名称",
  "nodes": [...],
  "edges": [...]
}
```

### 创建新流程

1. 使用流程编辑器（开发中）
2. 或直接创建JSON文件
3. 导入到数据库

---

## 🔧 流程配置说明

### 节点配置

每个节点都支持自定义配置，例如：

**意图识别节点**：
```json
{
  "type": "intent",
  "config": {
    "modelId": "doubao-pro-4k",
    "supportedIntents": ["咨询", "投诉", "售后"],
    "confidenceThreshold": 0.7
  }
}
```

**AI回复节点**：
```json
{
  "type": "ai_reply",
  "config": {
    "modelId": "doubao-pro-4k",
    "useTemplate": true,
    "templateId": "template_vip",
    "temperature": 0.7
  }
}
```

### 决策节点

决策节点支持复杂的条件判断：

```json
{
  "type": "decision",
  "config": {
    "conditions": [
      {
        "expression": "context.intent === '投诉' || context.emotion === 'negative'",
        "label": "转人工",
        "targetNodeId": "node_staff_intervention"
      },
      {
        "expression": "context.needReply === true",
        "label": "AI回复",
        "targetNodeId": "node_ai_reply"
      }
    ]
  }
}
```

---

## 📊 监控与日志

### 查看流程执行日志

```javascript
// 获取流程实例列表
GET /api/flow-engine/instances?flowDefinitionId={flowId}

// 查看执行日志
GET /api/flow-engine/instances/{instanceId}/logs
```

### 实时监控

```javascript
// WebSocket连接
WS ws://localhost:5001/ws

// 订阅流程事件
{
  "type": "subscribe",
  "topics": ["flow_execution", "alert"]
}
```

---

## 🆘 故障排查

### 流程未触发

**可能原因**：
- Webhook配置错误
- 流程未激活
- 触发条件不满足

**解决方法**：
1. 检查Webhook URL配置
2. 确认流程状态为active
3. 查看流程执行日志

### AI回复失败

**可能原因**：
- AI模型未配置
- API Key无效
- Token超限

**解决方法**：
1. 检查AI模型配置
2. 验证API Key
3. 检查Token使用量

### 消息中心集成失败

**可能原因**：
- 消息中心服务未启动
- API地址配置错误
- 网络连接问题

**解决方法**：
1. 确认消息中心服务运行状态
2. 检查INFO_CENTER_URL环境变量
3. 测试网络连通性

---

## 📚 相关文档

- [流程引擎完整规划](../docs/flow-engine-complete-plan.md)
- [消息中心API文档](../docs/API_REFERENCE.md)
- [AI服务文档](../docs/ai-service.md)
- [系统架构文档](../docs/architecture.md)

---

## 📝 更新日志

### v1.0.0 (2024-01-15)

- ✅ 创建6个默认流程定义
- ✅ 实现流程导入脚本
- ✅ 编写使用文档
- ✅ 完成测试验证

---

## 🤝 贡献

如果您有新的流程需求或改进建议，请：
1. 创建Issue描述需求
2. 提交PR（包含流程JSON和测试用例）

---

## 📞 联系方式

如有问题，请联系开发团队。

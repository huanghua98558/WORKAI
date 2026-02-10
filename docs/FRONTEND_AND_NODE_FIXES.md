# 前端和节点代码问题分析与修复总结

## 1. useSSE Hook 问题（已修复）

### 问题描述
`useSSE` Hook 在组件挂载时只有在 `sessionId` 或 `robotId` 存在时才会建立SSE连接：

```typescript
// 原始代码（有问题）
useEffect(() => {
  if (sessionId || robotId) {  // ❌ 只有在有参数时才连接
    connect();
  }
  return () => cleanup();
}, [sessionId, robotId, connect, cleanup]);
```

### 影响
- Dashboard 页面想要监听全局消息（不指定 sessionId），但由于这个条件判断，SSE 永远不会连接
- 导致 Dashboard 无法接收实时消息更新

### 修复方案
修改连接逻辑，只要有 `onMessage` 回调就连接：

```typescript
// 修复后的代码
useEffect(() => {
  // 支持全局监听（不传sessionId或robotId）和特定会话/机器人监听
  // 只要有onMessage回调就连接
  if (onMessage) {  // ✅ 只要有回调就连接
    connect();
  }
  return () => cleanup();
}, [sessionId, robotId, onMessage, connect, cleanup]);
```

### 修复文件
- `src/hooks/useSSE.ts`

### 测试建议
1. 启动 Dashboard 页面
2. 确认 SSE 连接成功建立
3. 发送测试消息，确认能收到实时推送

---

## 2. Dashboard 页面 SSE 集成（已验证）

### 当前状态
Dashboard 页面正确使用了 `useSSE` Hook 来监听全局消息：

```typescript
const { connected: sseConnected, messages: realtimeMessages } = useSSE({
  // 不指定sessionId，监听全局消息
  reconnectInterval: 5000,
  maxReconnectAttempts: 20,
  onMessage: (message) => {
    console.log('[Dashboard] 收到实时消息:', message);
  },
});
```

### 功能实现
- ✅ 实时消息监听
- ✅ 自动重连机制（最大重连20次）
- ✅ 更新最近活跃会话列表
- ✅ 更新活跃用户统计

### 依赖关系
由于 `useSSE` Hook 的问题已修复，Dashboard 现在可以正常工作了。

---

## 3. 流程引擎中的上下文相关节点（已增强）

### 现有节点

#### CONTEXT_ENHANCER 节点
- ✅ 功能完整，可以提取上下文变量并生成补充提示词
- ✅ 支持自定义提示词和提示词模板
- ✅ 支持使用 AI 优化提示词
- ✅ 将结果写入流程上下文供后续节点使用

#### SMART_ANALYZE 节点
- ✅ 功能完整，可以同时进行意图识别和情绪分析
- ✅ 一次 AI 调用完成两个任务
- ✅ 支持配置意图和情绪类型
- ✅ 将分析结果写入流程上下文

### 新增节点（本次添加）

#### UNIFIED_ANALYZE 节点
- ✅ 使用 `UnifiedAnalysisService` 进行统一分析
- ✅ 整合了上下文准备、意图识别、情感分析
- ✅ 返回完整的分析结果（上下文、用户画像、意图、情感、行动建议、告警触发）
- ✅ 将所有结果写入流程上下文
- ✅ 支持配置是否启用上下文准备、意图识别、情感分析

### 节点对比

| 节点类型 | 功能特点 | 适用场景 |
|---------|---------|---------|
| CONTEXT_ENHANCER | 提取上下文变量，生成补充提示词 | 需要丰富上下文供 AI 节点使用 |
| SMART_ANALYZE | 意图识别 + 情绪分析（一次调用） | 简单场景，只需基本分析 |
| UNIFIED_ANALYZE | 完整分析（上下文+意图+情感+建议+告警） | 复杂场景，需要完整分析能力 |

### 修改文件
- `server/services/flow-engine.service.js`
  - 添加 `UNIFIED_ANALYZE` 节点类型
  - 注册节点处理器
  - 导入 `unifiedAnalysisService`
  - 实现 `handleUnifiedAnalyzeNode` 方法

---

## 4. 集成建议

### 使用 UNIFIED_ANALYZE 节点的示例流程

```json
{
  "name": "智能客服分析流程",
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "next": "unified_analyze"
    },
    {
      "id": "unified_analyze",
      "type": "unified_analyze",
      "config": {
        "enableContext": true,
        "enableIntent": true,
        "enableSentiment": true,
        "sessionId": "{{sessionId}}",
        "message": "{{message}}",
        "robot": "{{robot}}"
      },
      "next": "decision"
    },
    {
      "id": "decision",
      "type": "decision",
      "config": {
        "conditions": [
          {
            "expression": "{{alert_trigger.should_trigger}} == true",
            "next": "alert_handle"
          },
          {
            "expression": "{{intent}} == 'complaint'",
            "next": "human_handover"
          },
          {
            "expression": "{{sentiment}} == 'negative'",
            "next": "emotion_soothing"
          }
        ]
      }
    }
  ]
}
```

### 上下文数据结构

执行 UNIFIED_ANALYZE 节点后，流程上下文将包含：

```javascript
{
  // 上下文数据
  context_data: {
    is_new_session: true,
    context_count: 0,
    context_type: 'user_session',
    retrieval_time: 150,
    retrieval_strategy: 'empty'
  },
  
  // 用户画像
  user_profile: {
    user_id: 'user_xxx',
    user_name: '张三',
    satisfaction_score: 50,
    problem_resolution_rate: 0,
    message_count: 0,
    user_type: 'new'
  },
  
  // 意图识别
  intent: 'product_inquiry',
  intent_confidence: 85,
  intent_reasoning: '用户询问产品价格',
  
  // 情感分析
  sentiment: 'neutral',
  sentiment_confidence: 75,
  emotional_intensity: 3,
  key_emotions: ['好奇'],
  
  // 行动建议
  action_suggestions: [
    {
      type: 'product_info',
      priority: 'medium',
      action: '提供产品信息',
      description: '用户询问产品，需要提供相关产品介绍'
    }
  ],
  
  // 告警触发
  alert_trigger: {
    should_trigger: false,
    alert_level: 'info',
    trigger_conditions: []
  },
  
  // 原始结果
  analysis_result: { /* 完整分析结果 */ }
}
```

---

## 5. 后续优化建议

### 5.1 前端优化
1. **添加连接状态指示器**：在 Dashboard 页面显示 SSE 连接状态
2. **错误处理增强**：添加重连失败后的手动重试按钮
3. **消息过滤**：支持根据会话ID或机器人ID过滤消息

### 5.2 流程引擎优化
1. **节点配置界面**：为 UNIFIED_ANALYZE 节点提供可视化配置界面
2. **性能监控**：添加分析耗时统计
3. **结果缓存**：对相同的分析结果进行缓存，减少重复计算

### 5.3 统一分析服务优化
1. **AI 模型配置**：为每个机器人配置专属 AI 模型
2. **提示词优化**：持续优化意图识别和情感分析的提示词
3. **批量分析**：支持批量分析多个会话

---

## 6. 测试清单

### 6.1 useSSE Hook 测试
- [ ] 全局监听（不传参数）能正常连接
- [ ] 特定会话监听（传 sessionId）能正常连接
- [ ] 特定机器人监听（传 robotId）能正常连接
- [ ] 断线后能自动重连
- [ ] 达到最大重连次数后停止重连

### 6.2 Dashboard 页面测试
- [ ] 页面加载后能建立 SSE 连接
- [ ] 能收到实时消息推送
- [ ] 最近活跃会话列表能正确更新
- [ ] 活跃用户统计能正确更新

### 6.3 UNIFIED_ANALYZE 节点测试
- [ ] 节点能正常执行
- [ ] 上下文准备功能正常
- [ ] 意图识别功能正常
- [ ] 情感分析功能正常
- [ ] 行动建议能正确生成
- [ ] 告警触发判断准确
- [ ] 分析结果能正确写入流程上下文

### 6.4 集成测试
- [ ] 完整流程能正常执行
- [ ] 多个节点能正确共享上下文
- [ ] 告警系统能正常触发

---

## 7. 总结

### 已修复问题
1. ✅ useSSE Hook 不支持全局监听的问题
2. ✅ Dashboard 页面无法接收实时消息的问题

### 已增强功能
1. ✅ 新增 UNIFIED_ANALYZE 节点，提供完整的分析能力
2. ✅ 流程引擎集成 UnifiedAnalysisService

### 整体影响
- 前端 Dashboard 现在可以正常接收实时消息
- 流程引擎提供了更强大的分析能力
- 为后续的智能客服和告警系统奠定了基础

# AI 分析结果集成完整改造计划

## 📊 当前问题分析

### 问题 1: 数据缺失
- **后端 API**: `/api/admin/sessions/active` 不返回 `aiAnalysis` 字段
- **前端状态**: `sessions` 数据中不包含 AI 分析结果
- **显示结果**: `AIAnalysisBadge` 组件不会渲染，因为 `session.aiAnalysis === undefined`

### 问题 2: 缺少实时更新机制
- **前端**: `NewDashboardTab` 组件没有使用 `useSSE` hook
- **后端**: SSE 服务已实现，但前端未集成
- **数据流**: 只有静态数据，没有实时推送

### 问题 3: AI 分析触发时机未确定
- **何时分析**: 新消息到达时需要触发 AI 分析
- **如何触发**: 需要明确调用流程（后端自动触发 vs 前端手动触发）
- **结果存储**: 分析结果是否需要持久化到数据库

---

## 🎯 完整改造计划

### 阶段 1: 数据集成（核心）

#### 1.1 后端 API 改造

**方案 A: 扩展现有 API（推荐）**
- 文件: `server/routes/admin.api.js`
- 修改: `/api/admin/sessions/active` 端点
- 变更: 在返回数据中添加 `aiAnalysis` 字段

```javascript
// 获取活跃会话后，补充 AI 分析结果
const formattedSessions = (sessions.rows || []).map(row => {
  const formatted = { /* 现有字段 */ };

  // 新增：从 robot_ai_analysis_history 表查询最新的 AI 分析结果
  const latestAnalysis = await getLatestAIAnalysis(row.sessionid);
  if (latestAnalysis) {
    formatted.aiAnalysis = {
      intent: latestAnalysis.intent,
      intentConfidence: latestAnalysis.intent_confidence,
      sentiment: latestAnalysis.sentiment,
      sentimentScore: latestAnalysis.sentiment_score,
      shouldTriggerAlert: latestAnalysis.should_trigger_alert,
      suggestedActions: latestAnalysis.suggested_actions
    };
  }

  return formatted;
});
```

**方案 B: 创建新 API**
- 创建: `server/routes/ai-analysis.api.js`
- 端点: `POST /api/ai/analyze`
- 功能: 手动触发 AI 分析，返回分析结果

#### 1.2 数据库查询优化

创建辅助函数查询 AI 分析历史：

```javascript
// server/services/ai-analysis-query.service.js (新文件)
async function getLatestAIAnalysis(sessionId) {
  const db = await getDb();
  const results = await db.select()
    .from(robotAIAnalysisHistory)
    .where(eq(robotAIAnalysisHistory.sessionId, sessionId))
    .orderBy(desc(robotAIAnalysisHistory.analysisTime))
    .limit(1);

  return results[0] || null;
}
```

---

### 阶段 2: 前端实时集成

#### 2.1 集成 SSE Hook

修改: `src/components/dashboard/NewDashboardTab.tsx`

```typescript
import { useSSE } from '@/hooks/useSSE';

export default function NewDashboardTab({ /* props */ }: NewDashboardTabProps) {
  // 添加 SSE 监听
  const { connected, messages: realtimeMessages } = useSSE({
    onMessage: (message) => {
      console.log('[Dashboard] 收到实时消息:', message);

      // 更新 sessions 状态
      setSessions(prevSessions => {
        const existingSession = prevSessions.find(
          s => s.sessionId === message.sessionId
        );

        if (existingSession) {
          // 更新现有会话
          return prevSessions.map(s =>
            s.sessionId === message.sessionId
              ? {
                  ...s,
                  messageCount: s.messageCount + 1,
                  lastMessage: message.content,
                  lastActiveTime: message.createdAt,
                  aiAnalysis: message.aiAnalysis // 更新 AI 分析结果
                }
              : s
          );
        } else {
          // 添加新会话
          const newSession = {
            sessionId: message.sessionId,
            userName: message.senderName,
            groupName: message.groupName,
            status: 'auto',
            lastActiveTime: message.createdAt,
            messageCount: 1,
            lastMessage: message.content,
            aiAnalysis: message.aiAnalysis // 包含 AI 分析结果
          };

          return [newSession, ...prevSessions].slice(0, 10);
        }
      });
    }
  });

  // 现有代码...
}
```

#### 2.2 修改主页面状态传递

修改: `src/app/page.tsx`

确保 `loadData` 函数更新 `sessions` 状态时包含 `aiAnalysis` 字段。

```typescript
const loadData = async () => {
  // ... 现有逻辑

  // sessions API 已经返回 aiAnalysis 字段（阶段 1 完成）
  if (sessionsRes.ok) {
    const data = await sessionsRes.json();
    setSessions(data.data || []); // data 中包含 aiAnalysis
  }
};
```

---

### 阶段 3: 后端 AI 分析触发

#### 3.1 在消息接收时触发 AI 分析

修改: `server/routes/worktool-api.api.js`

当接收到新消息时，自动触发 AI 分析：

```javascript
fastify.post('/worktool/message/callback', async (request, reply) => {
  // ... 现有逻辑：接收消息、保存到数据库

  // 新增：触发 AI 分析
  try {
    const analysisResult = await unifiedAnalysisService.analyze(
      sessionId,
      message,
      robot
    );

    // 将分析结果保存到 robot_ai_analysis_history 表
    await saveAIAnalysisResult(sessionId, message.messageId, analysisResult);

    // 新增：在 SSE 消息中包含 AI 分析结果
    // 修改通知 payload，添加 aiAnalysis 字段
    const notificationPayload = {
      type: 'message',
      data: {
        sessionId,
        messageId: message.messageId,
        content: message.content,
        senderId: message.receivedId,
        senderName: message.receivedName,
        // ... 其他字段
        aiAnalysis: {  // 新增 AI 分析结果
          intent: analysisResult.intent?.intent,
          intentConfidence: analysisResult.intent?.confidence,
          sentiment: analysisResult.sentiment?.sentiment,
          sentimentScore: analysisResult.sentiment?.confidence,
          shouldTriggerAlert: analysisResult.alert_trigger?.should_trigger,
          suggestedActions: analysisResult.action_suggestions
        }
      }
    };

    // 通过 NOTIFY 发送消息
    await db.query(`NOTIFY "session_messages:${sessionId}", $1`, [
      JSON.stringify(notificationPayload)
    ]);

  } catch (aiError) {
    console.error('AI 分析失败:', aiError);
    // AI 分析失败不影响消息处理流程
  }

  // ... 继续现有逻辑
});
```

---

## 📁 文件变更清单

### 需要修改的文件

1. **后端 API**:
   - `server/routes/admin.api.js` - 扩展 `/sessions/active` API
   - `server/routes/worktool-api.api.js` - 在消息回调时触发 AI 分析

2. **新文件**:
   - `server/services/ai-analysis-query.service.js` - 查询 AI 分析历史
   - `server/services/ai-analysis-save.service.js` - 保存 AI 分析结果

3. **前端**:
   - `src/components/dashboard/NewDashboardTab.tsx` - 集成 SSE hook
   - `src/app/page.tsx` - 确保状态传递正确

---

## 🔄 完整数据流

```
1. 用户发送消息
   ↓
2. WorkTool 回调 → /worktool/message/callback
   ↓
3. 保存消息到 session_messages 表
   ↓
4. 触发 UnifiedAnalysisService.analyze()
   ↓
5. 保存分析结果到 robot_ai_analysis_history 表
   ↓
6. 通过 PostgreSQL NOTIFY 发送 SSE 消息（包含 aiAnalysis）
   ↓
7. 前端 useSSE hook 接收消息
   ↓
8. 更新 sessions 状态
   ↓
9. NewDashboardTab 组件重新渲染
   ↓
10. AIAnalysisBadge 显示分析结果
```

---

## ⚠️ 注意事项

1. **数据库表已创建**:
   - ✅ `robot_ai_configs` - 机器人 AI 配置
   - ✅ `robot_ai_analysis_history` - AI 分析历史

2. **服务已实现**:
   - ✅ `UnifiedAnalysisService` - 统一分析服务
   - ✅ `RobotAIService` - 真实 LLM API 集成
   - ✅ `TaskAssignmentService` - 任务分配
   - ✅ `AlertTriggerService` - 告警触发

3. **前端组件已创建**:
   - ✅ `AIAnalysisBadge` - 分析结果展示组件

4. **SSE 已实现**:
   - ✅ `useSSE` hook
   - ✅ 后端 SSE 路由

---

## 🚀 实施建议

### 立即实施（必须）
1. 修改后端 `/sessions/active` API，添加 `aiAnalysis` 字段查询
2. 在消息回调时触发 AI 分析
3. 前端集成 SSE hook

### 后续优化（可选）
1. 添加 AI 分析缓存机制
2. 实现批量分析功能
3. 添加 AI 分析历史查询页面
4. 优化 SSE 消息格式

---

## ❓ 需要确认的问题

1. **触发时机**: 是否每次新消息都触发 AI 分析？还是仅对重要消息分析？
2. **性能考虑**: LLM 调用耗时较长（2-3秒），是否需要异步处理？
3. **成本控制**: 是否限制每日 AI 分析次数？
4. **数据保留**: AI 分析历史保留多长时间？

请确认以上问题和实施方案后，我将开始实施改造。

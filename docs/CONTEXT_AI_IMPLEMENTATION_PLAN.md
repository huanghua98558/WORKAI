# 上下文与AI分析模块完善实施计划

## 📊 需求分析

### 核心需求
基于`server/docs/机器人通讯系统完整分析报告.md`，需要实现：

1. **上下文管理模块**
   - 用户会话和社群会话管理
   - 动态上下文检索（根据消息类型调整上下文数量）
   - 用户画像、工作人员状态、售后任务状态检索

2. **AI分析模块完善**
   - 统一AI系统（意图+情感+回复+告警+介入判断）
   - 完整的AI Prompt设计
   - 完整的AI返回数据结构

---

## 🎯 总体架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│              消息处理完整流程（改造后）                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] WorkTool回调接收                                             │
│      │                                                         │
│      ▼                                                         │
│  [2] 保存消息到数据库                                            │
│      │                                                         │
│      ▼                                                         │
│  [3] 上下文准备服务 【新增】                                    │
│      ├─▶ 判断会话类型（新会话/老会话）                            │
│      ├─▶ 检索用户会话历史                                        │
│      ├─▶ 检索社群会话历史                                        │
│      ├─▶ 获取用户画像                                            │
│      ├─▶ 获取工作人员状态                                        │
│      ├─▶ 获取售后任务状态                                        │
│      ├─▶ 获取群聊信息                                            │
│      └─▶ 动态调整上下文数量                                      │
│                                                                 │
│      ▼                                                         │
│  [4] 机器人AI分析服务 【完善】                                    │
│      ├─▶ 接收完整上下文数据                                      │
│      ├─▶ 构建统一AI Prompt                                       │
│      ├─▶ 调用AI服务（意图+情感+回复+告警+介入）                   │
│      ├─▶ 解析AI响应                                              │
│      └─▶ 返回完整分析结果                                        │
│                                                                 │
│      ▼                                                         │
│  [5] 决策处理                                                    │
│      ├─▶ needReply判断 → 发送回复                               │
│      ├─▶ needAlert判断 → 触发告警                               │
│      └─▶ needIntervention判断 → 人工介入                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📅 实施计划（分5个阶段，预计8天）

### Phase 1：上下文准备服务（2天）

#### 任务清单

**Day 1：创建上下文准备服务框架**
- [ ] 创建 `server/services/context-preparation.service.js`
- [ ] 实现会话类型判断逻辑
- [ ] 实现用户会话检索
- [ ] 实现社群会话检索

**Day 2：完善上下文数据准备**
- [ ] 实现用户画像获取
- [ ] 实现工作人员状态获取
- [ ] 实现售后任务状态获取
- [ ] 实现群聊信息获取
- [ ] 实现动态上下文数量调整
- [ ] 实现新会话优化（跨群历史检索）

#### 代码结构

```javascript
// server/services/context-preparation.service.js

class ContextPreparationService {
  /**
   * 准备上下文数据（主入口）
   * @param {string} sessionId - 会话ID
   * @param {Object} message - 消息对象
   * @param {Object} robot - 机器人对象
   * @returns {Promise<Object>} 完整上下文数据
   */
  async prepareContext(sessionId, message, robot) {
    // 1. 判断会话类型
    const sessionType = await this.getSessionType(sessionId);

    // 2. 检索用户会话历史
    const userSessionHistory = await this.getUserSessionHistory(sessionId);

    // 3. 检索社群会话历史
    const groupSessionHistory = await this.getGroupSessionHistory(sessionId);

    // 4. 获取用户画像
    const userProfile = await this.getUserProfile(sessionId);

    // 5. 获取工作人员状态
    const staffStatus = await this.getStaffStatus(sessionId);

    // 6. 获取售后任务状态
    const taskStatus = await this.getTaskStatus(sessionId);

    // 7. 获取群聊信息
    const groupInfo = await this.getGroupInfo(sessionId);

    // 8. 动态调整上下文数量
    const historyMessages = this.adjustContextCount(
      userSessionHistory,
      groupSessionHistory,
      message.type
    );

    return {
      session_type: sessionType,
      is_new_session: historyMessages.length === 0,
      session_id: sessionId,
      history_messages: historyMessages,
      user_profile: userProfile,
      group_profile: groupInfo,
      staff_status: staffStatus,
      task_status: taskStatus,
      metadata: {
        context_count: historyMessages.length,
        context_type: this.getContextType(sessionType)
      }
    };
  }

  // ... 其他方法实现
}
```

#### 上下文数据结构

```typescript
interface ContextData {
  session_type: 'user' | 'group';
  is_new_session: boolean;
  session_id: string;
  history_messages: HistoryMessage[];
  user_profile: UserProfile;
  group_profile: GroupProfile;
  staff_status: StaffStatus;
  task_status: TaskStatus;
  metadata: {
    context_count: number;
    context_type: string;
  };
}
```

---

### Phase 2：机器人AI服务完善（2天）

#### 任务清单

**Day 3：完善AI分析逻辑**
- [ ] 修改 `server/services/robot-ai.service.js`
- [ ] 集成上下文数据到AI分析
- [ ] 实现统一AI Prompt构建
- [ ] 实现AI响应解析

**Day 4：完善返回数据结构**
- [ ] 实现完整的AI返回数据结构
- [ ] 添加告警判断逻辑
- [ ] 添加人工介入判断逻辑
- [ ] 添加用户满意度更新逻辑

#### 核心代码

```javascript
// server/services/robot-ai.service.js

class RobotAIService {
  /**
   * 机器人AI分析（主入口）
   * @param {Object} robot - 机器人对象
   * @param {Object} message - 消息对象
   * @param {Object} context - 上下文对象 【完善】
   * @returns {Promise<RobotAIAnalysisResult>}
   */
  async analyze(robot, message, context) {
    // 1. 获取机器人AI配置
    const aiConfig = await this.getRobotAIConfig(robot);

    // 2. 构建统一AI Prompt 【新增】
    const prompt = this.buildUnifiedAIPrompt(robot, message, context);

    // 3. 调用AI服务（一次调用，返回所有分析结果）【修改】
    const aiResponse = await this.callAIUnified(prompt, aiConfig);

    // 4. 解析AI响应 【完善】
    const analysisResult = this.parseUnifiedAIResponse(aiResponse);

    // 5. 构建完整返回结果 【完善】
    return {
      // 机器人信息
      robotId: robot.robotId,
      robotName: robot.name,
      sessionId: context.session_id,
      messageId: message.messageId,

      // AI分析结果
      intent: analysisResult.intent,
      sentiment: analysisResult.sentiment,
      need_reply: analysisResult.need_reply,
      reply_suggestion: analysisResult.reply_suggestion,

      // 告警判断 【新增】
      need_alert: analysisResult.need_alert,
      alert_level: analysisResult.alert_level,
      alert_type: analysisResult.alert_type,

      // 人工介入判断 【新增】
      need_intervention: analysisResult.need_intervention,
      intervention_reason: analysisResult.intervention_reason,
      ai_intervention: analysisResult.ai_intervention,
      ai_intervention_scenario: analysisResult.ai_intervention_scenario,

      // 工作人员状态分析 【新增】
      staff_status: analysisResult.staff_status,

      // 用户满意度更新 【新增】
      user_satisfaction_update: analysisResult.user_satisfaction_update,

      // 元数据
      metadata: {
        modelId: aiConfig.chatModelId,
        responseTime: Date.now() - startTime,
        tokensUsed: aiResponse.usage
      }
    };
  }

  /**
   * 构建统一AI Prompt 【新增】
   */
  buildUnifiedAIPrompt(robot, message, context) {
    let prompt = `你是机器人"${robot.name}"，负责企业微信社群的自动回复和协同分析。\n\n`;

    // 当前消息
    prompt += `【当前消息】\n`;
    prompt += `发送者：${message.senderName}（${message.senderEnterprise || '未知企业'}）\n`;
    prompt += `消息内容："${message.content}"\n`;
    prompt += `发送时间：${new Date().toLocaleString('zh-CN')}\n`;
    prompt += `群聊：${context.group_profile?.group_name || '未知'}\n\n`;

    // 会话类型
    prompt += `【会话类型】\n`;
    prompt += context.is_new_session ? '新会话' : '老会话';
    prompt += `（历史消息数：${context.history_messages?.length || 0}条）\n\n`;

    // 历史上下文
    if (context.history_messages && context.history_messages.length > 0) {
      prompt += `【历史上下文（最近${context.history_messages.length}条）】\n`;
      context.history_messages.forEach((msg, index) => {
        prompt += `${index + 1}. ${msg.sender_name}（${msg.sender_type === 'staff' ? '工作人员' : '用户'}）：${msg.content}\n`;
      });
      prompt += '\n';
    }

    // 用户画像
    prompt += `【用户画像】\n`;
    prompt += `用户满意度：${context.user_profile?.satisfaction_score || 50}分\n`;
    prompt += `用户类型：${context.user_profile?.message_count < 5 ? '新用户' : '老用户'}\n`;
    prompt += `历史记录：${context.user_profile?.message_count || 0}条\n`;
    prompt += `问题解决率：${context.user_profile?.problem_resolution_rate || 50}%\n\n`;

    // 工作人员状态
    if (context.staff_status && context.staff_status.online_staff) {
      prompt += `【工作人员状态】\n`;
      prompt += `在线工作人员：${context.staff_status.online_staff.join('、')}\n`;
      prompt += `是否正在处理：${context.staff_status.is_handling ? '是' : '否'}\n`;
      if (context.staff_status.is_handling) {
        prompt += `当前处理人：${context.staff_status.handling_staff}\n`;
      }
      prompt += '\n';
    }

    // 售后任务状态
    if (context.task_status && context.task_status.has_pending_task) {
      prompt += `【售后任务状态】\n`;
      prompt += `当前任务：${this.getTaskTypeName(context.task_status.task_type)}\n`;
      prompt += `任务状态：${this.getTaskStatusName(context.task_status.task_status)}\n\n`;
    }

    // 群聊信息
    if (context.group_profile) {
      prompt += `【群聊信息】\n`;
      prompt += `群名：${context.group_profile.group_name}\n`;
      prompt += `群成员数：${context.group_profile.member_count}\n`;
      prompt += `消息总数：${context.group_profile.message_count}\n\n`;
    }

    // 任务说明
    prompt += `【你的任务】\n`;
    prompt += `1. 分析用户意图（选择以下一个）：\n`;
    prompt += `   - after_sales_scan_qrcode（售后扫码配合）\n`;
    prompt += `   - after_sales_bind_phone（售后绑定手机号）\n`;
    prompt += `   - after_sales_realname（售后实名认证）\n`;
    prompt += `   - after_sales_selfie（售后自拍申诉）\n`;
    prompt += `   - question_answer（疑虑解答）\n`;
    prompt += `   - status_communication（状态沟通）\n`;
    prompt += `   - chat（闲聊）\n`;
    prompt += `   - other（其他）\n\n`;

    prompt += `2. 分析用户情感（选择以下一个）：\n`;
    prompt += `   - positive（积极）\n`;
    prompt += `   - neutral（中性）\n`;
    prompt += `   - negative（消极）\n\n`;

    prompt += `3. 判断是否需要回复（true/false）\n\n`;

    prompt += `4. 生成回复建议（如果需要回复）\n`;
    prompt += `   - 回复内容\n`;
    prompt += `   - 回复类型（group_at_user/private_chat/group_no_at）\n`;
    prompt += `   - 是否需要@用户\n\n`;

    prompt += `5. 判断是否需要告警（true/false）\n`;
    prompt += `   - 告警级别（P0/P1/P2）\n`;
    prompt += `   - 告警类型（user_complaint/operator_harsh/task_unfinished/staff_no_reply/user_uncooperative）\n\n`;

    prompt += `6. 判断是否需要介入人工（true/false）\n\n`;

    prompt += `7. 判断AI介入场景（如果需要AI介入）\n`;
    prompt += `   - staff_busy（人工繁忙）\n`;
    prompt += `   - night_shift（夜间人工离线）\n`;
    prompt += `   - user_negative（用户情感消极）\n`;
    prompt += `   - complex_problem（复杂问题）\n`;
    prompt += `   - operator_harsh（运营语气过硬）\n\n`;

    prompt += `8. 分析工作人员状态（发送者是工作人员）\n\n`;

    prompt += `9. 更新用户满意度（根据对话质量，0-100）\n\n`;

    // 返回格式
    prompt += `【返回格式（JSON）】\n`;
    prompt += `{\n`;
    prompt += `  "intent": "after_sales_scan_qrcode",\n`;
    prompt += `  "confidence": 0.95,\n`;
    prompt += `  "sentiment": "neutral",\n`;
    prompt += `  "need_reply": true,\n`;
    prompt += `  "reply_suggestion": {\n`;
    prompt += `    "content": "您好，请点击下方链接进行扫码操作：[链接]",\n`;
    prompt += `    "reply_type": "group_at_user",\n`;
    prompt += `    "at_user": true\n`;
    prompt += `  },\n`;
    prompt += `  "need_alert": false,\n`;
    prompt += `  "alert_level": null,\n`;
    prompt += `  "alert_type": null,\n`;
    prompt += `  "need_intervention": false,\n`;
    prompt += `  "intervention_reason": "",\n`;
    prompt += `  "ai_intervention": false,\n`;
    prompt += `  "ai_intervention_scenario": "",\n`;
    prompt += `  "staff_status": {\n`;
    prompt += `    "is_staff": false,\n`;
    prompt += `    "staff_name": null,\n`;
    prompt += `    "staff_role": null,\n`;
    prompt += `    "staff_activity": null\n`;
    prompt += `  },\n`;
    prompt += `  "user_satisfaction_update": 50\n`;
    prompt += `}`;

    return prompt;
  }

  /**
   * 调用AI服务（统一分析）【修改】
   */
  async callAIUnified(prompt, aiConfig) {
    const aiService = await AIServiceFactory.createServiceByModelId(aiConfig.chatModelId);

    return await aiService.chat({
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: message.content }
      ],
      temperature: aiConfig.temperature || 0.7,
      maxTokens: aiConfig.maxTokens || 2000
    });
  }

  /**
   * 解析统一AI响应 【完善】
   */
  parseUnifiedAIResponse(content) {
    try {
      const result = JSON.parse(content);
      return {
        intent: {
          type: result.intent,
          confidence: result.confidence
        },
        sentiment: {
          type: result.sentiment,
          score: 0.5 // 简化处理
        },
        need_reply: result.need_reply,
        reply_suggestion: result.reply_suggestion,
        need_alert: result.need_alert,
        alert_level: result.alert_level,
        alert_type: result.alert_type,
        need_intervention: result.need_intervention,
        intervention_reason: result.intervention_reason,
        ai_intervention: result.ai_intervention,
        ai_intervention_scenario: result.ai_intervention_scenario,
        staff_status: result.staff_status,
        user_satisfaction_update: result.user_satisfaction_update
      };
    } catch (error) {
      // 返回默认值
      return {
        intent: { type: 'chat', confidence: 0.5 },
        sentiment: { type: 'neutral', score: 0.5 },
        need_reply: true,
        reply_suggestion: null,
        need_alert: false,
        alert_level: null,
        alert_type: null,
        need_intervention: false,
        intervention_reason: '',
        ai_intervention: false,
        ai_intervention_scenario: '',
        staff_status: null,
        user_satisfaction_update: 50
      };
    }
  }
}
```

---

### Phase 3：消息处理服务集成（1天）

#### 任务清单

- [ ] 修改 `server/services/message-processing.service.js`
- [ ] 集成上下文准备服务
- [ ] 传递完整上下文到AI分析
- [ ] 处理AI返回的完整结果
- [ ] 实现告警触发逻辑
- [ ] 实现人工介入逻辑
- [ ] 实现用户满意度更新

#### 核心代码

```javascript
// server/services/message-processing.service.js

const contextPreparationService = require('./context-preparation.service');

class MessageProcessingService {
  async processMessage(context, message, robot) {
    console.log('[MessageProcessing] === 处理消息 ===');

    try {
      // === 第1步：识别工作人员 ===
      const staffInfo = await staffIdentifierService.identifyStaff(context, message, robot);

      if (staffInfo.isStaff) {
        return await this.handleStaffMessage(context, message, staffInfo, robot);
      }

      // === 第2步：准备上下文数据 【新增】
      console.log('[MessageProcessing] 准备上下文数据...');
      const contextData = await contextPreparationService.prepareContext(
        context.sessionId,
        message,
        robot
      );

      console.log('[MessageProcessing] 上下文准备完成:', {
        sessionType: contextData.session_type,
        isNewSession: contextData.is_new_session,
        contextCount: contextData.history_messages?.length || 0,
        userSatisfaction: contextData.user_profile?.satisfaction_score
      });

      // === 第3步：AI分析（使用完整上下文）【修改】
      console.log('[MessageProcessing] 开始AI分析（包含完整上下文）...');
      const aiAnalysis = await robotAIService.analyze(robot, message, contextData);

      console.log('[MessageProcessing] AI分析完成:', {
        intent: aiAnalysis.intent.type,
        sentiment: aiAnalysis.sentiment.type,
        needReply: aiAnalysis.need_reply,
        needAlert: aiAnalysis.need_alert,
        needIntervention: aiAnalysis.need_intervention
      });

      // === 第4步：处理告警 【新增】
      if (aiAnalysis.need_alert) {
        await this.handleAlert(context, message, aiAnalysis);
      }

      // === 第5步：处理人工介入 【新增】
      if (aiAnalysis.need_intervention) {
        await this.handleIntervention(context, message, aiAnalysis);
      }

      // === 第6步：处理AI回复 【修改】
      if (aiAnalysis.need_reply && aiAnalysis.reply_suggestion) {
        await this.sendAIReply(robot, message, aiAnalysis.reply_suggestion);
      }

      // === 第7步：更新用户满意度 【新增】
      if (aiAnalysis.user_satisfaction_update !== null) {
        await this.updateUserSatisfaction(context, aiAnalysis.user_satisfaction_update);
      }

      // === 第8步：返回处理结果 【修改】
      return {
        success: true,
        type: 'user_message',
        contextData,
        aiAnalysis,
        actions: {
          replied: aiAnalysis.need_reply,
          alerted: aiAnalysis.need_alert,
          intervened: aiAnalysis.need_intervention,
          satisfactionUpdated: aiAnalysis.user_satisfaction_update !== null
        }
      };

    } catch (error) {
      console.error('[MessageProcessing] ❌ 处理消息失败:', error);
      throw error;
    }
  }

  /**
   * 处理告警 【新增】
   */
  async handleAlert(context, message, aiAnalysis) {
    console.log('[MessageProcessing] 触发告警:', {
      alertLevel: aiAnalysis.alert_level,
      alertType: aiAnalysis.alert_type
    });

    const alertService = require('./alert.service');

    await alertService.createAlert({
      sessionId: context.sessionId,
      userId: message.senderId,
      userName: message.senderName,
      groupChatId: context.groupId,
      messageContent: message.content,
      alertLevel: aiAnalysis.alert_level,
      alertType: aiAnalysis.alert_type,
      robotId: context.robotId,
      confidence: aiAnalysis.intent.confidence
    });
  }

  /**
   * 处理人工介入 【新增】
   */
  async handleIntervention(context, message, aiAnalysis) {
    console.log('[MessageProcessing] 触发人工介入:', {
      scenario: aiAnalysis.ai_intervention_scenario,
      reason: aiAnalysis.intervention_reason
    });

    const interventionService = require('./intervention.service');

    await interventionService.createIntervention({
      sessionId: context.sessionId,
      userId: message.senderId,
      userName: message.senderName,
      scenario: aiAnalysis.ai_intervention_scenario,
      reason: aiAnalysis.intervention_reason,
      robotId: context.robotId
    });
  }

  /**
   * 更新用户满意度 【新增】
   */
  async updateUserSatisfaction(context, satisfactionScore) {
    console.log('[MessageProcessing] 更新用户满意度:', satisfactionScore);

    const db = await getDb();
    await db.update(userSessions)
      .set({ satisfaction_score: satisfactionScore })
      .where(eq(userSessions.id, context.sessionId));
  }
}
```

---

### Phase 4：数据库迁移与配置（1天）

#### 任务清单

- [ ] 创建用户会话表（user_sessions）【如不存在】
- [ ] 创建社群会话表（group_sessions）【如不存在】
- [ ] 更新robots表的aiModelConfig字段示例
- [ ] 配置默认AI模型
- [ ] 配置告警规则

#### 数据库迁移SQL

```sql
-- 022_create_user_and_group_sessions.sql

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  user_name VARCHAR(200) NOT NULL,
  enterprise_name VARCHAR(200),
  satisfaction_score INTEGER DEFAULT 50 CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
  problem_resolution_rate INTEGER DEFAULT 50 CHECK (problem_resolution_rate >= 0 AND problem_resolution_rate <= 100),
  message_count INTEGER DEFAULT 0,
  last_message_time TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_sessions_user_id_key UNIQUE(user_id)
);

-- 社群会话表
CREATE TABLE IF NOT EXISTS group_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id VARCHAR(100) NOT NULL,
  group_name VARCHAR(200) NOT NULL,
  member_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  last_message_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT group_sessions_group_id_key UNIQUE(group_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS user_sessions_satisfaction_score_idx ON user_sessions(satisfaction_score);
CREATE INDEX IF NOT EXISTS user_sessions_last_message_time_idx ON user_sessions(last_message_time);
CREATE INDEX IF NOT EXISTS group_sessions_message_count_idx ON group_sessions(message_count);
CREATE INDEX IF NOT EXISTS group_sessions_last_message_time_idx ON group_sessions(last_message_time);
```

---

### Phase 5：测试与优化（2天）

#### 任务清单

**Day 7：功能测试**
- [ ] 测试新会话场景
- [ ] 测试老会话场景
- [ ] 测试上下文动态调整
- [ ] 测试AI分析结果
- [ ] 测试告警触发
- [ ] 测试人工介入
- [ ] 测试用户满意度更新

**Day 8：性能优化与文档**
- [ ] 上下文检索性能优化
- [ ] AI Prompt优化
- [ ] 缓存优化（Redis）
- [ ] 编写使用文档
- [ ] 编写API文档

---

## 📊 实施计划时间表

| 阶段 | 任务 | 预计时间 | 负责人 | 依赖 |
|-----|------|---------|-------|------|
| Phase 1 | 上下文准备服务 | 2天 | 开发 | 无 |
| Phase 2 | 机器人AI服务完善 | 2天 | 开发 | Phase 1 |
| Phase 3 | 消息处理服务集成 | 1天 | 开发 | Phase 1, 2 |
| Phase 4 | 数据库迁移与配置 | 1天 | 开发 | 无 |
| Phase 5 | 测试与优化 | 2天 | 测试 | Phase 1-4 |

**总计：8天**

---

## 🎯 关键里程碑

- **Day 2**：上下文准备服务完成，可以检索完整上下文
- **Day 4**：机器人AI服务完成，支持统一AI分析
- **Day 5**：消息处理流程集成完成，可以端到端测试
- **Day 7**：功能测试完成，所有场景验证通过
- **Day 8**：性能优化完成，系统可以上线

---

## 📝 交付物清单

### 代码文件
1. `server/services/context-preparation.service.js` - 上下文准备服务
2. `server/services/robot-ai.service.js` - 机器人AI服务（完善）
3. `server/services/message-processing.service.js` - 消息处理服务（集成）

### 数据库文件
4. `server/database/migrations/022_create_user_and_group_sessions.sql` - 会话表创建

### 文档
5. `docs/CONTEXT_AI_IMPLEMENTATION_GUIDE.md` - 实施指南
6. `docs/AI_PROMPT_REFERENCE.md` - AI Prompt参考
7. `docs/CONTEXT_RETRIEVAL_GUIDE.md` - 上下文检索指南

---

## ⚠️ 风险与注意事项

### 技术风险
1. **AI响应解析失败**：需要容错处理，返回默认值
2. **上下文检索性能**：大量历史消息可能导致性能问题，需要分页和缓存
3. **AI成本控制**：统一AI调用可能增加成本，需要监控和控制

### 注意事项
1. **向后兼容**：不要破坏现有功能，逐步迁移
2. **数据一致性**：用户会话和社群会话需要保持一致
3. **日志规范**：遵循现有的日志格式和规范
4. **错误处理**：所有服务都需要完善的错误处理

---

## 🚀 后续优化方向

1. **上下文缓存**：使用Redis缓存上下文数据
2. **AI模型选择**：根据不同场景选择不同的AI模型
3. **Prompt模板管理**：支持Prompt版本管理和A/B测试
4. **性能监控**：实时监控AI调用性能和成本
5. **效果分析**：统计分析AI分析效果，持续优化

---

**文档版本**: v1.0
**创建日期**: 2024-01-01
**预计完成时间**: 8天
**优先级**: 高

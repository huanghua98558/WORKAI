# 上下文数据结构修正说明

## 📋 问题分析

原有的 `ContextData` 数据结构与现有 WorkTool AI 中枢系统不一致，需要进行修正以保持系统架构的一致性。

---

## 🔍 现有系统的数据结构

### 1. WorkTool 回调消息结构（消息接收）

根据 `server/docs/机器人通讯系统完整分析报告.md`，WorkTool 平台推送的消息格式为：

```typescript
interface WorkToolMessageCallback {
  // 消息内容
  spoken: string;           // 问题文本
  rawSpoken: string;        // 原始问题文本

  // 发送者信息
  receivedName: string;     // 提问者名称
  groupName: string;        // QA所在群名
  groupRemark: string;      // QA所在群备注名
  roomType: number;         // 房间类型（1=外部群 2=外部联系人 3=内部群 4=内部联系人）

  // 消息属性
  atMe: boolean;            // 是否@机器人
  textType: number;         // 消息类型（0=未知 1=文本 2=图片 3=语音等）

  // 附件
  fileBase64?: string;      // 图片base64（可选）
}
```

### 2. 现有的上下文数据结构（从 AI 分析模块文档）

根据 `docs/AI_ANALYSIS_MODULE_DESIGN.md`，现有的上下文数据结构为：

```typescript
interface ContextData {
  is_new_session: boolean;           // 是否为新会话
  history_messages: HistoryMessage[]; // 历史消息列表
  user_profile: UserProfile;         // 用户画像
  staff_status: StaffStatus;         // 工作人员状态
  task_status: TaskStatus;           // 售后任务状态
  group_info: GroupInfo;             // 群聊信息
}
```

---

## ✅ 修正后的上下文数据结构

### 完整的 ContextData 接口定义

```typescript
/**
 * 上下文数据接口
 * 用于统一AI分析的完整上下文信息
 */
interface ContextData {
  /**
   * 会话ID
   * 格式：user_session_{timestamp}_{user_id} 或 group_session_{timestamp}_{group_id}
   */
  session_id: string;

  /**
   * 是否为新会话
   * - 新会话：history_messages 为空数组
   * - 老会话：history_messages 包含历史消息
   */
  is_new_session: boolean;

  /**
   * 历史消息列表
   * 数量根据消息类型动态调整：
   * - 售后类：30条
   * - 疑虑解答类：20条
   * - 情绪不满类：15条
   * - 状态沟通/闲聊：10条
   * - 新会话：0条
   */
  history_messages: HistoryMessage[];

  /**
   * 用户画像
   */
  user_profile: UserProfile;

  /**
   * 工作人员状态
   */
  staff_status: StaffStatus;

  /**
   * 售后任务状态
   */
  task_status: TaskStatus;

  /**
   * 群聊信息
   */
  group_info: GroupInfo;

  /**
   * 元数据
   */
  metadata: {
    context_count: number;        // 上下文消息数量
    context_type: string;         // 上下文类型
    retrieval_time: number;       // 检索时间（毫秒）
    retrieval_strategy: string;   // 检索策略
  };
}
```

---

### 子接口定义

#### 1. HistoryMessage - 历史消息

```typescript
interface HistoryMessage {
  /**
   * 消息ID
   */
  message_id: string;

  /**
   * 发送者类型
   * - user: 用户
   * - staff: 工作人员
   * - operator: 运营
   */
  sender_type: 'user' | 'staff' | 'operator';

  /**
   * 发送者名称
   */
  sender_name: string;

  /**
   * 发送者企业
   */
  sender_enterprise: string;

  /**
   * 发送者对应的机器人ID（如果是工作人员）
   */
  sender_robot_id?: string;

  /**
   * 消息内容
   */
  content: string;

  /**
   * 消息类型
   * - text: 文本消息
   * - image: 图片消息
   * - video: 视频消息
   * - audio: 语音消息
   */
  message_type: 'text' | 'image' | 'video' | 'audio';

  /**
   * 时间戳
   */
  timestamp: string;
}
```

#### 2. UserProfile - 用户画像

```typescript
interface UserProfile {
  /**
   * 用户ID
   * 格式：user_{timestamp}_{id}
   */
  user_id: string;

  /**
   * 用户昵称
   */
  user_name: string;

  /**
   * 企业名称
   */
  enterprise_name: string;

  /**
   * 满意度评分
   * 范围：0-100
   */
  satisfaction_score: number;

  /**
   * 问题解决率
   * 范围：0-100%
   */
  problem_resolution_rate: number;

  /**
   * 消息总数
   */
  message_count: number;

  /**
   * 最后消息时间
   */
  last_message_time: string;

  /**
   * 加入时间
   */
  joined_at: string;

  /**
   * 用户类型
   * - new: 新用户（消息数 < 5）
   * - active: 活跃用户（24小时内有消息）
   * - inactive: 非活跃用户（24小时-7天有消息）
   * - archived: 归档用户（超过7天无消息）
   */
  user_type: 'new' | 'active' | 'inactive' | 'archived';
}
```

#### 3. StaffStatus - 工作人员状态

```typescript
interface StaffStatus {
  /**
   * 在线工作人员列表
   */
  online_staff: string[];

  /**
   * 是否正在处理用户问题
   */
  is_handling: boolean;

  /**
   * 当前处理用户的工作人员
   */
  handling_staff: string | null;

  /**
   * 工作人员活跃度
   * - high: 高活跃（最近1小时有活动）
   * - medium: 中活跃（最近1-24小时有活动）
   * - low: 低活跃（超过24小时无活动）
   */
  staff_activity: 'high' | 'medium' | 'low';

  /**
   * 工作人员总数
   */
  total_staff_count: number;

  /**
   * 在线工作人员数量
   */
  online_staff_count: number;
}
```

#### 4. TaskStatus - 售后任务状态

```typescript
interface TaskStatus {
  /**
   * 是否有待处理的任务
   */
  has_pending_task: boolean;

  /**
   * 任务ID
   */
  task_id: string | null;

  /**
   * 任务类型
   * - scan_qrcode: 扫码配合
   * - bind_phone: 绑定手机号
   * - realname: 实名认证
   * - selfie: 自拍申诉
   * - other: 其他
   */
  task_type: 'scan_qrcode' | 'bind_phone' | 'realname' | 'selfie' | 'other' | null;

  /**
   * 任务状态
   * - pending: 待处理
   * - in_progress: 进行中
   * - waiting_user_response: 等待用户响应
   * - completed: 已完成
   * - failed: 已失败
   */
  task_status: 'pending' | 'in_progress' | 'waiting_user_response' | 'completed' | 'failed' | null;

  /**
   * 任务创建时间
   */
  created_at: string | null;

  /**
   * 任务更新时间
   */
  updated_at: string | null;
}
```

#### 5. GroupInfo - 群聊信息

```typescript
interface GroupInfo {
  /**
   * 群聊ID
   */
  group_id: string;

  /**
   * 群聊名称
   */
  group_name: string;

  /**
   * 群成员数
   */
  member_count: number;

  /**
   * 消息总数
   */
  message_count: number;

  /**
   * 最后消息时间
   */
  last_message_time: string;

  /**
   * 群聊类型
   * - external: 外部群
   * - internal: 内部群
   */
  group_type: 'external' | 'internal';

  /**
   * 创建时间
   */
  created_at: string;
}
```

---

## 🔄 与 AI 分析返回数据结构的关系

### AI 分析完整返回数据结构

```typescript
interface AIAnalysisResult {
  /**
   * 机器人信息
   */
  robotId: string;
  robotName: string;
  sessionId: string;
  messageId: string;

  /**
   * 意图分析
   */
  intent: {
    type: string;           // 意图类型
    confidence: number;     // 置信度
  };

  /**
   * 情感分析
   */
  sentiment: {
    type: 'positive' | 'neutral' | 'negative';
    score: number;          // 情感分数
  };

  /**
   * 回复建议
   */
  need_reply: boolean;
  reply_suggestion: {
    content: string;
    reply_type: 'group_at_user' | 'private_chat' | 'group_no_at';
    at_user: boolean;
  };

  /**
   * 告警判断
   */
  need_alert: boolean;
  alert_level: 'P0' | 'P1' | 'P2' | null;
  alert_type: 'user_complaint' | 'operator_harsh' | 'task_unfinished' | 'staff_no_reply' | 'user_uncooperative' | null;

  /**
   * 人工介入判断
   */
  need_intervention: boolean;
  intervention_reason: string;
  ai_intervention: boolean;
  ai_intervention_scenario: 'staff_busy' | 'night_shift' | 'user_negative' | 'complex_problem' | 'operator_harsh' | '';

  /**
   * 工作人员状态分析
   */
  staff_status: {
    is_staff: boolean;
    staff_name: string | null;
    staff_role: 'after_sales' | 'assistant' | 'operator' | null;
    staff_activity: string | null;
  };

  /**
   * 用户满意度更新
   */
  user_satisfaction_update: number;

  /**
   * 元数据
   */
  metadata: {
    modelId: string;
    responseTime: number;
    tokensUsed: number;
  };
}
```

---

## 📊 数据流转图

```
WorkTool 回调
    │
    ├─ receivedName (发送者名称)
    ├─ groupName (群名)
    ├─ spoken (消息内容)
    ├─ textType (消息类型)
    └─ roomType (房间类型)
    │
    ▼
上下文准备服务
    │
    ├─ session_id: 生成
    ├─ is_new_session: 判断
    ├─ history_messages: 检索
    ├─ user_profile: 获取
    ├─ staff_status: 获取
    ├─ task_status: 获取
    ├─ group_info: 获取
    └─ metadata: 记录
    │
    ▼
机器人 AI 分析
    │
    ├─ intent: 意图识别
    ├─ sentiment: 情感分析
    ├─ need_reply: 回复判断
    ├─ reply_suggestion: 回复建议
    ├─ need_alert: 告警判断
    ├─ alert_level: 告警级别
    ├─ alert_type: 告警类型
    ├─ need_intervention: 介入判断
    ├─ intervention_reason: 介入原因
    ├─ ai_intervention: AI介入场景
    ├─ staff_status: 工作人员分析
    └─ user_satisfaction_update: 满意度更新
    │
    ▼
决策处理
    │
    ├─ need_reply → 发送回复
    ├─ need_alert → 触发告警
    ├─ need_intervention → 人工介入
    └─ user_satisfaction_update → 更新满意度
```

---

## 🔑 关键修正点

### 1. 移除 `session_type` 字段

**原因：**
- 现有系统通过 `roomType` 字段判断房间类型（群聊/联系人）
- 不需要额外的 `session_type` 字段

### 2. 字段命名保持一致

**修正前：**
```typescript
interface ContextData {
  session_type: 'user' | 'group';  // ❌ 不一致
  // ...
}
```

**修正后：**
```typescript
interface ContextData {
  session_id: string;             // ✅ 与现有系统一致
  is_new_session: boolean;        // ✅ 与现有系统一致
  // ...
}
```

### 3. 数据来源与现有系统对齐

**数据来源映射：**

| 字段 | 数据来源 | 说明 |
|-----|---------|------|
| `session_id` | 生成 | 基于 user_id 或 group_id 生成 |
| `is_new_session` | 判断 | 基于历史消息数量判断 |
| `history_messages` | session_messages | 从数据库检索 |
| `user_profile` | user_sessions | 从数据库获取 |
| `staff_status` | staff + robots | 动态计算 |
| `task_status` | tasks | 从数据库获取 |
| `group_info` | robots + 统计 | 从数据库计算 |

---

## ✅ 总结

### 修正后的关键优势

1. ✅ **与现有系统保持一致**
   - 字段命名与现有数据库表结构一致
   - 数据来源与现有服务对齐

2. ✅ **支持完整的功能**
   - 包含所有必需的上下文信息
   - 支持AI分析的完整流程

3. ✅ **易于实现**
   - 所有数据都可以从现有数据库获取
   - 不需要额外的数据结构改造

4. ✅ **易于维护**
   - 结构清晰，字段定义明确
   - 文档完整，便于理解和维护

---

**文档版本**: v2.0
**创建日期**: 2024-01-01
**状态**: ✅ 已修正

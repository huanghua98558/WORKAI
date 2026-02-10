# 上下文数据格式完整示例

## 📋 完整的 ContextData 结构

```json
{
  "session_id": "user_session_1704067200000_user_001",
  "is_new_session": false,
  "history_messages": [
    {
      "message_id": "msg_001",
      "sender_type": "user",
      "sender_name": "张三",
      "sender_enterprise": "企业A",
      "sender_robot_id": null,
      "content": "大家好",
      "message_type": "text",
      "timestamp": "2024-01-01T10:00:00.000Z"
    },
    {
      "message_id": "msg_002",
      "sender_type": "staff",
      "sender_name": "运营助理",
      "sender_enterprise": "WorkTool",
      "sender_robot_id": "robot_001",
      "content": "您好，欢迎加入视频号A群",
      "message_type": "text",
      "timestamp": "2024-01-01T10:01:00.000Z"
    },
    {
      "message_id": "msg_003",
      "sender_type": "user",
      "sender_name": "张三",
      "sender_enterprise": "企业A",
      "sender_robot_id": null,
      "content": "我的视频号发不了作品",
      "message_type": "text",
      "timestamp": "2024-01-01T10:05:00.000Z"
    },
    {
      "message_id": "msg_004",
      "sender_type": "staff",
      "sender_name": "售后A",
      "sender_enterprise": "WorkTool",
      "sender_robot_id": "robot_001",
      "content": "@张三 请扫码配合认证",
      "message_type": "text",
      "timestamp": "2024-01-01T10:06:00.000Z"
    },
    {
      "message_id": "msg_005",
      "sender_type": "user",
      "sender_name": "张三",
      "sender_enterprise": "企业A",
      "sender_robot_id": null,
      "content": "@售后A 怎么扫码？",
      "message_type": "text",
      "timestamp": "2024-01-01T10:10:00.000Z"
    }
  ],
  "user_profile": {
    "user_id": "user_001",
    "user_name": "张三",
    "enterprise_name": "企业A",
    "satisfaction_score": 75,
    "problem_resolution_rate": 80,
    "message_count": 5,
    "last_message_time": "2024-01-01T10:10:00.000Z",
    "joined_at": "2023-12-01T08:00:00.000Z",
    "user_type": "active"
  },
  "staff_status": {
    "online_staff": ["售后A", "群助理", "运营A"],
    "is_handling": true,
    "handling_staff": "售后A",
    "staff_activity": "high",
    "total_staff_count": 5,
    "online_staff_count": 3
  },
  "task_status": {
    "has_pending_task": true,
    "task_id": "task_12345",
    "task_type": "scan_qrcode",
    "task_status": "waiting_user_response",
    "created_at": "2024-01-01T10:06:00.000Z",
    "updated_at": "2024-01-01T10:06:00.000Z"
  },
  "group_info": {
    "group_id": "group_001",
    "group_name": "视频号A群",
    "member_count": 150,
    "message_count": 1250,
    "last_message_time": "2024-01-01T10:10:00.000Z",
    "group_type": "external",
    "created_at": "2023-06-01T09:00:00.000Z"
  },
  "metadata": {
    "context_count": 5,
    "context_type": "user_session",
    "retrieval_time": 125,
    "retrieval_strategy": "recent_30_messages"
  }
}
```

---

## 📊 各字段详细说明

### 1. session_id（会话ID）

**格式**: `user_session_{timestamp}_{user_id}` 或 `group_session_{timestamp}_{group_id}`

**示例**:
- 用户会话: `user_session_1704067200000_user_001`
- 社群会话: `group_session_1704067200000_group_001`

**生成规则**:
```javascript
// 用户会话ID
const sessionId = `user_session_${Date.now()}_${userId}`;

// 社群会话ID
const sessionId = `group_session_${Date.now()}_${groupId}`;
```

---

### 2. is_new_session（是否为新会话）

**说明**:
- `true`: 新会话（history_messages 为空数组）
- `false`: 老会话（history_messages 包含历史消息）

**判断规则**:
```javascript
const isNewSession = history_messages.length === 0;
```

---

### 3. history_messages（历史消息列表）

**数量动态调整规则**:

| 消息类型 | 上下文数量 | 说明 |
|---------|-----------|------|
| 售后类（扫码、绑定） | 30条 | 需要追踪任务进度 |
| 疑虑解答类 | 20条 | 中等上下文 |
| 情绪不满类 | 15条 | 避免过多负面情绪 |
| 状态沟通类 | 10条 | 简单对话 |
| 闲聊类 | 10条 | 简单对话 |
| 新会话 | 0条 | 无历史上下文 |

**字段说明**:

| 字段 | 类型 | 说明 |
|-----|------|------|
| message_id | string | 消息唯一标识 |
| sender_type | string | 发送者类型: `user` / `staff` / `operator` |
| sender_name | string | 发送者名称 |
| sender_enterprise | string | 发送者企业 |
| sender_robot_id | string? | 发送者对应的机器人ID（仅工作人员） |
| content | string | 消息内容 |
| message_type | string | 消息类型: `text` / `image` / `video` / `audio` |
| timestamp | string | 时间戳（ISO 8601格式） |

---

### 4. user_profile（用户画像）

**字段说明**:

| 字段 | 类型 | 说明 | 示例值 |
|-----|------|------|-------|
| user_id | string | 用户ID | `user_001` |
| user_name | string | 用户昵称 | `张三` |
| enterprise_name | string | 企业名称 | `企业A` |
| satisfaction_score | number | 满意度评分（0-100） | `75` |
| problem_resolution_rate | number | 问题解决率（0-100%） | `80` |
| message_count | number | 消息总数 | `5` |
| last_message_time | string | 最后消息时间 | `2024-01-01T10:10:00.000Z` |
| joined_at | string | 加入时间 | `2023-12-01T08:00:00.000Z` |
| user_type | string | 用户类型 | `active` |

**user_type 类型**:
- `new`: 新用户（消息数 < 5）
- `active`: 活跃用户（24小时内有消息）
- `inactive`: 非活跃用户（24小时-7天有消息）
- `archived`: 归档用户（超过7天无消息）

---

### 5. staff_status（工作人员状态）

**字段说明**:

| 字段 | 类型 | 说明 | 示例值 |
|-----|------|------|-------|
| online_staff | string[] | 在线工作人员列表 | `["售后A", "群助理", "运营A"]` |
| is_handling | boolean | 是否正在处理用户问题 | `true` |
| handling_staff | string\|null | 当前处理用户的工作人员 | `"售后A"` |
| staff_activity | string | 工作人员活跃度 | `"high"` |
| total_staff_count | number | 工作人员总数 | `5` |
| online_staff_count | number | 在线工作人员数量 | `3` |

**staff_activity 类型**:
- `high`: 高活跃（最近1小时有活动）
- `medium`: 中活跃（最近1-24小时有活动）
- `low`: 低活跃（超过24小时无活动）

---

### 6. task_status（售后任务状态）

**字段说明**:

| 字段 | 类型 | 说明 | 示例值 |
|-----|------|------|-------|
| has_pending_task | boolean | 是否有待处理的任务 | `true` |
| task_id | string\|null | 任务ID | `"task_12345"` |
| task_type | string\|null | 任务类型 | `"scan_qrcode"` |
| task_status | string\|null | 任务状态 | `"waiting_user_response"` |
| created_at | string\|null | 任务创建时间 | `2024-01-01T10:06:00.000Z` |
| updated_at | string\|null | 任务更新时间 | `2024-01-01T10:06:00.000Z` |

**task_type 类型**:
- `scan_qrcode`: 扫码配合
- `bind_phone`: 绑定手机号
- `realname`: 实名认证
- `selfie`: 自拍申诉
- `other`: 其他
- `null`: 无任务

**task_status 类型**:
- `pending`: 待处理
- `in_progress`: 进行中
- `waiting_user_response`: 等待用户响应
- `completed`: 已完成
- `failed`: 已失败
- `null`: 无任务

---

### 7. group_info（群聊信息）

**字段说明**:

| 字段 | 类型 | 说明 | 示例值 |
|-----|------|------|-------|
| group_id | string | 群聊ID | `"group_001"` |
| group_name | string | 群聊名称 | `"视频号A群"` |
| member_count | number | 群成员数 | `150` |
| message_count | number | 消息总数 | `1250` |
| last_message_time | string | 最后消息时间 | `2024-01-01T10:10:00.000Z` |
| group_type | string | 群聊类型 | `"external"` |
| created_at | string | 创建时间 | `2023-06-01T09:00:00.000Z` |

**group_type 类型**:
- `external`: 外部群
- `internal`: 内部群

---

### 8. metadata（元数据）

**字段说明**:

| 字段 | 类型 | 说明 | 示例值 |
|-----|------|------|-------|
| context_count | number | 上下文消息数量 | `5` |
| context_type | string | 上下文类型 | `"user_session"` |
| retrieval_time | number | 检索时间（毫秒） | `125` |
| retrieval_strategy | string | 检索策略 | `"recent_30_messages"` |

**context_type 类型**:
- `user_session`: 用户会话
- `group_session`: 社群会话

**retrieval_strategy 类型**:
- `recent_30_messages`: 最近30条消息（售后类）
- `recent_20_messages`: 最近20条消息（疑虑解答类）
- `recent_15_messages`: 最近15条消息（情绪不满类）
- `recent_10_messages`: 最近10条消息（状态沟通/闲聊）
- `empty`: 无历史消息（新会话）

---

## 🔄 不同场景的上下文示例

### 场景1: 新用户首次咨询（新会话）

```json
{
  "session_id": "user_session_1704067200000_new_user_001",
  "is_new_session": true,
  "history_messages": [],
  "user_profile": {
    "user_id": "user_001",
    "user_name": "李四",
    "enterprise_name": "企业B",
    "satisfaction_score": 50,
    "problem_resolution_rate": 0,
    "message_count": 0,
    "last_message_time": null,
    "joined_at": "2024-01-01T12:00:00.000Z",
    "user_type": "new"
  },
  "staff_status": {
    "online_staff": ["售后A", "群助理"],
    "is_handling": false,
    "handling_staff": null,
    "staff_activity": "medium",
    "total_staff_count": 5,
    "online_staff_count": 2
  },
  "task_status": {
    "has_pending_task": false,
    "task_id": null,
    "task_type": null,
    "task_status": null,
    "created_at": null,
    "updated_at": null
  },
  "group_info": {
    "group_id": "group_002",
    "group_name": "视频号B群",
    "member_count": 80,
    "message_count": 500,
    "last_message_time": "2024-01-01T11:55:00.000Z",
    "group_type": "external",
    "created_at": "2023-08-01T09:00:00.000Z"
  },
  "metadata": {
    "context_count": 0,
    "context_type": "user_session",
    "retrieval_time": 50,
    "retrieval_strategy": "empty"
  }
}
```

---

### 场景2: 售后任务进行中（老会话）

```json
{
  "session_id": "user_session_1704067200000_user_002",
  "is_new_session": false,
  "history_messages": [
    {
      "message_id": "msg_001",
      "sender_type": "user",
      "sender_name": "王五",
      "sender_enterprise": "企业C",
      "content": "怎么实名认证？",
      "message_type": "text",
      "timestamp": "2024-01-01T09:00:00.000Z"
    },
    {
      "message_id": "msg_002",
      "sender_type": "staff",
      "sender_name": "售后B",
      "sender_enterprise": "WorkTool",
      "sender_robot_id": "robot_002",
      "content": "@王五 请上传身份证照片进行实名认证",
      "message_type": "text",
      "timestamp": "2024-01-01T09:01:00.000Z"
    },
    {
      "message_id": "msg_003",
      "sender_type": "user",
      "sender_name": "王五",
      "sender_enterprise": "企业C",
      "content": "已上传，请审核",
      "message_type": "text",
      "timestamp": "2024-01-01T09:05:00.000Z"
    }
  ],
  "user_profile": {
    "user_id": "user_002",
    "user_name": "王五",
    "enterprise_name": "企业C",
    "satisfaction_score": 85,
    "problem_resolution_rate": 90,
    "message_count": 15,
    "last_message_time": "2024-01-01T09:05:00.000Z",
    "joined_at": "2023-11-01T08:00:00.000Z",
    "user_type": "active"
  },
  "staff_status": {
    "online_staff": ["售后B", "售后C"],
    "is_handling": true,
    "handling_staff": "售后B",
    "staff_activity": "high",
    "total_staff_count": 5,
    "online_staff_count": 2
  },
  "task_status": {
    "has_pending_task": true,
    "task_id": "task_67890",
    "task_type": "realname",
    "task_status": "in_progress",
    "created_at": "2024-01-01T09:01:00.000Z",
    "updated_at": "2024-01-01T09:05:00.000Z"
  },
  "group_info": {
    "group_id": "group_003",
    "group_name": "售后支持群",
    "member_count": 200,
    "message_count": 5000,
    "last_message_time": "2024-01-01T09:05:00.000Z",
    "group_type": "external",
    "created_at": "2023-05-01T09:00:00.000Z"
  },
  "metadata": {
    "context_count": 30,
    "context_type": "user_session",
    "retrieval_time": 150,
    "retrieval_strategy": "recent_30_messages"
  }
}
```

---

## 📝 TypeScript 接口定义

```typescript
interface ContextData {
  session_id: string;
  is_new_session: boolean;
  history_messages: HistoryMessage[];
  user_profile: UserProfile;
  staff_status: StaffStatus;
  task_status: TaskStatus;
  group_info: GroupInfo;
  metadata: {
    context_count: number;
    context_type: 'user_session' | 'group_session';
    retrieval_time: number;
    retrieval_strategy: string;
  };
}

interface HistoryMessage {
  message_id: string;
  sender_type: 'user' | 'staff' | 'operator';
  sender_name: string;
  sender_enterprise: string;
  sender_robot_id?: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio';
  timestamp: string;
}

interface UserProfile {
  user_id: string;
  user_name: string;
  enterprise_name: string;
  satisfaction_score: number;
  problem_resolution_rate: number;
  message_count: number;
  last_message_time: string | null;
  joined_at: string;
  user_type: 'new' | 'active' | 'inactive' | 'archived';
}

interface StaffStatus {
  online_staff: string[];
  is_handling: boolean;
  handling_staff: string | null;
  staff_activity: 'high' | 'medium' | 'low';
  total_staff_count: number;
  online_staff_count: number;
}

interface TaskStatus {
  has_pending_task: boolean;
  task_id: string | null;
  task_type: 'scan_qrcode' | 'bind_phone' | 'realname' | 'selfie' | 'other' | null;
  task_status: 'pending' | 'in_progress' | 'waiting_user_response' | 'completed' | 'failed' | null;
  created_at: string | null;
  updated_at: string | null;
}

interface GroupInfo {
  group_id: string;
  group_name: string;
  member_count: number;
  message_count: number;
  last_message_time: string;
  group_type: 'external' | 'internal';
  created_at: string;
}
```

---

**文档版本**: v1.0
**创建日期**: 2024-01-01
**状态**: ✅ 已完善

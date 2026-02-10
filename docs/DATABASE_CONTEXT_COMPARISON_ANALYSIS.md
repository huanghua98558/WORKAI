# 数据库与上下文数据结构对比分析报告

> **文档版本**: v1.0  
> **创建时间**: 2024-01-01  
> **目的**: 分析现有系统与新设计的上下文数据结构的差异，评估改造范围

---

## 📋 目录

- [现有数据库结构](#现有数据库结构)
- [现有上下文数据格式](#现有上下文数据格式)
- [新设计的上下文数据格式](#新设计的上下文数据格式)
- [差异对比分析](#差异对比分析)
- [改造范围评估](#改造范围评估)
- [技术方案建议](#技术方案建议)

---

## 一、现有数据库结构

### 1.1 核心表结构

#### user_sessions（用户会话表）

```sql
CREATE TABLE user_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(100) UNIQUE,          -- 用户ID（唯一）
  robot_id VARCHAR(36),                  -- 机器人ID
  status VARCHAR(20),                    -- 状态
  created_at TIMESTAMP,                  -- 创建时间
  last_message_at TIMESTAMP,             -- 最后消息时间
  total_message_count INTEGER,           -- 总消息数
  total_service_count INTEGER,           -- 总服务次数
  first_service_session_id VARCHAR(36),  -- 第一次服务会话ID
  last_service_session_id VARCHAR(36),  -- 最后一次服务会话ID
  metadata JSONB                         -- 元数据
);
```

**现有字段**:
- ✅ `user_id` - 用户ID
- ✅ `total_message_count` - 总消息数
- ✅ `last_message_at` - 最后消息时间
- ❌ **缺少**: `satisfaction_score` - 满意度评分
- ❌ **缺少**: `problem_resolution_rate` - 问题解决率
- ❌ **缺少**: `enterprise_name` - 企业名称
- ❌ **缺少**: `user_type` - 用户类型

---

#### sessions（服务会话表）

```sql
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_session_id VARCHAR(36),          -- 关联的用户会话ID
  robot_id VARCHAR(36),                  -- 机器人ID
  staff_id VARCHAR(36),                  -- 工作人员ID
  started_at TIMESTAMP,                  -- 会话开始时间
  ended_at TIMESTAMP,                    -- 会话结束时间
  duration_seconds INTEGER,              -- 会话时长
  satisfaction_score INTEGER,            -- 满意度评分（1-5分）
  satisfaction_reason VARCHAR(1000),     -- 满意度原因
  issue_category VARCHAR(100),           -- 问题分类
  issue_subcategory VARCHAR(100),        -- 问题子分类
  issue_resolved BOOLEAN,                -- 问题是否解决
  staff_intervened BOOLEAN,              -- 是否有工作人员介入
  staff_intervention_count INTEGER,      -- 工作人员介入次数
  first_intervention_at TIMESTAMP,       -- 第一次介入时间
  session_type VARCHAR(20)               -- 会话类型
);
```

**现有字段**:
- ✅ `satisfaction_score` - 满意度评分（在sessions表）
- ✅ `staff_id` - 工作人员ID
- ✅ `staff_intervened` - 是否有工作人员介入
- ✅ `issue_resolved` - 问题是否解决

---

#### messages（消息表）

```sql
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36),                -- 服务会话ID
  user_session_id VARCHAR(36),          -- 用户会话ID
  robot_id VARCHAR(36),                  -- 机器人ID
  content TEXT,                          -- 消息内容
  content_type VARCHAR(20),              -- 内容类型
  sender_id VARCHAR(100),                -- 发送者ID
  sender_type VARCHAR(20),               -- 发送者类型
  sender_name VARCHAR(200),              -- 发送者名称
  message_type VARCHAR(20),              -- 消息类型
  ai_model VARCHAR(100),                 -- AI模型
  ai_provider VARCHAR(50),               -- AI提供商
  ai_response_time INTEGER,              -- AI响应时间
  ai_tokens_used INTEGER,                -- AI使用的Token数
  ai_cost NUMERIC,                       -- AI成本
  ai_confidence NUMERIC,                 -- AI置信度
  intent_id VARCHAR(36),                 -- 意图ID
  intent_confidence NUMERIC,             -- 意图置信度
  emotion VARCHAR(50),                   -- 情感
  emotion_score NUMERIC,                 -- 情感分数
  metadata JSONB                         -- 元数据
);
```

**现有字段**:
- ✅ `sender_id` - 发送者ID
- ✅ `sender_type` - 发送者类型
- ✅ `sender_name` - 发送者名称
- ✅ `content_type` - 内容类型
- ✅ `emotion` - 情感
- ✅ `emotion_score` - 情感分数

---

#### staff（工作人员表）

```sql
CREATE TABLE staff (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200),                     -- 姓名
  email VARCHAR(255) UNIQUE,             -- 邮箱
  avatar_url VARCHAR(500),               -- 头像URL
  phone VARCHAR(50),                     -- 电话
  role VARCHAR(50),                      -- 角色
  permissions JSONB,                     -- 权限列表
  status VARCHAR(20),                    -- 状态
  status_message VARCHAR(500),           -- 状态消息
  current_sessions INTEGER,              -- 当前会话数
  max_sessions INTEGER,                  -- 最大会话数
  work_schedule JSONB,                   -- 工作时间
  timezone VARCHAR(50),                  -- 时区
  total_interventions INTEGER,           -- 介入总数
  total_messages INTEGER,                -- 总消息数
  avg_response_time INTEGER,             -- 平均响应时间
  satisfaction_rate NUMERIC,             -- 满意率
  created_at TIMESTAMP,                  -- 创建时间
  updated_at TIMESTAMP,                  -- 更新时间
  last_active_at TIMESTAMP               -- 最后活跃时间
);
```

**现有字段**:
- ✅ `name` - 工作人员名称
- ✅ `status` - 状态
- ✅ `last_active_at` - 最后活跃时间
- ✅ `satisfaction_rate` - 满意率

---

### 1.2 缺失的表

#### ❌ tasks（售后任务表）- **不存在**

需要新建表来存储售后任务信息。

#### ❌ group_sessions（社群会话表）- **不存在**

需要新建表来存储社群会话信息。

---

## 二、现有上下文数据格式

### 2.1 现有 Context 对象结构

根据 `server/lib/context-helper.js` 和 `server/services/message-processing.service.js` 的代码分析，现有的 context 对象结构如下：

```typescript
interface CurrentContext {
  // 基本信息
  sessionId: string;
  messageId: string;
  robotId: string;
  robotName?: string;
  
  // 用户信息
  userId: string;
  userName: string;
  userMessage: string;
  
  // 群组信息
  groupId?: string;
  groupName?: string;
  
  // 消息信息
  message: {
    content: string;
    spoken: string;
    // ... 其他字段
  };
  
  // 机器人信息
  robot: {
    robotId: string;
    robotName?: string;
    // ... 其他字段
  };
  
  // 其他
  // ... 其他上下文信息
}
```

---

## 三、新设计的上下文数据格式

### 3.1 新设计的 ContextData 接口

```typescript
interface ContextData {
  // 1. 会话信息
  session_id: string;
  is_new_session: boolean;
  
  // 2. 历史消息
  history_messages: HistoryMessage[];
  
  // 3. 用户画像
  user_profile: {
    user_id: string;
    user_name: string;
    enterprise_name: string;        // ❌ 数据库没有此字段
    satisfaction_score: number;     // ⚠️ 在sessions表，不在user_sessions
    problem_resolution_rate: number; // ❌ 数据库没有此字段
    message_count: number;
    last_message_time: string;
    joined_at: string;              // ❌ 数据库没有此字段
    user_type: 'new' | 'active' | 'inactive' | 'archived'; // ❌ 数据库没有此字段
  };
  
  // 4. 工作人员状态
  staff_status: {
    online_staff: string[];        // ✅ 可从staff表计算
    is_handling: boolean;           // ✅ 可从sessions表获取
    handling_staff: string | null;  // ✅ 可从sessions表获取
    staff_activity: 'high' | 'medium' | 'low'; // ⚠️ 需要计算
    total_staff_count: number;      // ✅ 可从staff表获取
    online_staff_count: number;     // ✅ 可从staff表获取
  };
  
  // 5. 售后任务状态
  task_status: {
    has_pending_task: boolean;      // ❌ 需要新建tasks表
    task_id: string | null;         // ❌ 需要新建tasks表
    task_type: 'scan_qrcode' | 'bind_phone' | 'realname' | 'selfie' | 'other' | null; // ❌ 需要新建tasks表
    task_status: 'pending' | 'in_progress' | 'waiting_user_response' | 'completed' | 'failed' | null; // ❌ 需要新建tasks表
    created_at: string | null;      // ❌ 需要新建tasks表
    updated_at: string | null;      // ❌ 需要新建tasks表
  };
  
  // 6. 群聊信息
  group_info: {
    group_id: string;               // ⚠️ 可从context获取
    group_name: string;             // ⚠️ 可从context获取
    member_count: number;           // ❌ 数据库没有此字段
    message_count: number;          // ❌ 数据库没有此字段
    last_message_time: string;      // ❌ 数据库没有此字段
    group_type: 'external' | 'internal'; // ⚠️ 可从WorkTool API获取
    created_at: string;             // ❌ 数据库没有此字段
  };
  
  // 7. 元数据
  metadata: {
    context_count: number;
    context_type: string;
    retrieval_time: number;
    retrieval_strategy: string;
  };
}
```

---

## 四、差异对比分析

### 4.1 字段对比表

| 新设计字段 | 数据库字段 | 存在 | 说明 |
|-----------|-----------|------|------|
| **user_profile** | | | |
| user_id | user_sessions.user_id | ✅ | 存在 |
| user_name | - | ⚠️ | 可从messages表获取sender_name |
| enterprise_name | - | ❌ | 缺失，需新增字段 |
| satisfaction_score | sessions.satisfaction_score | ⚠️ | 在sessions表，不在user_sessions |
| problem_resolution_rate | - | ❌ | 缺失，需新增字段 |
| message_count | user_sessions.total_message_count | ✅ | 存在 |
| last_message_time | user_sessions.last_message_at | ✅ | 存在 |
| joined_at | user_sessions.created_at | ✅ | 存在（语义一致） |
| user_type | - | ❌ | 缺失，可从消息数量和活跃度计算 |

| 新设计字段 | 数据库字段 | 存在 | 说明 |
|-----------|-----------|------|------|
| **staff_status** | | | |
| online_staff | staff.status + staff.last_active_at | ✅ | 可从staff表计算 |
| is_handling | sessions.staff_intervened | ✅ | 存在 |
| handling_staff | sessions.staff_id | ✅ | 存在 |
| staff_activity | staff.last_active_at | ✅ | 可计算 |
| total_staff_count | COUNT(*) FROM staff | ✅ | 可计算 |
| online_staff_count | COUNT(*) FROM staff WHERE status='online' | ✅ | 可计算 |

| 新设计字段 | 数据库字段 | 存在 | 说明 |
|-----------|-----------|------|------|
| **task_status** | | | |
| has_pending_task | - | ❌ | 缺失，需新建tasks表 |
| task_id | - | ❌ | 缺失，需新建tasks表 |
| task_type | - | ❌ | 缺失，需新建tasks表 |
| task_status | - | ❌ | 缺失，需新建tasks表 |
| created_at | - | ❌ | 缺失，需新建tasks表 |
| updated_at | - | ❌ | 缺失，需新建tasks表 |

| 新设计字段 | 数据库字段 | 存在 | 说明 |
|-----------|-----------|------|------|
| **group_info** | | | |
| group_id | context.groupId | ⚠️ | 可从context获取 |
| group_name | context.groupName | ⚠️ | 可从context获取 |
| member_count | - | ❌ | 缺失，可从WorkTool API获取 |
| message_count | - | ❌ | 缺失，需统计messages表 |
| last_message_time | - | ❌ | 缺失，需统计messages表 |
| group_type | - | ❌ | 缺失，可从WorkTool API获取 |
| created_at | - | ❌ | 缺失，需统计sessions表 |

---

### 4.2 关键发现

#### ✅ 不需要修改的字段（可直接使用）

1. **用户会话核心信息**:
   - `user_id`, `message_count`, `last_message_time`, `joined_at` ✅

2. **工作人员状态**:
   - 所有字段都可以从现有表计算得出 ✅

3. **历史消息**:
   - 所有信息都在 `messages` 表中 ✅

#### ⚠️ 需要计算的字段

1. **user_profile**:
   - `satisfaction_score` - 从 `sessions` 表获取平均值
   - `problem_resolution_rate` - 从 `sessions.issue_resolved` 计算解决率
   - `user_type` - 从 `user_sessions.total_message_count` 和活跃时间计算

2. **staff_status**:
   - `online_staff` - 查询 `staff` 表，过滤 `last_active_at`
   - `staff_activity` - 从 `staff.last_active_at` 计算

3. **group_info**:
   - `member_count`, `message_count`, `last_message_time` - 需要统计

#### ❌ 需要新建表/新增字段

1. **tasks 表**（完全缺失）:
   - 需要新建表存储售后任务信息

2. **group_sessions 表**（完全缺失）:
   - 需要新建表存储社群会话信息

3. **user_sessions 表**（缺少部分字段）:
   - `enterprise_name` - 需要新增
   - `problem_resolution_rate` - 需要新增

---

## 五、改造范围评估

### 5.1 数据库改造（最小化方案）

#### 方案 A：新建表（推荐）✅

**优点**:
- 不破坏现有数据
- 不影响现有功能
- 改造范围小
- 易于回滚

**需要新建的表**:

1. **tasks 表**（售后任务表）
```sql
CREATE TABLE tasks (
  id VARCHAR(36) PRIMARY KEY,
  user_session_id VARCHAR(36),
  robot_id VARCHAR(36),
  task_type VARCHAR(50),
  task_status VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  -- ... 其他字段
);
```

2. **group_sessions 表**（社群会话表）
```sql
CREATE TABLE group_sessions (
  id VARCHAR(36) PRIMARY KEY,
  group_id VARCHAR(100) UNIQUE,
  group_name VARCHAR(200),
  member_count INTEGER,
  message_count INTEGER,
  last_message_at TIMESTAMP,
  group_type VARCHAR(20),
  created_at TIMESTAMP,
  -- ... 其他字段
);
```

3. **user_sessions 表新增字段**
```sql
ALTER TABLE user_sessions ADD COLUMN enterprise_name VARCHAR(200);
ALTER TABLE user_sessions ADD COLUMN problem_resolution_rate INTEGER DEFAULT 0;
```

**改造范围**: 
- ✅ 新建 2 个表
- ✅ 修改 1 个表（新增 2 个字段）
- ✅ 不破坏现有数据

---

#### 方案 B：使用 metadata 字段（不推荐）❌

**优点**:
- 不需要新建表
- 改造范围最小

**缺点**:
- 数据分散，难以查询
- 无法建立索引
- 性能较差
- 不符合数据库设计规范

---

### 5.2 代码改造范围

#### 需要新增的服务

1. **ContextPreparationService**（上下文准备服务）
   - 文件：`server/services/context-preparation.service.js`
   - 功能：检索历史消息、用户画像、工作人员状态、任务状态、群聊信息

2. **TaskService**（任务服务）
   - 文件：`server/services/task.service.js`
   - 功能：创建、更新、查询售后任务

#### 需要修改的服务

1. **MessageProcessingService**（消息处理服务）
   - 文件：`server/services/message-processing.service.js`
   - 修改：集成上下文准备服务

2. **RobotAIService**（机器人AI服务）
   - 文件：`server/services/robot-ai.service.js`
   - 修改：接收完整上下文数据

---

## 六、技术方案建议

### 6.1 推荐方案：增量改造 ✅

#### 第1步：新建 tasks 表

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联信息
  user_session_id VARCHAR(36),
  session_id VARCHAR(36),
  robot_id VARCHAR(36),
  
  -- 任务信息
  task_type VARCHAR(50) NOT NULL,
  task_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- 任务数据
  task_data JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- 元数据
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS tasks_user_session_id_idx ON tasks(user_session_id);
CREATE INDEX IF NOT EXISTS tasks_session_id_idx ON tasks(session_id);
CREATE INDEX IF NOT EXISTS tasks_robot_id_idx ON tasks(robot_id);
CREATE INDEX IF NOT EXISTS tasks_task_type_idx ON tasks(task_type);
CREATE INDEX IF NOT EXISTS tasks_task_status_idx ON tasks(task_status);
```

---

#### 第2步：新建 group_sessions 表

```sql
CREATE TABLE IF NOT EXISTS group_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 群组信息
  group_id VARCHAR(100) NOT NULL UNIQUE,
  group_name VARCHAR(200),
  member_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  group_type VARCHAR(20) DEFAULT 'external',
  
  -- 关联信息
  robot_id VARCHAR(36),
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- 元数据
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS group_sessions_group_id_idx ON group_sessions(group_id);
CREATE INDEX IF NOT EXISTS group_sessions_robot_id_idx ON group_sessions(robot_id);
```

---

#### 第3步：扩展 user_sessions 表

```sql
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS enterprise_name VARCHAR(200);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS problem_resolution_rate INTEGER DEFAULT 0;
```

---

#### 第4步：实现上下文准备服务

创建 `server/services/context-preparation.service.js`，从现有数据库表中检索和计算上下文数据：

```javascript
class ContextPreparationService {
  async prepareContext(sessionId, message, robot) {
    // 1. 判断是否为新会话
    const isNewSession = await this.checkIsNewSession(sessionId);
    
    // 2. 检索历史消息
    const historyMessages = await this.getHistoryMessages(sessionId);
    
    // 3. 获取用户画像（从user_sessions + sessions表计算）
    const userProfile = await this.getUserProfile(message.receivedName, robot);
    
    // 4. 获取工作人员状态（从staff表计算）
    const staffStatus = await this.getStaffStatus(robot);
    
    // 5. 获取售后任务状态（从tasks表）
    const taskStatus = await this.getTaskStatus(message.receivedName);
    
    // 6. 获取群聊信息（从group_sessions表 + WorkTool API）
    const groupInfo = await this.getGroupInfo(message.groupName, robot);
    
    // 7. 动态调整上下文数量
    const adjustedHistoryMessages = this.adjustContextCount(
      historyMessages,
      message.textType
    );
    
    return {
      session_id: sessionId,
      is_new_session: isNewSession,
      history_messages: adjustedHistoryMessages,
      user_profile: userProfile,
      staff_status: staffStatus,
      task_status: taskStatus,
      group_info: group_info,
      metadata: { /* ... */ }
    };
  }
  
  async getUserProfile(userName, robot) {
    // 从user_sessions表查询
    const userSession = await db.select()
      .from(user_sessions)
      .where(eq(user_sessions.user_id, userId))
      .limit(1);
    
    if (userSession.length === 0) {
      return {
        user_id: `user_${Date.now()}`,
        user_name: userName,
        enterprise_name: '',
        satisfaction_score: 50,
        problem_resolution_rate: 0,
        message_count: 0,
        last_message_time: null,
        joined_at: new Date().toISOString(),
        user_type: 'new'
      };
    }
    
    // 计算problem_resolution_rate
    const sessions = await db.select()
      .from(sessions)
      .where(eq(sessions.user_session_id, userSession[0].id));
    
    const resolvedCount = sessions.filter(s => s.issue_resolved).length;
    const resolutionRate = sessions.length > 0 
      ? Math.round((resolvedCount / sessions.length) * 100) 
      : 0;
    
    // 计算user_type
    const now = new Date();
    const lastMessageAt = userSession[0].last_message_at ? new Date(userSession[0].last_message_at) : null;
    let userType = 'new';
    
    if (userSession[0].total_message_count >= 5) {
      if (lastMessageAt && (now - lastMessageAt) < 24 * 60 * 60 * 1000) {
        userType = 'active';
      } else if (lastMessageAt && (now - lastMessageAt) < 7 * 24 * 60 * 60 * 1000) {
        userType = 'inactive';
      } else {
        userType = 'archived';
      }
    }
    
    // 计算平均satisfaction_score（从sessions表）
    const avgSatisfaction = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.satisfaction_score || 3), 0) / sessions.length)
      : 50;
    
    return {
      user_id: userSession[0].user_id,
      user_name: userName,
      enterprise_name: userSession[0].enterprise_name || '',
      satisfaction_score: avgSatisfaction,
      problem_resolution_rate: resolutionRate,
      message_count: userSession[0].total_message_count,
      last_message_time: userSession[0].last_message_at,
      joined_at: userSession[0].created_at,
      user_type: userType
    };
  }
  
  // ... 其他方法
}
```

---

### 6.2 总结

#### ✅ 不需要大规模改造

**数据库层面**:
- ✅ 新建 2 个表（tasks, group_sessions）
- ✅ 修改 1 个表（user_sessions，新增 2 个字段）
- ✅ 不破坏现有数据
- ✅ 不影响现有功能

**代码层面**:
- ✅ 新增 1 个服务（ContextPreparationService）
- ✅ 修改 1 个服务（MessageProcessingService）
- ✅ 修改 1 个服务（RobotAIService）

#### ✅ 数据兼容性

- ✅ 现有数据完全兼容
- ✅ 新字段使用默认值
- ✅ 缺失数据可以计算得出
- ✅ 向后兼容

---

**文档版本**: v1.0  
**创建日期**: 2024-01-01  
**状态**: ✅ 已完成

# WorkTool AI 数据库优化设计方案

## 📊 当前问题分析

### 问题1：缺少核心会话表

**系统设计要求：**
- ✅ user_sessions（用户会话表）
- ✅ group_sessions（社群会话表）
- ✅ session_messages（会话消息明细表）

**当前数据库：**
- ❌ 没有 user_sessions
- ❌ 没有 group_sessions
- ✅ 只有 session_messages

**影响：**
- 无法实现上下文管理
- 无法追踪会话状态
- 无法统计用户画像
- 无法实现满意度分析

### 问题2：会话状态管理缺失

**系统设计要求：**
```
会话状态：active, idle, inactive, archived
```

**当前数据库：**
- 无法标记会话状态
- 无法自动更新状态
- 无法查询活跃会话

### 问题3：用户画像管理缺失

**系统设计要求：**
```
用户画像包含：
- satisfactionScore: 0-100
- problemResolutionRate: 0-100%
- messageCount: 消息总数
- joinedAt: 加入时间
```

**当前数据库：**
- 无法存储用户画像
- 无法追踪用户满意度
- 无法统计问题解决率

### 问题4：上下文检索性能差

**系统设计要求：**
- 按用户ID检索用户会话
- 按群组ID检索社群会话
- 动态调整检索数量（10-30条）

**当前数据库：**
- 需要聚合查询，性能差
- 无法快速获取用户画像
- 无法实现混合检索

### 问题5：协同分析功能缺失

**系统设计要求：**
- satisfaction_analysis（满意度分析表）
- staff_activities（工作人员活跃度表）
- ai_interventions（AI介入记录表）

**当前数据库：**
- ❌ 没有satisfaction_analysis
- ❌ 没有staff_activities
- ❌ 没有ai_interventions

---

## 🎯 优化方案A：完全符合系统设计

### 架构设计

```
┌─────────────────────────────────────────────┐
│           会话管理层（新增）                 │
│  ┌──────────────┐  ┌──────────────┐        │
│  │user_sessions │  │group_sessions│        │
│  │(用户会话)    │  │(社群会话)    │        │
│  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                │
│         └────────┬─────────┘                │
│                  │                          │
│         ┌────────▼─────────┐                │
│         │ session_messages │                │
│         │  (消息明细)      │                │
│         └────────┬─────────┘                │
└──────────────────┼──────────────────────────┘
                   │
┌──────────────────┼──────────────────────────┐
│           业务逻辑层                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  告警系统 │  │ 协同分析 │  │ AI分析   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

### 表结构设计

#### 1. 用户会话表（新增）

```sql
CREATE TABLE user_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  enterprise_name VARCHAR(255),
  satisfaction_score INTEGER DEFAULT 50,
  problem_resolution_rate NUMERIC(5,2) DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  last_message_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_status ON user_sessions(status);
CREATE INDEX idx_user_sessions_satisfaction_score ON user_sessions(satisfaction_score);
CREATE INDEX idx_user_sessions_last_message_time ON user_sessions(last_message_time);
```

#### 2. 社群会话表（新增）

```sql
CREATE TABLE group_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  group_id VARCHAR(255),
  group_name VARCHAR(255),
  member_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  last_message_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_group_sessions_session_id ON group_sessions(session_id);
CREATE INDEX idx_group_sessions_group_id ON group_sessions(group_id);
CREATE INDEX idx_group_sessions_status ON group_sessions(status);
CREATE INDEX idx_group_sessions_last_message_time ON group_sessions(last_message_time);
```

#### 3. 消息明细表（修改）

```sql
-- 添加外键关联
ALTER TABLE session_messages
ADD CONSTRAINT fk_session_messages_user_session
FOREIGN KEY (session_id) REFERENCES user_sessions(session_id) ON UPDATE CASCADE;

ALTER TABLE session_messages
ADD CONSTRAINT fk_session_messages_group_session
FOREIGN KEY (session_id) REFERENCES group_sessions(session_id) ON UPDATE CASCADE;

-- 添加满意度评分字段（可选）
ALTER TABLE session_messages
ADD COLUMN satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5);
```

#### 4. 满意度分析表（新增）

```sql
CREATE TABLE satisfaction_analysis (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(255),
  satisfaction_score INTEGER NOT NULL CHECK (satisfaction_score BETWEEN 0 AND 100),
  sentiment VARCHAR(20),
  problem_resolution_count INTEGER DEFAULT 0,
  problem_in_progress_count INTEGER DEFAULT 0,
  problem_unresolved_count INTEGER DEFAULT 0,
  problem_resolution_rate NUMERIC(5,2) DEFAULT 0,
  complaint_count INTEGER DEFAULT 0,
  dissatisfaction_count INTEGER DEFAULT 0,
  analyzed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_satisfaction_analysis_user_id ON satisfaction_analysis(user_id);
CREATE INDEX idx_satisfaction_analysis_score ON satisfaction_analysis(satisfaction_score);
CREATE INDEX idx_satisfaction_analysis_analyzed_at ON satisfaction_analysis(analyzed_at);
```

#### 5. 工作人员活跃度表（新增）

```sql
CREATE TABLE staff_activities (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id VARCHAR(255),
  staff_name VARCHAR(255),
  staff_role VARCHAR(50),
  status VARCHAR(20) DEFAULT 'offline',
  message_count_per_hour INTEGER DEFAULT 0,
  message_count_per_day INTEGER DEFAULT 0,
  message_count_per_week INTEGER DEFAULT 0,
  average_response_time INTEGER,
  max_response_time INTEGER,
  min_response_time INTEGER,
  last_active_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_staff_activities_staff_id ON staff_activities(staff_id);
CREATE INDEX idx_staff_activities_status ON staff_activities(status);
CREATE INDEX idx_staff_activities_role ON staff_activities(staff_role);
CREATE INDEX idx_staff_activities_last_active_time ON staff_activities(last_active_time);
```

#### 6. AI介入记录表（新增）

```sql
CREATE TABLE ai_interventions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id VARCHAR(100) UNIQUE NOT NULL,
  message_id VARCHAR(255),
  user_id VARCHAR(255),
  group_id VARCHAR(255),
  scenario VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ai_interventions_message_id ON ai_interventions(message_id);
CREATE INDEX idx_ai_interventions_user_id ON ai_interventions(user_id);
CREATE INDEX idx_ai_interventions_scenario ON ai_interventions(scenario);
```

---

## 🎯 优化方案B：简化架构（折中方案）

### 架构设计

```
┌─────────────────────────────────────────────┐
│           会话管理层（简化）                 │
│  ┌─────────────────────────────────────┐  │
│  │      sessions (单一会话表)          │  │
│  │  session_type: user | group         │  │
│  └──────────────┬──────────────────────┘  │
│                 │                          │
│         ┌───────▼─────────┐                │
│         │ session_messages│                │
│         └───────┬─────────┘                │
└─────────────────┼──────────────────────────┘
                  │
┌─────────────────┼──────────────────────────┐
│           业务逻辑层                         │
└─────────────────────────────────────────────┘
```

### 表结构设计

```sql
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  session_type VARCHAR(20) NOT NULL, -- user | group

  -- 用户信息（session_type=user时使用）
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  enterprise_name VARCHAR(255),
  satisfaction_score INTEGER DEFAULT 50,
  problem_resolution_rate NUMERIC(5,2) DEFAULT 0,

  -- 群组信息（session_type=group时使用）
  group_id VARCHAR(255),
  group_name VARCHAR(255),
  member_count INTEGER DEFAULT 0,

  -- 通用字段
  message_count INTEGER DEFAULT 0,
  last_message_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  joined_at TIMESTAMPTZ,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_session_type ON sessions(session_type);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_group_id ON sessions(group_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_last_message_time ON sessions(last_message_time);
```

---

## 📊 方案对比

| 对比项 | 方案A（完全符合） | 方案B（简化） | 推荐 |
|-------|------------------|--------------|------|
| **符合系统设计** | ✅ 100% | ⚠️ 80% | 方案A |
| **开发复杂度** | ⭐⭐⭐⭐ | ⭐⭐⭐ | 方案B |
| **查询性能** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 方案A |
| **维护性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 方案A |
| **扩展性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 方案A |
| **存储效率** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 方案B |
| **学习成本** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 方案B |

---

## 🎯 推荐方案：方案A（完全符合系统设计）

### 理由

1. **完全符合系统设计报告**
   - 用户会话和社群会话独立管理
   - 职责清晰，易于理解

2. **查询性能更优**
   - 按用户查询和按群组查询独立优化
   - 索引更精准

3. **扩展性更强**
   - 用户会话和社群会话可以有不同的扩展字段
   - 未来功能更容易扩展

4. **维护性更好**
   - 表结构清晰
   - 代码逻辑清晰

---

## 📋 实施步骤

### 步骤1：修改数据库schema（P0）

```javascript
// 在 server/database/schema.js 中添加

// 用户会话表
exports.userSessions = pgTable(
  "user_sessions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id", { length: 255 }).unique().notNull(),
    userId: varchar("user_id", { length: 255 }),
    userName: varchar("user_name", { length: 255 }),
    enterpriseName: varchar("enterprise_name", { length: 255 }),
    satisfactionScore: integer("satisfaction_score").default(50),
    problemResolutionRate: numeric("problem_resolution_rate", { precision: 5, scale: 2 }).default(0),
    messageCount: integer("message_count").default(0),
    lastMessageTime: timestamp("last_message_time", { withTimezone: true }),
    status: varchar("status", { length: 20 }).default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdIdx: index("user_sessions_session_id_idx").on(table.sessionId),
    userIdIdx: index("user_sessions_user_id_idx").on(table.userId),
    statusIdx: index("user_sessions_status_idx").on(table.status),
    satisfactionScoreIdx: index("user_sessions_satisfaction_score_idx").on(table.satisfactionScore),
    lastMessageTimeIdx: index("user_sessions_last_message_time_idx").on(table.lastMessageTime),
  })
);

// 社群会话表
exports.groupSessions = pgTable(
  "group_sessions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id", { length: 255 }).unique().notNull(),
    groupId: varchar("group_id", { length: 255 }),
    groupName: varchar("group_name", { length: 255 }),
    memberCount: integer("member_count").default(0),
    messageCount: integer("message_count").default(0),
    lastMessageTime: timestamp("last_message_time", { withTimezone: true }),
    status: varchar("status", { length: 20 }).default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdIdx: index("group_sessions_session_id_idx").on(table.sessionId),
    groupIdIdx: index("group_sessions_group_id_idx").on(table.groupId),
    statusIdx: index("group_sessions_status_idx").on(table.status),
    lastMessageTimeIdx: index("group_sessions_last_message_time_idx").on(table.lastMessageTime),
  })
);

// 满意度分析表
exports.satisfactionAnalysis = pgTable(
  "satisfaction_analysis",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    analysisId: varchar("analysis_id", { length: 100 }).unique().notNull(),
    userId: varchar("user_id", { length: 255 }),
    satisfactionScore: integer("satisfaction_score").notNull(),
    sentiment: varchar("sentiment", { length: 20 }),
    problemResolutionCount: integer("problem_resolution_count").default(0),
    problemInProgressCount: integer("problem_in_progress_count").default(0),
    problemUnresolvedCount: integer("problem_unresolved_count").default(0),
    problemResolutionRate: numeric("problem_resolution_rate", { precision: 5, scale: 2 }).default(0),
    complaintCount: integer("complaint_count").default(0),
    dissatisfactionCount: integer("dissatisfaction_count").default(0),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    analysisIdIdx: index("satisfaction_analysis_analysis_id_idx").on(table.analysisId),
    userIdIdx: index("satisfaction_analysis_user_id_idx").on(table.userId),
    satisfactionScoreIdx: index("satisfaction_analysis_satisfaction_score_idx").on(table.satisfactionScore),
    analyzedAtIdx: index("satisfaction_analysis_analyzed_at_idx").on(table.analyzedAt),
  })
);

// 工作人员活跃度表
exports.staffActivities = pgTable(
  "staff_activities",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    staffId: varchar("staff_id", { length: 255 }),
    staffName: varchar("staff_name", { length: 255 }),
    staffRole: varchar("staff_role", { length: 50 }),
    status: varchar("status", { length: 20 }).default("offline"),
    messageCountPerHour: integer("message_count_per_hour").default(0),
    messageCountPerDay: integer("message_count_per_day").default(0),
    messageCountPerWeek: integer("message_count_per_week").default(0),
    averageResponseTime: integer("average_response_time"),
    maxResponseTime: integer("max_response_time"),
    minResponseTime: integer("min_response_time"),
    lastActiveTime: timestamp("last_active_time", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    staffIdIdx: index("staff_activities_staff_id_idx").on(table.staffId),
    statusIdx: index("staff_activities_status_idx").on(table.status),
    staffRoleIdx: index("staff_activities_staff_role_idx").on(table.staffRole),
    lastActiveTimeIdx: index("staff_activities_last_active_time_idx").on(table.lastActiveTime),
  })
);

// AI介入记录表
exports.aiInterventions = pgTable(
  "ai_interventions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    interventionId: varchar("intervention_id", { length: 100 }).unique().notNull(),
    messageId: varchar("message_id", { length: 255 }),
    userId: varchar("user_id", { length: 255 }),
    groupId: varchar("group_id", { length: 255 }),
    scenario: varchar("scenario", { length: 50 }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    interventionIdIdx: index("ai_interventions_intervention_id_idx").on(table.interventionId),
    messageIdIdx: index("ai_interventions_message_id_idx").on(table.messageId),
    userIdIdx: index("ai_interventions_user_id_idx").on(table.userId),
    scenarioIdx: index("ai_interventions_scenario_idx").on(table.scenario),
  })
);
```

### 步骤2：创建迁移脚本（P0）

```bash
# 创建迁移文件
pnpm drizzle-kit generate

# 应用迁移
pnpm drizzle-kit migrate
```

### 步骤3：实现会话管理API（P0）

```typescript
// 创建会话
async function createUserSession(data: UserSessionData) {
  return await db.insert(userSessions).values(data).returning();
}

// 获取用户会话
async function getUserSession(userId: string) {
  return await db.select().from(userSessions).where(eq(userSessions.userId, userId)).limit(1);
}

// 更新会话状态
async function updateSessionStatus(sessionId: string, status: string) {
  return await db.update(userSessions)
    .set({ status, updatedAt: new Date() })
    .where(eq(userSessions.sessionId, sessionId));
}

// 更新用户满意度
async function updateSatisfactionScore(userId: string, score: number) {
  return await db.update(userSessions)
    .set({ satisfactionScore: score, updatedAt: new Date() })
    .where(eq(userSessions.userId, userId));
}

// 获取活跃会话
async function getActiveSessions(type: 'user' | 'group', limit: number = 50) {
  const table = type === 'user' ? userSessions : groupSessions;
  return await db.select().from(table)
    .where(eq(table.status, 'active'))
    .orderBy(desc(table.lastMessageTime))
    .limit(limit);
}
```

### 步骤4：实现上下文检索逻辑（P1）

```typescript
async function retrieveContext(userId: string, groupId: string, count: number = 20) {
  // 获取用户会话
  const userSession = await getUserSession(userId);

  // 获取社群会话
  const groupSession = await getGroupSession(groupId);

  // 检索用户历史消息
  const userMessages = userSession
    ? await db.select().from(sessionMessages)
        .where(eq(sessionMessages.userId, userId))
        .orderBy(desc(sessionMessages.timestamp))
        .limit(count)
    : [];

  // 检索社群历史消息
  const groupMessages = groupSession
    ? await db.select().from(sessionMessages)
        .where(eq(sessionMessages.groupId, groupId))
        .orderBy(desc(sessionMessages.timestamp))
        .limit(count)
    : [];

  return {
    userSession,
    groupSession,
    userMessages,
    groupMessages,
  };
}
```

### 步骤5：更新开发计划（P0）

```
Week 1-2: 数据库核心表
  ✅ user_sessions（新增）
  ✅ group_sessions（新增）
  ✅ session_messages（已有）
  ✅ robots（已有）

Week 3-4: 会话管理API
  ✅ 会话创建API
  ✅ 会话查询API
  ✅ 会话更新API
  ✅ 上下文检索API

Week 5-8: AI服务
  ✅ AI服务集成
  ✅ 意图识别
  ✅ 情感分析
  ✅ 回复生成

Week 9-12: 告警系统
  ✅ alert_history（已有）
  ✅ 告警创建
  ✅ 告警通知
  ✅ 告警升级

Week 13-16: 协同分析
  ✅ satisfaction_analysis（新增）
  ✅ staff_activities（新增）
  ✅ ai_interventions（新增）
  ✅ 协同决策

Week 17-18: 测试上线
```

---

## 📊 优化效果预测

### 性能提升

| 操作 | 优化前 | 优化后 | 提升 |
|------|-------|-------|------|
| **获取用户会话** | 聚合查询（~200ms） | 索引查询（~10ms） | 20x |
| **获取用户画像** | 无法实现 | 索引查询（~10ms） | ∞ |
| **更新满意度** | 无法实现 | 索引更新（~5ms） | ∞ |
| **活跃会话查询** | 聚合查询（~150ms） | 索引查询（~15ms） | 10x |
| **上下文检索** | 复杂查询（~300ms） | 索引查询（~50ms） | 6x |

### 功能完整性

| 功能 | 优化前 | 优化后 |
|------|-------|-------|
| 用户会话管理 | ❌ 0% | ✅ 100% |
| 社群会话管理 | ❌ 0% | ✅ 100% |
| 会话状态管理 | ❌ 0% | ✅ 100% |
| 用户画像管理 | ❌ 0% | ✅ 100% |
| 满意度分析 | ❌ 0% | ✅ 100% |
| 工作人员活跃度 | ❌ 0% | ✅ 100% |
| 上下文检索 | ⚠️ 30% | ✅ 100% |
| AI介入记录 | ❌ 0% | ✅ 100% |

---

## 🎯 总结

### 推荐方案

```
采用方案A：完全符合系统设计

理由：
  1. 100%符合系统设计报告1.md
  2. 性能最优（查询速度提升6-20倍）
  3. 功能最完整（所有功能100%实现）
  4. 扩展性最强
  5. 维护性最好

实施优先级：
  P0: 立即修改数据库schema
  P0: 实现会话管理API
  P1: 实现上下文检索逻辑
  P1: 实现协同分析功能
  P2: 性能优化和数据归档
```

### 预期收益

```
1. 功能完整性
   - 从30%提升到100%

2. 查询性能
   - 平均提升10倍以上

3. 开发效率
   - 减少后续返工风险
   - 降低维护成本

4. 扩展性
   - 支持未来功能扩展
   - 易于维护和优化

5. 一致性
   - 数据库设计与系统设计完全一致
   - 减少理解和沟通成本
```

---

## 📞 下一步行动

### 立即行动

1. ✅ 修改数据库schema.js
2. ✅ 创建迁移脚本
3. ✅ 更新开发计划
4. ✅ 创建会话管理API

### 本周完成

1. ✅ 应用数据库迁移
2. ✅ 测试新表结构
3. ✅ 实现基础API
4. ✅ 更新文档

### 下周完成

1. ✅ 实现上下文检索
2. ✅ 实现用户画像管理
3. ✅ 集成AI服务
4. ✅ 测试完整流程

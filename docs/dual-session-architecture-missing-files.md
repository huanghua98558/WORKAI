# WorkTool AI 2.1 - 双层会话架构缺失文件清单

**检查日期**: 2025-02-06
**检查范围**: 双层会话架构所需的文件
**系统状态**: ⚠️ Schema与数据库不一致，需要迁移

---

## 一、系统现状分析

### 1.1 数据库现状（实际表结构）

#### 已存在的表：
| 表名 | 用途 | 状态 |
|------|------|------|
| `sessions` | 会话表（旧结构） | ✅ 存在 |
| `session_messages` | 消息表（旧结构） | ✅ 存在 |
| `session_staff_status` | 会话-工作人员状态 | ✅ 存在 |
| `interventions` | 介入记录表 | ✅ 存在（刚创建） |
| `staff` | 工作人员表 | ✅ 存在（刚创建） |
| `robots` | 机器人表 | ✅ 存在 |
| `users` | 用户表 | ✅ 存在 |
| `system_settings` | 系统设置 | ✅ 存在 |
| `system_logs` | 系统日志 | ✅ 存在 |

#### 缺失的表：
| 表名 | 用途 | 优先级 |
|------|------|--------|
| `user_sessions` | 用户会话表（双层架构核心） | 🔴 P0 |
| `messages` | 消息表（新结构） | 🟡 P1 |

#### 表结构不一致问题：

**问题1: sessions表结构不一致**
- **Schema定义**: 包含 `satisfactionScore`, `issueCategory`, `issueResolved`, `durationSeconds` 等字段
- **实际数据库**: 只有 `session_id`, `user_id`, `status`, `context`, `message_count`, `last_intent` 等基本字段
- **影响**: 代码中使用的字段在数据库中不存在，会导致查询失败

**问题2: messages表不存在**
- **Schema定义**: 定义了完整的messages表结构
- **实际数据库**: 只有 `session_messages` 表，没有 `messages` 表
- **影响**: 消息服务无法正常工作

**问题3: user_sessions表不存在**
- **双层架构需求**: 需要user_sessions表来记录用户的长期会话
- **实际数据库**: 不存在
- **影响**: 无法实现双层会话架构

---

## 二、缺失文件清单

### 2.1 数据库Schema文件（缺失1个）

| 文件路径 | 用途 | 优先级 | 说明 |
|---------|------|--------|------|
| `src/storage/database/new-schemas/user-sessions.ts` | 用户会话Schema定义 | 🔴 P0 | 定义user_sessions表结构 |

**需要导出到index.ts**:
```typescript
export * from './user-sessions';
```

---

### 2.2 数据库迁移脚本（缺失2个）

| 文件路径 | 用途 | 优先级 | 说明 |
|---------|------|--------|------|
| `server/database/migrations/015_create_user_sessions_table.sql` | 创建用户会话表 | 🔴 P0 | 创建user_sessions表 |
| `server/database/migrations/016_alter_sessions_table.sql` | 更新sessions表结构 | 🔴 P0 | 添加双层架构所需字段 |
| `server/database/migrations/017_create_messages_table.sql` | 创建messages表 | 🟡 P1 | 创建新的messages表 |

**需要创建的迁移脚本**:
```javascript
server/scripts/run-user-sessions-migration.js
server/scripts/run-alter-sessions-migration.js
server/scripts/run-messages-migration.js
```

---

### 2.3 服务层文件（缺失2个）

| 文件路径 | 用途 | 优先级 | 说明 |
|---------|------|--------|------|
| `src/lib/services/user-session-service.ts` | 用户会话服务 | 🔴 P0 | 管理用户会话的创建、查询、更新 |
| `src/lib/services/session-lifecycle-service.ts` | 会话生命周期服务 | 🔴 P0 | 管理会话的结束、转移等生命周期操作 |

---

### 2.4 API层文件（缺失3个）

| 文件路径 | 用途 | 优先级 | 说明 |
|---------|------|--------|------|
| `src/app/api/sessions/[id]/end/route.ts` | 结束会话接口 | 🔴 P0 | 结束服务会话 |
| `src/app/api/sessions/[id]/transfer/route.ts` | 转移会话接口 | 🔴 P0 | 转移会话给其他工作人员 |
| `src/app/api/user-sessions/route.ts` | 用户会话接口 | 🟡 P1 | 获取/创建用户会话 |
| `src/app/api/user-sessions/[id]/context/route.ts` | 用户上下文接口 | 🟡 P1 | 获取用户历史对话上下文 |

---

### 2.5 扩展文件（可选，P2优先级）

| 文件路径 | 用途 | 优先级 | 说明 |
|---------|------|--------|------|
| `src/lib/services/context-builder.ts` | 上下文构建服务 | 🟢 P2 | 为AI构建对话上下文 |
| `src/lib/services/session-migration.ts` | 会话数据迁移服务 | 🟢 P2 | 从旧表迁移到新表 |
| `docs/session-lifecycle.md` | 会话生命周期文档 | 🟢 P2 | 文档说明 |

---

## 三、关键实现细节

### 3.1 user_sessions表结构

```sql
CREATE TABLE user_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL UNIQUE,
  robot_id VARCHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  total_message_count INTEGER NOT NULL DEFAULT 0,
  total_service_count INTEGER NOT NULL DEFAULT 0,
  first_service_session_id VARCHAR(36),
  last_service_session_id VARCHAR(36),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_status ON user_sessions(status);
```

### 3.2 sessions表需要添加的字段

```sql
ALTER TABLE sessions ADD COLUMN user_session_id VARCHAR(36);
ALTER TABLE sessions ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sessions ADD COLUMN ended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sessions ADD COLUMN duration_seconds INTEGER;
ALTER TABLE sessions ADD COLUMN satisfaction_score INTEGER;
ALTER TABLE sessions ADD COLUMN satisfaction_reason VARCHAR(1000);
ALTER TABLE sessions ADD COLUMN issue_category VARCHAR(100);
ALTER TABLE sessions ADD COLUMN issue_subcategory VARCHAR(100);
ALTER TABLE sessions ADD COLUMN issue_resolved BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN staff_id VARCHAR(36);
ALTER TABLE sessions ADD COLUMN staff_intervened BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN staff_intervention_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN first_intervention_at TIMESTAMP WITH TIME ZONE;
```

### 3.3 messages表结构

```sql
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(36) NOT NULL,
  user_session_id VARCHAR(36),
  robot_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text',
  sender_id VARCHAR(100) NOT NULL,
  sender_type VARCHAR(20) NOT NULL,
  sender_name VARCHAR(200),
  message_type VARCHAR(20) DEFAULT 'message',
  ai_model VARCHAR(100),
  ai_provider VARCHAR(50),
  ai_response_time INTEGER,
  ai_tokens_used INTEGER,
  ai_cost NUMERIC(10, 4),
  ai_confidence NUMERIC(3, 2),
  intent_id VARCHAR(36),
  intent_confidence NUMERIC(3, 2),
  emotion VARCHAR(50),
  emotion_score NUMERIC(3, 2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

## 四、实施计划

### Phase 1: 数据库迁移（P0）

1. ✅ 创建 staff 表（已完成）
2. ✅ 创建 interventions 表（已完成）
3. ⏳ 创建 user_sessions 表
4. ⏳ 更新 sessions 表结构
5. ⏳ 创建 messages 表

### Phase 2: 服务层实现（P0）

1. ⏳ 实现 user-session-service.ts
2. ⏳ 实现 session-lifecycle-service.ts
3. ⏳ 更新 session-service.ts（添加endSession和transferSession方法）

### Phase 3: API层实现（P0）

1. ⏳ 实现 POST /api/sessions/[id]/end
2. ⏳ 实现 POST /api/sessions/[id]/transfer

### Phase 4: 系统集成（P1）

1. ⏳ 更新消息接收流程（集成user_sessions）
2. ⏳ 更新消息服务（使用新的messages表）
3. ⏳ 实现用户上下文查询接口

### Phase 5: 数据迁移（P2）

1. ⏳ 将 session_messages 数据迁移到 messages 表
2. ⏳ 创建用户会话记录（从现有sessions数据）
3. ⏳ 更新 sessions 表的 user_session_id 字段

---

## 五、风险评估

### 高风险项 🔴

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| sessions表结构变更影响现有功能 | 现有API可能失败 | 1. 先创建新表 2. 迁移数据 3. 切换API 4. 废弃旧表 |
| messages表与session_messages表并存 | 数据不一致 | 统一使用messages表，迁移session_messages数据 |
| Schema与数据库不一致 | 代码运行时错误 | 立即执行数据库迁移脚本 |

### 中风险项 🟡

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| user_sessions表性能问题 | 查询变慢 | 添加合适的索引 |
| 转移会话状态不一致 | 会话归属错误 | 使用事务确保原子性 |

---

## 六、依赖关系

```
数据库Schema
  ↓
数据库迁移脚本
  ↓
服务层（user-session-service, session-lifecycle-service）
  ↓
API层（end, transfer接口）
  ↓
系统集成（消息接收流程更新）
```

---

## 七、优先级总结

| 优先级 | 文件数量 | 工作量预估 | 状态 |
|--------|---------|-----------|------|
| P0 | 8个文件 | 4小时 | ⏳ 待开始 |
| P1 | 3个文件 | 2小时 | ⏳ 待开始 |
| P2 | 3个文件 | 2小时 | ⏳ 待开始 |

**总计**: 14个文件需要创建或修改

---

## 八、下一步行动

### 立即行动（今天）

1. ✅ 创建 user_sessions Schema
2. ✅ 创建 user_sessions 表迁移脚本
3. ✅ 执行迁移脚本
4. ✅ 创建 user-session-service.ts
5. ✅ 创建 session-lifecycle-service.ts
6. ✅ 实现 end 会话接口
7. ✅ 实现 transfer 会话接口
8. ✅ 更新 sessions 表结构

### 近期行动（明天）

1. ⏳ 创建 messages 表
2. ⏳ 迁移 session_messages 到 messages
3. ⏳ 实现用户上下文查询接口
4. ⏳ 更新消息接收流程

### 后续优化（本周）

1. ⏳ 数据迁移脚本
2. ⏳ 性能优化
3. ⏳ 文档完善

---

**报告完成**

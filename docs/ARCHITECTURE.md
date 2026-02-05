# WorkTool AI 2.1 - 完整系统架构规划（基于现有系统优化版）

## 📋 目录
- [系统概述](#系统概述)
- [现有系统分析](#现有系统分析)
- [系统分层架构](#系统分层架构)
- [信息中心设计](#信息中心设计)
- [应用层服务架构](#应用层服务架构)
- [前端架构设计](#前端架构设计)
- [数据库设计](#数据库设计)
- [API接口设计](#api接口设计)
- [核心业务流程](#核心业务流程)
- [部署架构](#部署架构)

---

## 系统概述

### 系统定位
WorkTool AI 2.1 是一个基于 Node.js 的智能客服系统，支持 AI 与人工协同工作，提供完整的流程引擎、监控告警、数据分析能力。

### 核心能力
- 🤖 **智能对话**：集成豆包大语言模型，提供自然语言理解与生成
- 🔄 **流程引擎**：可视化流程编辑器，支持复杂业务流程编排
- 👥 **协同决策**：智能判断人工介入时机，优化人机协作效率
- 📊 **实时监控**：全方位系统监控，实时告警响应
- 📈 **数据分析**：深度挖掘会话数据，提供业务洞察
- 📚 **知识库**：企业知识库管理与检索
- ⚠️ **风险处理**：智能识别风险消息，自动处理或人工介入

### 技术栈
| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 16 | React 19 + App Router |
| UI组件 | shadcn/ui | 基于 Radix UI |
| 图表库 | Recharts | 数据可视化 |
| 后端框架 | Fastify | 高性能 Web 框架 |
| ORM | Drizzle | 类型安全的 ORM |
| 数据库 | PostgreSQL | 主数据存储 |
| 缓存 | Redis | 会话、消息队列 |
| AI服务 | 豆包、OpenAI | 大语言模型 |
| 对象存储 | S3 | 文件存储 |

---

## 现有系统分析

### 已实现的功能模块

#### 数据库表（已实现）
1. ✅ `users` - 用户表
2. ✅ `systemSettings` - 系统设置表
3. ✅ `riskMessages` - 风险消息表
4. ✅ `riskHandlingLogs` - 风险处理记录表

#### API路由（已实现）
1. ✅ **admin/** - 管理相关（机器人、命令、组、角色、负载均衡、监控、日志）
2. ✅ **ai-io/** - AI输入输出
3. ✅ **ai/** - AI相关（意图识别、测试）
4. ✅ **alerts/** - 告警（规则、历史、统计）
5. ✅ **collab/** - 协同（决策日志、建议、活动、统计）
6. ✅ **flow-engine/** - 流程引擎（定义、实例）
7. ✅ **knowledge/** - 知识库（导入、搜索）
8. ✅ **monitoring/** - 监控（执行、AI日志、健康）
9. ✅ **notifications/** - 通知（方法、发送、测试）
10. ✅ **operation-logs/** - 操作日志
11. ✅ **prompt-templates/** - Prompt模板
12. ✅ **proxy/** - 代理服务

#### 前端页面（已实现）
1. ✅ 主页（Dashboard）
2. ✅ alerts/center/ - 告警中心
3. ✅ alerts/recipients/ - 告警接收者
4. ✅ alerts/rules/ - 告警规则
5. ✅ alerts/stats/ - 告警统计
6. ✅ callback-debug/ - 回调调试
7. ✅ collab-analytics/ - 协同分析
8. ✅ knowledge-base/ - 知识库
9. ✅ monitoring/ - 监控
10. ✅ robot/[id]/ - 机器人详情
11. ✅ settings/ai/ - AI设置
12. ✅ settings/notifications/ - 通知设置

### 需要新增/调整的功能

#### 数据库表（需要新增）
1. ❌ `messages` - 消息表（新增）
2. ❌ `sessions` - 会话表（新增）
3. ❌ `intents` - 意图表（新增，虽然AI接口存在但表可能缺失）
4. ❌ `collaborations` - 协同记录表（新增）
5. ❌ `satisfaction` - 满意度表（新增）
6. ❌ `staff_interventions` - 工作人员介入表（新增）
7. ⚠️ `robots` - 机器人表（可能已存在，需确认）
8. ⚠️ `staff` - 工作人员表（可能已存在，需确认）
9. ❌ `flow_definitions` - 流程定义表（新增）
10. ❌ `flow_executions` - 流程执行表（新增）
11. ❌ `alert_rules` - 告警规则表（新增）
12. ❌ `alert_history` - 告警历史表（新增）

#### API路由（需要调整）
1. ⚠️ information-center/ - 信息中心API（可能需要整合到现有结构）
2. ⚠️ staff/ - 工作人员API（可能需要从admin分离）
3. ⚠️ robots/ - 机器人API（已有admin/robots，可能需要整合）

#### 前端页面（需要新增）
1. ❌ flows/ - 流程编辑器（新增，虽然有组件但无独立页面）
2. ❌ sessions/ - 会话分析（新增）
3. ❌ staff/ - 工作人员管理（新增）
4. ❌ reports/ - 数据报表（新增）
5. ⚠️ settings/general/ - 通用设置（新增）

---

## 系统分层架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           用户层（User Layer）                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  外部用户    │  │   工作人员   │  │   系统管理   │  │   第三方系统 │   │
│  │  （终端用户）│  │  （客服团队）│  │   （运维）   │  │  （集成接口）│   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓ 消息发送
┌─────────────────────────────────────────────────────────────────────────────┐
│                           接入层（Access Layer）                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │  机器人接入  │  │  Web管理后台 │  │  API集成接口 │                      │
│  │  （群聊/私聊）│  │  （管理员）  │  │  （第三方）  │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
                    ↓ 消息上报
┌─────────────────────────────────────────────────────────────────────────────┐
│                       数据服务层（信息中心/现有API）⭐                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 消息收集服务 │  │ 数据处理引擎 │  │ AI服务集成   │  │ 数据存储     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │ 会话管理服务 │  │ 介入判断服务 │  │ 协同决策服务 │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        数据查询API（REST/SSE）                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                    ↓ 数据服务
┌─────────────────────────────────────────────────────────────────────────────┐
│                         应用层（Application Layer）                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 流程引擎服务 │  │ 机器人管理   │  │ 执行监控服务 │  │ 告警服务     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐                                           │
│  │ 报表服务     │  │ 通知服务     │                                           │
│  └──────────────┘  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                    ↓                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        前端展示层（Frontend Layer）                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 16 + shadcn/ui                           │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 主页 │流程编辑器│机器人管理│执行监控│会话分析│协同分析│工作人员管理│ │   │
│  │告警管理│数据报表│设置中心│                                         │ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        基础设施层（Infrastructure）                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ PostgreSQL   │  │   Redis      │  │  S3存储     │  │  监控日志    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 架构调整说明

基于现有系统分析，采用以下策略：

1. **保留现有API结构**：不进行大规模重构，保留现有的 `/api/admin/`、`/api/proxy/` 等结构
2. **渐进式新增**：按需新增缺失的API和数据库表
3. **整合而非替换**：新功能与现有功能整合，避免重复开发
4. **服务拆分可选**：初期使用单服务，后续根据需要拆分

---

## 信息中心设计

### 核心职责

信息中心功能整合到现有的API结构中：

1. **数据收集**：通过 `/api/ai-io/` 和 `/api/admin/` 接收数据
2. **数据处理**：在现有服务中增强处理逻辑
3. **AI集成**：通过 `/api/ai/` 和 `/server/services/ai/` 实现
4. **数据存储**：新增数据库表补充现有表结构
5. **数据服务**：通过现有API提供查询功能

### 服务架构（调整版）

```
现有系统架构
│
├── 核心服务（整合到现有代码）
│   ├── 消息收集服务（通过 ai-io/ 实现）
│   ├── 发送者识别服务（新增）
│   ├── 会话管理服务（新增，依赖 sessions 表）
│   ├── 介入判断服务（通过 collab/ 和 riskMessages 实现）
│   ├── 协同决策服务（通过 collab/ 实现）
│   ├── AI服务集成（通过 ai/ 和 server/services/ai/ 实现）
│   └── 满意度推断服务（新增）
│
├── 数据访问层（新增）
│   ├── MessageRepository（新增）
│   ├── SessionRepository（新增）
│   ├── RobotRepository（可能已存在）
│   ├── StaffRepository（可能已存在）
│   ├── IntentRepository（新增）
│   ├── CollaborationRepository（可能已存在）
│   └── SatisfactionRepository（新增）
│
├── 缓存层（现有 Redis）
│   ├── 会话缓存
│   ├── 上下文缓存
│   └── 消息队列
│
└── API层（现有 + 新增）
    ├── REST API
    │   ├── POST /api/ai-io/route.ts（已有）
    │   ├── GET /api/admin/message-history（已有）
    │   ├── GET /api/collab/*（已有）
    │   ├── GET /api/ai/intents/*（已有）
    │   └── 新增：/api/sessions/*、/api/messages/*
    │
    └── SSE API
        └── 新增：/api/sessions/stream、/api/messages/stream
```

---

## 数据库设计

### 已有表（保留）

#### 1. users（用户表）
```sql
-- 已实现，无需修改
users
  - id
  - username
  - email
  - password
  - role
  - isActive
  - lastLoginAt
  - createdAt
  - updatedAt
```

#### 2. systemSettings（系统设置表）
```sql
-- 已实现，无需修改
systemSettings
  - id
  - key
  - value
  - category
  - description
  - updatedAt
  - updatedAtBy
```

#### 3. riskMessages（风险消息表）
```sql
-- 已实现，保留
riskMessages
  - id
  - messageId
  - sessionId
  - userId
  - userName
  - groupName
  - content
  - aiReply
  - status
  - resolvedBy
  - resolvedAt
  - handledByStaff
  - createdAt
  - updatedAt
```

#### 4. riskHandlingLogs（风险处理记录表）
```sql
-- 已实现，保留
riskHandlingLogs
  - id
  - riskId
  - action
  - actor
  - content
  - metadata
  - createdAt
```

### 需要新增的表

#### 1. messages（消息表）⭐ 高优先级
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    robot_id UUID NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
    
    -- 消息内容
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text',
    
    -- 发送者信息
    sender_id VARCHAR(100) NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    sender_name VARCHAR(200),
    
    -- 消息类型
    message_type VARCHAR(20) DEFAULT 'message',
    
    -- AI相关信息
    ai_model VARCHAR(100),
    ai_provider VARCHAR(50),
    ai_response_time INTEGER,
    ai_tokens_used INTEGER,
    ai_cost DECIMAL(10, 4),
    ai_confidence DECIMAL(3, 2),
    
    -- 意图识别
    intent_id UUID REFERENCES intents(id),
    intent_confidence DECIMAL(3, 2),
    emotion VARCHAR(50),
    emotion_score DECIMAL(3, 2),
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_robot_id ON messages(robot_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

#### 2. sessions（会话表）⭐ 高优先级
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id UUID NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
    
    -- 用户信息
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(200),
    user_source VARCHAR(50),
    
    -- 会话状态
    status VARCHAR(20) DEFAULT 'active',
    session_type VARCHAR(20) DEFAULT 'private',
    
    -- 统计数据
    message_count INTEGER DEFAULT 0,
    user_message_count INTEGER DEFAULT 0,
    staff_message_count INTEGER DEFAULT 0,
    ai_message_count INTEGER DEFAULT 0,
    
    -- 介入信息
    staff_intervened BOOLEAN DEFAULT FALSE,
    staff_id UUID REFERENCES staff(id),
    staff_intervention_count INTEGER DEFAULT 0,
    
    -- 满意度
    satisfaction_score INTEGER,
    satisfaction_reason TEXT,
    satisfaction_inferred_at TIMESTAMP WITH TIME ZONE,
    
    -- 问题信息
    issue_category VARCHAR(100),
    issue_resolved BOOLEAN DEFAULT FALSE,
    
    -- 时间信息
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- 元数据
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_sessions_robot_id ON sessions(robot_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_last_message_at ON sessions(last_message_at DESC);
```

#### 3. robots（机器人表）⭐ 高优先级
```sql
CREATE TABLE robots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息
    name VARCHAR(200) NOT NULL,
    description TEXT,
    robot_type VARCHAR(50) NOT NULL,
    
    -- 配置
    config JSONB NOT NULL DEFAULT '{}',
    
    -- 回调配置
    callback_url TEXT NOT NULL,
    callback_secret VARCHAR(255),
    callback_enabled BOOLEAN DEFAULT TRUE,
    
    -- AI配置
    ai_enabled BOOLEAN DEFAULT TRUE,
    ai_config JSONB DEFAULT '{}',
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active',
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    
    -- 统计
    total_messages INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_robots_status ON robots(status);
CREATE INDEX idx_robots_robot_type ON robots(robot_type);
```

#### 4. staff（工作人员表）⭐ 高优先级
```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(50),
    
    -- 权限
    role VARCHAR(50) DEFAULT 'staff',
    permissions JSONB DEFAULT '[]',
    
    -- 工作状态
    status VARCHAR(20) DEFAULT 'offline',
    status_message TEXT,
    
    -- 工作负载
    current_sessions INTEGER DEFAULT 0,
    max_sessions INTEGER DEFAULT 10,
    
    -- 工作时间
    work_schedule JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    
    -- 统计
    total_interventions INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    avg_response_time INTEGER,
    satisfaction_rate DECIMAL(3, 2),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_staff_status ON staff(status);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_email ON staff(email);
```

#### 5. intents（意图表）⭐ 高优先级
```sql
CREATE TABLE intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息
    name VARCHAR(200) NOT NULL,
    description TEXT,
    intent_type VARCHAR(50) NOT NULL,
    
    -- 意图配置
    keywords TEXT[] DEFAULT '{}',
    examples JSONB DEFAULT '[]',
    priority INTEGER DEFAULT 0,
    
    -- AI配置
    ai_model VARCHAR(100),
    embedding_model VARCHAR(100),
    
    -- 统计
    total_messages INTEGER DEFAULT 0,
    confidence_threshold DECIMAL(3, 2) DEFAULT 0.7,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active',
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_intents_intent_type ON intents(intent_type);
CREATE INDEX idx_intents_status ON intents(status);
```

#### 6. collaborations（协同记录表）⭐ 中优先级
```sql
CREATE TABLE collaborations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    
    -- 介入类型
    intervention_type VARCHAR(50) NOT NULL,
    
    -- 介入原因
    intervention_reason VARCHAR(200),
    intervention_reason_detail TEXT,
    
    -- 结果
    resolved BOOLEAN DEFAULT FALSE,
    resolution_time_seconds INTEGER,
    resolution_notes TEXT,
    
    -- AI协同
    ai_assisted BOOLEAN DEFAULT FALSE,
    ai_suggestions JSONB DEFAULT '[]',
    
    -- 满意度
    user_satisfaction_score INTEGER,
    staff_satisfaction_score INTEGER,
    
    -- 时间戳
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_collaborations_session_id ON collaborations(session_id);
CREATE INDEX idx_collaborations_staff_id ON collaborations(staff_id);
CREATE INDEX idx_collaborations_started_at ON collaborations(started_at DESC);
```

#### 7. satisfaction（满意度表）⭐ 中优先级
```sql
CREATE TABLE satisfaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- 满意度评分
    overall_score DECIMAL(3, 2) NOT NULL,
    understanding_score DECIMAL(3, 2),
    helpfulness_score DECIMAL(3, 2),
    response_time_score DECIMAL(3, 2),
    
    -- 评分方式
    score_type VARCHAR(20) NOT NULL,
    
    -- 问题分析
    issue_categories JSONB DEFAULT '[]',
    sentiment VARCHAR(50),
    
    -- 改进建议
    improvement_suggestions TEXT[] DEFAULT '{}',
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_satisfaction_session_id ON satisfaction(session_id);
CREATE INDEX idx_satisfaction_overall_score ON satisfaction(overall_score);
CREATE INDEX idx_satisfaction_created_at ON satisfaction(created_at DESC);
```

#### 8. flow_definitions（流程定义表）⭐ 中优先级
```sql
CREATE TABLE flow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息
    name VARCHAR(200) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL,
    category VARCHAR(100),
    
    -- 流程定义
    definition JSONB NOT NULL,
    
    -- 配置
    config JSONB DEFAULT '{}',
    
    -- 状态
    status VARCHAR(20) DEFAULT 'draft',
    
    -- 发布信息
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES staff(id),
    
    -- 统计
    total_executions INTEGER DEFAULT 0,
    success_rate DECIMAL(3, 2),
    avg_execution_time INTEGER,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flow_definitions_status ON flow_definitions(status);
CREATE INDEX idx_flow_definitions_category ON flow_definitions(category);
```

#### 9. flow_executions（流程执行表）⭐ 中优先级
```sql
CREATE TABLE flow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_definition_id UUID NOT NULL REFERENCES flow_definitions(id) ON DELETE CASCADE,
    
    -- 执行信息
    execution_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'running',
    
    -- 触发信息
    trigger_type VARCHAR(50) NOT NULL,
    trigger_data JSONB DEFAULT '{}',
    
    -- 上下文
    context JSONB DEFAULT '{}',
    variables JSONB DEFAULT '{}',
    
    -- 执行节点
    current_node_id VARCHAR(100),
    execution_path JSONB DEFAULT '[]',
    
    -- 结果
    result JSONB DEFAULT '{}',
    error_message TEXT,
    error_stack TEXT,
    
    -- 性能
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_milliseconds INTEGER
);

CREATE INDEX idx_flow_executions_flow_id ON flow_executions(flow_definition_id);
CREATE INDEX idx_flow_executions_execution_id ON flow_executions(execution_id);
CREATE INDEX idx_flow_executions_status ON flow_executions(status);
CREATE INDEX idx_flow_executions_started_at ON flow_executions(started_at DESC);
```

---

## API接口设计（基于现有结构）

### 保留的API（已有，无需修改）

#### 机器人相关
```
GET /api/admin/robots              - 机器人列表
GET /api/admin/robots/[robotId]    - 机器人详情
POST /api/admin/robots             - 创建机器人
PUT /api/admin/robots/[robotId]    - 更新机器人
DELETE /api/admin/robots/[robotId] - 删除机器人
GET /api/admin/robot-monitoring    - 机器人监控
GET /api/admin/robot-loadbalancing - 负载均衡
```

#### AI相关
```
POST /api/ai-io/route              - AI对话
GET /api/ai/intents                - 意图列表
GET /api/ai/intents/[intentType]   - 意图详情
POST /api/ai/intents/[intentType]  - 创建意图
POST /api/ai/test                  - AI测试
```

#### 告警相关
```
GET /api/alerts/rules              - 告警规则列表
GET /api/alerts/rules/[id]         - 规则详情
POST /api/alerts/rules             - 创建规则
PUT /api/alerts/rules/[id]         - 更新规则
DELETE /api/alerts/rules/[id]      - 删除规则
GET /api/alerts/history            - 告警历史
GET /api/alerts/stats              - 告警统计
```

#### 协同相关
```
GET /api/collab/decision-logs      - 决策日志
GET /api/collab/recommendations    - 优化建议
GET /api/collab/staff-activity     - 工作人员活动
GET /api/collab/stats              - 协同统计
```

#### 流程引擎
```
GET /api/flow-engine/definitions   - 流程定义列表
GET /api/flow-engine/definitions/[id] - 流程定义详情
POST /api/flow-engine/definitions  - 创建流程定义
GET /api/flow-engine/instances     - 流程实例列表
GET /api/flow-engine/instances/[id] - 流程实例详情
```

#### 通知
```
GET /api/notifications/methods     - 通知渠道
POST /api/notifications/send       - 发送通知
POST /api/notifications/test       - 测试通知
```

### 需要新增的API

#### 消息与会话（新增）⭐ 高优先级
```
POST /api/messages                 - 上报消息
GET /api/messages                  - 消息列表
GET /api/messages/[id]             - 消息详情
GET /api/messages/stream           - 消息实时流（SSE）

GET /api/sessions                  - 会话列表
GET /api/sessions/[id]             - 会话详情
GET /api/sessions/[id]/messages    - 会话消息
GET /api/sessions/stream           - 会话实时流（SSE）
GET /api/sessions/active           - 活跃会话
```

#### 工作人员（新增）⭐ 高优先级
```
GET /api/staff                     - 工作人员列表
GET /api/staff/[id]                - 工作人员详情
POST /api/staff                    - 创建工作人员
PUT /api/staff/[id]                - 更新工作人员
GET /api/staff/[id]/sessions       - 工作人员当前会话
GET /api/staff/workload            - 工作负载
```

#### 统计（新增）⭐ 中优先级
```
GET /api/stats/sessions            - 会话统计
GET /api/stats/messages            - 消息统计
GET /api/stats/staff               - 工作人员统计
GET /api/stats/ai                  - AI统计
```

---

## 核心业务流程

### 1. 用户对话流程（基于现有架构）

```
1. 用户发送消息
   ↓
2. 机器人接收消息
   ↓
3. 回调到系统（POST /api/ai-io/route.ts 或 /api/admin/callbacks）
   ↓
4. 消息处理
   - 解析消息内容
   - 提取元数据
   - 保存到 messages 表（新增）
   ↓
5. 并行触发以下服务：
   a. 会话管理（新增）
      - 检查/创建会话（sessions 表）
      - 更新会话统计
   
   b. AI服务集成（已有）
      - 调用 /api/ai-io/route.ts
      - 生成AI回复
      - 保存到 messages 表
   
   c. 风险判断（已有）
      - 保存到 riskMessages 表
      - 触发风险处理流程
   ↓
6. 返回响应给机器人
```

### 2. 工作人员介入流程（基于现有架构）

```
1. 工作人员在群中回复
   ↓
2. 机器人接收消息
   ↓
3. 回调到系统
   ↓
4. 消息处理
   - 识别为工作人员
   - 保存到 messages 表
   ↓
5. 介入判断（已有 collab API）
   - 记录介入事件
   - 更新 sessions 表（staff_intervened = true）
   - 更新风险消息状态（riskMessages.status）
   ↓
6. 协同决策（已有 collab API）
   - 评估介入效果
   ↓
7. 返回响应
```

---

## 部署架构

### 开发环境（单服务）

```
┌─────────────────────────────────────────────────────────┐
│                  开发环境（单服务）                       │
│                                                         │
│  ┌──────────────┐                                      │
│  │  前端+后端   │  端口 5000                            │
│  │  (Next.js)   │                                      │
│  └──────────────┘                                      │
│         ↓                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ PostgreSQL   │  │    Redis     │  │     S3       ││
│  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 生产环境（可选集群）

根据实际需求决定是否拆分服务。

---

## 总结

### 系统特点

1. **基于现有系统**：保留现有API和数据库表，避免大规模重构
2. **渐进式增强**：按需新增缺失功能
3. **最小化改动**：优先整合而非替换
4. **保持灵活性**：服务拆分可选

### 下一步工作

参考改造计划文档。

---

**文档版本**: v2.0（基于现有系统优化版）
**最后更新**: 2025-01-09
**维护者**: WorkTool AI Team

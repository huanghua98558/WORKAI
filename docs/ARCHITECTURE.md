# WorkTool AI 2.1 - 完整系统架构规划

## 📋 目录
- [系统概述](#系统概述)
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
| 消息队列 | Redis | 任务队列 |
| AI服务 | 豆包、OpenAI | 大语言模型 |
| 对象存储 | S3 | 文件存储 |

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
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           接入层（Access Layer）                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │  机器人接入  │  │  Web管理后台 │  │  API集成接口 │                      │
│  │  （群聊/私聊）│  │  （管理员）  │  │  （第三方）  │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
                    ↓                    ↓                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                       数据服务层（信息中心）⭐                               │
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
                    ↓                    ↓                    ↓
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

### 服务拆分策略

| 服务 | 端口 | 职责 | 技术栈 |
|------|------|------|--------|
| **信息中心** | 9001 | 数据收集、处理、存储、查询 | Fastify + PostgreSQL + Redis |
| **应用服务** | 9002 | 流程引擎、机器人管理、监控、告警、报表 | Fastify |
| **前端服务** | 3000 | 所有UI页面，实时展示 | Next.js 16 |

### 数据流向

```
用户消息
   ↓
机器人接入（回调）
   ↓
信息中心
   ├→ 消息收集
   ├→ 发送者识别
   ├→ 会话管理
   ├→ 介入判断
   ├→ AI集成（调用LLM）
   ├→ 协同决策
   ├→ 满意度推断
   └→ 数据存储
        ↓
   数据查询API
        ↓
   前端实时展示（WebSocket）
```

---

## 信息中心设计

### 核心职责

信息中心是整个系统的**数据中枢**，负责：

1. **数据收集**：接收机器人上报的所有消息数据
2. **数据处理**：发送者识别、会话管理、介入判断、协同决策
3. **AI集成**：调用大语言模型生成回复
4. **数据存储**：持久化所有业务数据
5. **数据服务**：提供统一的数据查询API

### 服务架构

```
信息中心（端口 9001）
│
├── 核心服务
│   ├── 消息收集服务（Message Collection Service）
│   │   ├── 接收机器人回调
│   │   ├── 消息解析与验证
│   │   ├── 消息持久化
│   │   └── 触发后续处理流程
│   │
│   ├── 发送者识别服务（Sender Identification Service）
│   │   ├── 消息发送者类型识别（用户/工作人员/系统）
│   │   ├── 工作人员匹配
│   │   └── 用户画像更新
│   │
│   ├── 会话管理服务（Session Management Service）
│   │   ├── 会话创建与更新
│   │   ├── 会话状态维护
│   │   ├── 会话统计（消息数、时长、满意度）
│   │   └── 会话超时处理
│   │
│   ├── 介入判断服务（Intervention Judgment Service）
│   │   ├── 规则引擎（@用户、回复关键词、上下文）
│   │   ├── 置信度评估
│   │   ├── 排除条件过滤（群公告、自动回复）
│   │   └── 介入决策生成
│   │
│   ├── 协同决策服务（Collaborative Decision Service）
│   │   ├── 工作人员分配（负载均衡）
│   │   ├── 介入记录
│   │   ├── 协同效果评估
│   │   └── 优化建议生成
│   │
│   ├── AI服务集成（AI Service Integration）
│   │   ├── 历史消息检索
│   │   ├── 上下文构建
│   │   ├── 意图识别
│   │   ├── Prompt构建
│   │   ├── LLM调用（豆包/OpenAI）
│   │   └── AI回复保存
│   │
│   └── 满意度推断服务（Satisfaction Inference Service）
│       ├── 对话质量分析
│       ├── 满意度评分
│       ├── 问题类型识别
│       └── 改进建议
│
├── 数据访问层
│   ├── MessageRepository
│   ├── SessionRepository
│   ├── RobotRepository
│   ├── StaffRepository
│   ├── IntentRepository
│   ├── CollaborationRepository
│   ├── SatisfactionRepository
│   └── FlowRepository
│
├── 缓存层
│   ├── 会话缓存（Redis）
│   ├── 上下文缓存（Redis）
│   ├── 热点数据缓存（Redis）
│   └── 消息队列（Redis）
│
└── API层
    ├── REST API
    │   ├── POST /api/messages - 消息上报
    │   ├── GET /api/sessions - 会话查询
    │   ├── GET /api/sessions/:id - 会话详情
    │   ├── GET /api/messages - 消息查询
    │   └── GET /api/messages/:id - 消息详情
    │
    └── SSE API
        ├── GET /api/sessions/stream - 会话实时流
        ├── GET /api/messages/stream - 消息实时流
        └── GET /api/alerts/stream - 告警实时流
```

### 核心流程

#### 1. 消息处理流程

```
机器人回调
   ↓
消息收集服务
   ├→ 解析消息内容
   ├→ 提取元数据（时间、发送者、会话ID）
   ├→ 消息验证（格式、完整性）
   └→ 保存到数据库（异步）
        ↓
   触发并行处理
   ├→ 发送者识别（识别发送者类型）
   ├→ 会话管理（更新会话统计）
   ├→ 介入判断（是否需要人工介入）
   └── AI集成（生成AI回复）
        ↓
   结果聚合
   ├→ 保存处理结果
   ├── 更新缓存
   └── 推送前端（SSE）
```

#### 2. AI回复生成流程

```
收到用户消息
   ↓
历史消息检索
   ├→ 查询会话历史消息
   ├→ 按时间倒序排序
   └── 限制最近N条（可配置）
        ↓
上下文构建
   ├→ 系统提示词（从Prompt模板获取）
   ├→ 用户信息（用户画像、历史交互）
   ├→ 会话状态（当前会话状态）
   ├→ 历史上下文（最近N条对话）
   └── 当前消息
        ↓
意图识别（并行）
   ├→ 意图分类（咨询/投诉/建议/闲聊）
   ├→ 关键词提取
   └→ 情绪分析
        ↓
Prompt构建
   ├── 整合所有上下文
   ├── 应用Prompt模板
   └── 生成最终Prompt
        ↓
调用LLM
   ├── 选择模型（根据配置）
   ├── 设置参数（temperature、max_tokens）
   └── 发送请求（流式响应）
        ↓
AI回复处理
   ├── 接收流式响应
   ├── 实时推送到前端
   ├── 完整保存到数据库
   └── 触发满意度推断
```

#### 3. 人工介入判断流程

```
收到工作人员消息
   ↓
发送者识别
   ├→ 识别为工作人员
   ├→ 匹配工作人员ID
   └── 获取工作人员信息
        ↓
消息类型判断
   ├→ 检查是否@用户
   ├→ 检查是否包含介入关键词
   ├→ 检查上下文（是否是回复AI消息）
   └→ 判断消息类型
        ↓
介入判断决策
   ├── 应用置信度阈值
   ├── 评估介入必要性
   └── 生成介入决策
        ↓
排除条件检查
   ├── 是否是群公告
   ├── 是否是自动回复
   └── 是否排除
        ↓
介入执行
   ├── 记录介入事件
   ├── 更新会话状态（人工介入中）
   ├── 暂停AI自动回复
   └── 通知相关工作人员
```

---

## 应用层服务架构

### 核心服务

```
应用服务（端口 9002）
│
├── 流程引擎服务（Flow Engine Service）
│   ├── 流程定义管理
│   │   ├── 创建/更新/删除流程
│   │   ├── 流程版本控制
│   │   ├── 流程验证
│   │   └── 流程发布
│   │
│   ├── 流程执行引擎
│   │   ├── 流程实例创建
│   │   ├── 节点执行调度
│   │   ├── 流程控制（条件、循环、并行）
│   │   ├── 错误处理
│   │   └── 流程完成/终止
│   │
│   └── 流程监控
│       ├── 实时执行状态
│       ├── 执行历史
│       └── 性能统计
│
├── 机器人管理服务（Robot Management Service）
│   ├── 机器人生命周期管理
│   │   ├── 注册机器人
│   │   ├── 配置机器人
│   │   ├── 启用/禁用机器人
│   │   └── 删除机器人
│   │
│   ├── 回调管理
│   │   ├── 生成回调URL
│   │   ├── 验证回调签名
│   │   ├── 回调日志
│   │   └── 回调重试
│   │
│   ├── 负载均衡
│   │   ├── 机器人健康检查
│   │   ├── 负载分配策略
│   │   └── 故障转移
│   │
│   └── 机器人监控
│       ├── 实时状态
│       ├── 消息统计
│       └── 性能指标
│
├── 执行监控服务（Execution Monitoring Service）
│   ├── 流程执行监控
│   │   ├── 实时执行状态
│   │   ├── 执行时间统计
│   │   └── 执行错误追踪
│   │
│   ├── AI服务监控
│   │   ├── 调用次数统计
│   │   ├── 响应时间统计
│   │   ├── 错误率统计
│   │   └── Token使用统计
│   │
│   ├── 消息处理监控
│   │   ├── 处理延迟
│   │   ├── 吞吐量
│   │   └── 处理成功率
│   │
│   └── 任务队列监控
│       ├── 队列长度
│       ├── 任务处理速度
│       └── 积压任务
│
├── 告警服务（Alert Service）
│   ├── 告警规则管理
│   │   ├── 创建/更新/删除规则
│   │   ├── 规则验证
│   │   ├── 规则启用/禁用
│   │   └── 规则测试
│   │
│   ├── 告警检测
│   │   ├── 实时监控指标
│   │   ├── 规则匹配
│   │   ├── 告警触发
│   │   └── 告警级别判定
│   │
│   ├── 告警聚合与压缩
│   │   ├── 相似告警聚合
│   │   ├── 告警去重
│   │   ├── 告警压缩
│   │   └── 告警升级
│   │
│   ├── 告警通知
│   │   ├── 通知渠道（Web、邮件、Webhook）
│   │   ├── 通知模板
│   │   ├── 通知路由
│   │   └── 通知重试
│   │
│   └── 告警管理
│       ├── 告警历史
│       ├── 告警处理
│       ├── 告警统计
│       └── 告警报告
│
└── 报表服务（Report Service）
    ├── 报表定义管理
    │   ├── 创建/更新/删除报表
    │   ├── 报表模板
    │   ├── 报表权限
    │   └── 报表发布
    │
    ├── 报表生成
    │   ├── 数据查询
    │   ├── 数据聚合
    │   ├── 图表生成
    │   └── 报表导出
    │
    └── 报表调度
        ├── 定时报表
        ├── 报表订阅
        └── 报表推送
```

---

## 前端架构设计

### 页面结构

```
前端应用（端口 3000）
│
├── 主页
│   ├── AI模块（AI配置、Prompt管理、模型选择）
│   └── 实时监控（系统概览、会话监控、机器人监控）
│
├── 流程编辑器
│   ├── 流程列表
│   ├── 流程编辑器（可视化设计）
│   ├── 流程版本管理
│   ├── 流程测试
│   └── 流程设置
│
├── 机器人管理
│   ├── 机器人列表
│   ├── 机器人详情
│   ├── 机器人配置（基本信息、回调、AI、负载均衡）
│   ├── 机器人监控
│   └── 负载均衡
│
├── 执行监控
│   ├── 流程执行监控
│   ├── AI服务监控
│   ├── 消息处理监控
│   ├── 任务队列监控
│   └── 执行日志
│
├── 会话分析
│   ├── 会话列表
│   ├── 会话详情
│   ├── 会话统计
│   └── 会话对比
│
├── 协同分析
│   ├── 人工介入分析
│   ├── 工作人员绩效
│   ├── 满意度分析
│   └── 优化建议
│
├── 工作人员管理
│   ├── 工作人员列表
│   ├── 工作人员详情
│   ├── 工作人员配置（基本信息、权限、工作时间）
│   ├── 工作负载
│   └── 工作时间分析
│
├── 告警管理
│   ├── 告警列表
│   ├── 告警规则（规则配置、条件配置、通知配置、聚合配置）
│   ├── 告警历史
│   └── 告警统计
│
├── 数据报表
│   ├── 报表列表
│   ├── 报表生成
│   ├── 报表配置（模板配置、定时报表、报表订阅）
│   └── 报表导出
│
└── 设置中心
    ├── 通知设置（网页通知、声音通知、告警级别）
    └── 通用设置（界面设置、用户偏好、系统信息）
```

### 技术选型

| 功能 | 技术 | 说明 |
|------|------|------|
| 框架 | Next.js 16 | React 19 + App Router + Server Actions |
| UI组件 | shadcn/ui | 基于 Radix UI + Tailwind CSS |
| 状态管理 | React Server Components + Zustand | 服务端组件优先，客户端状态用 Zustand |
| 数据获取 | Server Actions + SWR | 服务端用 Server Actions，客户端用 SWR |
| 实时通信 | WebSocket / SSE | 使用 Fastify WebSocket |
| 流程编辑 | React Flow | 可视化流程编辑器 |
| 图表 | Recharts | 数据可视化 |
| 表单 | React Hook Form + Zod | 表单验证 |
| 日期 | date-fns | 日期处理 |

---

## 数据库设计

### 核心表结构

#### 1. 消息表（messages）

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    robot_id UUID NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
    
    -- 消息内容
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text', -- text, image, audio, video, file
    
    -- 发送者信息
    sender_id VARCHAR(100) NOT NULL, -- 用户ID或工作人员ID
    sender_type VARCHAR(20) NOT NULL, -- user, staff, system, ai
    sender_name VARCHAR(200),
    
    -- 消息类型
    message_type VARCHAR(20) DEFAULT 'message', -- message, system, notification
    
    -- AI相关信息
    ai_model VARCHAR(100),
    ai_provider VARCHAR(50), -- doubao, openai
    ai_response_time INTEGER, -- 响应时间（毫秒）
    ai_tokens_used INTEGER,
    ai_cost DECIMAL(10, 4),
    ai_confidence DECIMAL(3, 2), -- AI置信度 0-1
    
    -- 意图识别
    intent_id UUID REFERENCES intents(id),
    intent_confidence DECIMAL(3, 2),
    emotion VARCHAR(50), -- positive, neutral, negative
    emotion_score DECIMAL(3, 2),
    
    -- 元数据
    metadata JSONB DEFAULT '{}', -- 扩展字段
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 索引
    CONSTRAINT valid_sender_type CHECK (sender_type IN ('user', 'staff', 'system', 'ai')),
    CONSTRAINT valid_message_type CHECK (message_type IN ('message', 'system', 'notification'))
);

CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_robot_id ON messages(robot_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_intent_id ON messages(intent_id);
CREATE INDEX idx_messages_sender_type ON messages(sender_type);
```

#### 2. 会话表（sessions）

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id UUID NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
    
    -- 用户信息
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(200),
    user_avatar_url TEXT,
    user_source VARCHAR(50), -- wechat, telegram, discord等
    
    -- 会话状态
    status VARCHAR(20) DEFAULT 'active', -- active, ended, transferred, archived
    session_type VARCHAR(20) DEFAULT 'private', -- private, group
    
    -- 统计数据
    message_count INTEGER DEFAULT 0,
    user_message_count INTEGER DEFAULT 0,
    staff_message_count INTEGER DEFAULT 0,
    ai_message_count INTEGER DEFAULT 0,
    
    -- 介入信息
    staff_intervened BOOLEAN DEFAULT FALSE,
    staff_id UUID REFERENCES staff(id),
    staff_intervention_count INTEGER DEFAULT 0,
    first_intervention_at TIMESTAMP WITH TIME ZONE,
    
    -- 满意度
    satisfaction_score INTEGER, -- 1-5分
    satisfaction_reason TEXT,
    satisfaction_inferred_at TIMESTAMP WITH TIME ZONE,
    satisfaction_inferred_score DECIMAL(3, 2), -- 推断的满意度 0-1
    
    -- 问题信息
    issue_category VARCHAR(100),
    issue_subcategory VARCHAR(100),
    issue_resolved BOOLEAN DEFAULT FALSE,
    
    -- 时间信息
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER, -- 会话时长（秒）
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    
    -- 索引
    CONSTRAINT valid_status CHECK (status IN ('active', 'ended', 'transferred', 'archived')),
    CONSTRAINT valid_session_type CHECK (session_type IN ('private', 'group')),
    CONSTRAINT valid_satisfaction CHECK (satisfaction_score IS NULL OR (satisfaction_score >= 1 AND satisfaction_score <= 5))
);

CREATE INDEX idx_sessions_robot_id ON sessions(robot_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX idx_sessions_last_message_at ON sessions(last_message_at DESC);
CREATE INDEX idx_sessions_staff_intervened ON sessions(staff_intervened) WHERE staff_intervened = TRUE;
```

#### 3. 机器人表（robots）

```sql
CREATE TABLE robots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息
    name VARCHAR(200) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    robot_type VARCHAR(50) NOT NULL, -- wechat, telegram, discord等
    
    -- 配置
    config JSONB NOT NULL DEFAULT '{}', -- 机器人配置
    
    -- 回调配置
    callback_url TEXT NOT NULL,
    callback_secret VARCHAR(255),
    callback_enabled BOOLEAN DEFAULT TRUE,
    
    -- AI配置
    ai_enabled BOOLEAN DEFAULT TRUE,
    ai_config JSONB DEFAULT '{}', -- AI配置
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active', -- active, disabled, error
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    
    -- 统计
    total_messages INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT valid_status CHECK (status IN ('active', 'disabled', 'error'))
);

CREATE INDEX idx_robots_status ON robots(status);
CREATE INDEX idx_robots_robot_type ON robots(robot_type);
```

#### 4. 工作人员表（staff）

```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(50),
    
    -- 权限
    role VARCHAR(50) DEFAULT 'staff', -- admin, manager, staff
    permissions JSONB DEFAULT '[]', -- 权限列表
    
    -- 工作状态
    status VARCHAR(20) DEFAULT 'offline', -- online, busy, offline
    status_message TEXT,
    
    -- 工作负载
    current_sessions INTEGER DEFAULT 0,
    max_sessions INTEGER DEFAULT 10,
    
    -- 工作时间
    work_schedule JSONB DEFAULT '{}', -- 工作时间配置
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    
    -- 统计
    total_interventions INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    avg_response_time INTEGER, -- 平均响应时间（秒）
    satisfaction_rate DECIMAL(3, 2), -- 满意率 0-1
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE,
    
    -- 约束
    CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'staff')),
    CONSTRAINT valid_status CHECK (status IN ('online', 'busy', 'offline'))
);

CREATE INDEX idx_staff_status ON staff(status);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_email ON staff(email);
```

#### 5. 意图表（intents）

```sql
CREATE TABLE intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息
    name VARCHAR(200) NOT NULL,
    description TEXT,
    intent_type VARCHAR(50) NOT NULL, -- user, system, custom
    
    -- 意图配置
    keywords TEXT[] DEFAULT '{}', -- 关键词列表
    examples JSONB DEFAULT '[]', -- 示例句
    priority INTEGER DEFAULT 0, -- 优先级
    
    -- AI配置
    ai_model VARCHAR(100),
    embedding_model VARCHAR(100),
    
    -- 统计
    total_messages INTEGER DEFAULT 0,
    confidence_threshold DECIMAL(3, 2) DEFAULT 0.7, -- 置信度阈值
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active', -- active, disabled
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT valid_intent_type CHECK (intent_type IN ('user', 'system', 'custom')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'disabled'))
);

CREATE INDEX idx_intents_intent_type ON intents(intent_type);
CREATE INDEX idx_intents_status ON intents(status);
```

#### 6. 协同记录表（collaborations）

```sql
CREATE TABLE collaborations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    
    -- 介入类型
    intervention_type VARCHAR(50) NOT NULL, -- manual, automatic, escalation
    
    -- 介入原因
    intervention_reason VARCHAR(200),
    intervention_reason_detail TEXT,
    
    -- 触发规则
    trigger_rule_id UUID REFERENCES alert_rules(id),
    trigger_rule_name VARCHAR(200),
    
    -- 会话快照
    session_snapshot JSONB DEFAULT '{}', -- 介入时的会话状态
    
    -- 结果
    resolved BOOLEAN DEFAULT FALSE,
    resolution_time_seconds INTEGER,
    resolution_notes TEXT,
    
    -- AI协同
    ai_assisted BOOLEAN DEFAULT FALSE,
    ai_suggestions JSONB DEFAULT '[]',
    
    -- 满意度
    user_satisfaction_score INTEGER, -- 1-5
    staff_satisfaction_score INTEGER, -- 1-5
    
    -- 时间戳
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT valid_intervention_type CHECK (intervention_type IN ('manual', 'automatic', 'escalation')),
    CONSTRAINT valid_satisfaction CHECK (
        user_satisfaction_score IS NULL OR (user_satisfaction_score >= 1 AND user_satisfaction_score <= 5)
    )
);

CREATE INDEX idx_collaborations_session_id ON collaborations(session_id);
CREATE INDEX idx_collaborations_staff_id ON collaborations(staff_id);
CREATE INDEX idx_collaborations_started_at ON collaborations(started_at DESC);
CREATE INDEX idx_collaborations_resolved ON collaborations(resolved) WHERE resolved = FALSE;
```

#### 7. 满意度表（satisfaction）

```sql
CREATE TABLE satisfaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- 满意度评分
    overall_score DECIMAL(3, 2) NOT NULL, -- 0-1
    understanding_score DECIMAL(3, 2), -- 理解程度 0-1
    helpfulness_score DECIMAL(3, 2), -- 有用程度 0-1
    response_time_score DECIMAL(3, 2), -- 响应速度 0-1
    
    -- 评分方式
    score_type VARCHAR(20) NOT NULL, -- explicit, inferred
    
    -- 问题分析
    issue_categories JSONB DEFAULT '[]', -- 问题类型列表
    sentiment VARCHAR(50), -- positive, neutral, negative
    
    -- 改进建议
    improvement_suggestions TEXT[] DEFAULT '{}',
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT valid_score_type CHECK (score_type IN ('explicit', 'explicit')),
    CONSTRAINT valid_scores CHECK (
        overall_score >= 0 AND overall_score <= 1 AND
        understanding_score >= 0 AND understanding_score <= 1 AND
        helpfulness_score >= 0 AND helpfulness_score <= 1 AND
        response_time_score >= 0 AND response_time_score <= 1
    )
);

CREATE INDEX idx_satisfaction_session_id ON satisfaction(session_id);
CREATE INDEX idx_satisfaction_overall_score ON satisfaction(overall_score);
CREATE INDEX idx_satisfaction_created_at ON satisfaction(created_at DESC);
```

#### 8. 工作人员介入表（staff_interventions）

```sql
CREATE TABLE staff_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    
    -- 介入触发条件
    trigger_type VARCHAR(50) NOT NULL, -- mention, keyword, context, manual
    trigger_value VARCHAR(500),
    
    -- 置信度
    confidence DECIMAL(3, 2), -- 介入置信度 0-1
    
    -- 是否排除
    excluded BOOLEAN DEFAULT FALSE,
    exclude_reason VARCHAR(200),
    
    -- 排除条件
    is_announcement BOOLEAN DEFAULT FALSE,
    is_auto_reply BOOLEAN DEFAULT FALSE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT valid_trigger_type CHECK (trigger_type IN ('mention', 'keyword', 'context', 'manual'))
);

CREATE INDEX idx_staff_interventions_session_id ON staff_interventions(session_id);
CREATE INDEX idx_staff_interventions_staff_id ON staff_interventions(staff_id);
CREATE INDEX idx_staff_interventions_message_id ON staff_interventions(message_id);
CREATE INDEX idx_staff_interventions_excluded ON staff_interventions(excluded) WHERE excluded = TRUE;
```

#### 9. 流程定义表（flow_definitions）

```sql
CREATE TABLE flow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息
    name VARCHAR(200) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL,
    category VARCHAR(100),
    
    -- 流程定义
    definition JSONB NOT NULL, -- 流程JSON定义（节点、边、配置）
    
    -- 配置
    config JSONB DEFAULT '{}', -- 流程配置
    
    -- 状态
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    
    -- 发布信息
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES staff(id),
    
    -- 统计
    total_executions INTEGER DEFAULT 0,
    success_rate DECIMAL(3, 2), -- 成功率 0-1
    avg_execution_time INTEGER, -- 平均执行时间（毫秒）
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT unique_name_version UNIQUE (name, version)
);

CREATE INDEX idx_flow_definitions_status ON flow_definitions(status);
CREATE INDEX idx_flow_definitions_category ON flow_definitions(category);
```

#### 10. 流程执行表（flow_executions）

```sql
CREATE TABLE flow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_definition_id UUID NOT NULL REFERENCES flow_definitions(id) ON DELETE CASCADE,
    
    -- 执行信息
    execution_id VARCHAR(100) UNIQUE NOT NULL, -- 执行ID
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed, cancelled
    
    -- 触发信息
    trigger_type VARCHAR(50) NOT NULL, -- manual, message, schedule, event
    trigger_data JSONB DEFAULT '{}', -- 触发数据
    
    -- 上下文
    context JSONB DEFAULT '{}', -- 执行上下文
    variables JSONB DEFAULT '{}', -- 变量
    
    -- 执行节点
    current_node_id VARCHAR(100),
    execution_path JSONB DEFAULT '[]', -- 执行路径
    
    -- 结果
    result JSONB DEFAULT '{}',
    error_message TEXT,
    error_stack TEXT,
    
    -- 性能
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_milliseconds INTEGER,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT valid_status CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT valid_trigger_type CHECK (trigger_type IN ('manual', 'message', 'schedule', 'event'))
);

CREATE INDEX idx_flow_executions_flow_id ON flow_executions(flow_definition_id);
CREATE INDEX idx_flow_executions_execution_id ON flow_executions(execution_id);
CREATE INDEX idx_flow_executions_status ON flow_executions(status);
CREATE INDEX idx_flow_executions_started_at ON flow_executions(started_at DESC);
```

#### 11. 告警规则表（alert_rules）

```sql
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- system, performance, business
    
    -- 规则配置
    rule_type VARCHAR(50) NOT NULL, -- threshold, pattern, anomaly
    conditions JSONB NOT NULL, -- 条件配置
    aggregation_config JSONB DEFAULT '{}', -- 聚合配置
    
    -- 告警级别
    severity VARCHAR(20) NOT NULL, -- info, warning, critical
    
    -- 通知配置
    notification_config JSONB NOT NULL, -- 通知配置
    notification_channels TEXT[] NOT NULL, -- 通知渠道
    
    -- 压缩配置
    dedup_window_seconds INTEGER DEFAULT 300, -- 去重窗口（秒）
    aggregation_window_seconds INTEGER DEFAULT 600, -- 聚合窗口（秒）
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active', -- active, disabled
    
    -- 统计
    total_alerts INTEGER DEFAULT 0,
    total_resolved INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT valid_rule_type CHECK (rule_type IN ('threshold', 'pattern', 'anomaly')),
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'disabled'))
);

CREATE INDEX idx_alert_rules_status ON alert_rules(status);
CREATE INDEX idx_alert_rules_severity ON alert_rules(severity);
CREATE INDEX idx_alert_rules_category ON alert_rules(category);
```

#### 12. 告警历史表（alert_history）

```sql
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    
    -- 告警信息
    alert_key VARCHAR(200) NOT NULL, -- 告警唯一标识
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    details JSONB DEFAULT '{}', -- 详细信息
    
    -- 状态
    status VARCHAR(20) DEFAULT 'open', -- open, acknowledged, resolved, closed
    
    -- 处理信息
    acknowledged_by UUID REFERENCES staff(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES staff(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- 聚合信息
    parent_alert_id UUID REFERENCES alert_history(id),
    related_alerts JSONB DEFAULT '[]', -- 关联告警ID列表
    occurrence_count INTEGER DEFAULT 1, -- 发生次数
    
    -- 时间戳
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical')),
    CONSTRAINT valid_status CHECK (status IN ('open', 'acknowledged', 'resolved', 'closed'))
);

CREATE INDEX idx_alert_history_rule_id ON alert_history(rule_id);
CREATE INDEX idx_alert_history_alert_key ON alert_history(alert_key);
CREATE INDEX idx_alert_history_severity ON alert_history(severity);
CREATE INDEX idx_alert_history_status ON alert_history(status);
CREATE INDEX idx_alert_history_created_at ON alert_history(created_at DESC);
CREATE INDEX idx_alert_history_first_seen_at ON alert_history(first_seen_at DESC);
```

---

## API接口设计

### 信息中心API（端口9001）

#### 消息相关

```typescript
// POST /api/messages
// 上报消息
{
  robot_id: string;
  session_id: string;
  content: string;
  content_type: 'text' | 'image' | 'audio' | 'video' | 'file';
  sender_id: string;
  sender_type: 'user' | 'staff' | 'system' | 'ai';
  sender_name?: string;
  message_type?: 'message' | 'system' | 'notification';
  metadata?: Record<string, any>;
}

Response: {
  id: string;
  status: 'success' | 'error';
  ai_response?: {
    content: string;
    model: string;
    tokens_used: number;
    cost: number;
  };
}

// GET /api/messages
// 查询消息列表
Query: {
  session_id?: string;
  robot_id?: string;
  sender_id?: string;
  sender_type?: string;
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}

Response: {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
}

// GET /api/messages/:id
// 获取消息详情

// GET /api/messages/stream
// 实时消息流（SSE）
Query: {
  session_id?: string;
  robot_id?: string;
}
```

#### 会话相关

```typescript
// GET /api/sessions
// 查询会话列表
Query: {
  robot_id?: string;
  user_id?: string;
  status?: 'active' | 'ended' | 'transferred' | 'archived';
  staff_intervened?: boolean;
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}

Response: {
  sessions: Session[];
  total: number;
}

// GET /api/sessions/:id
// 获取会话详情

// GET /api/sessions/:id/messages
// 获取会话消息

// GET /api/sessions/stream
// 实时会话流（SSE）
```

#### 机器人相关

```typescript
// GET /api/robots
// 获取机器人列表

// GET /api/robots/:id
// 获取机器人详情

// GET /api/robots/:id/stats
// 获取机器人统计
```

#### 工作人员相关

```typescript
// GET /api/staff
// 获取工作人员列表

// GET /api/staff/:id
// 获取工作人员详情

// GET /api/staff/:id/sessions
// 获取工作人员当前会话
```

#### 协同相关

```typescript
// GET /api/collaborations
// 获取协同记录
Query: {
  session_id?: string;
  staff_id?: string;
  start_date?: string;
  end_date?: string;
  resolved?: boolean;
}

// GET /api/collaborations/:id
// 获取协同详情
```

#### 统计相关

```typescript
// GET /api/stats/sessions
// 会话统计
Query: {
  robot_id?: string;
  start_date?: string;
  end_date?: string;
  interval?: 'hour' | 'day' | 'week' | 'month';
}

Response: {
  total_sessions: number;
  active_sessions: number;
  staff_intervened_sessions: number;
  avg_duration: number;
  satisfaction_rate: number;
  time_series: {
    timestamp: string;
    count: number;
  }[];
}

// GET /api/stats/messages
// 消息统计

// GET /api/stats/staff
// 工作人员统计

// GET /api/stats/ai
// AI服务统计
```

### 应用服务API（端口9002）

#### 流程引擎

```typescript
// POST /api/flow-engine/definitions
// 创建流程定义

// GET /api/flow-engine/definitions
// 获取流程定义列表

// GET /api/flow-engine/definitions/:id
// 获取流程定义详情

// PUT /api/flow-engine/definitions/:id
// 更新流程定义

// DELETE /api/flow-engine/definitions/:id
// 删除流程定义

// POST /api/flow-engine/definitions/:id/publish
// 发布流程

// POST /api/flow-engine/instances
// 创建流程实例
{
  flow_definition_id: string;
  trigger_type: 'manual' | 'message' | 'schedule' | 'event';
  trigger_data?: Record<string, any>;
  context?: Record<string, any>;
}

// GET /api/flow-engine/instances
// 获取流程实例列表

// GET /api/flow-engine/instances/:id
// 获取流程实例详情

// POST /api/flow-engine/instances/:id/execute
// 执行流程实例

// POST /api/flow-engine/instances/:id/cancel
// 取消流程实例
```

#### 机器人管理

```typescript
// POST /api/robots
// 创建机器人
{
  name: string;
  description?: string;
  robot_type: string;
  config: Record<string, any>;
}

// GET /api/robots
// 获取机器人列表

// GET /api/robots/:id
// 获取机器人详情

// PUT /api/robots/:id
// 更新机器人

// DELETE /api/robots/:id
// 删除机器人

// POST /api/robots/:id/callback-config
// 配置回调
{
  callback_url: string;
  callback_secret?: string;
  callback_enabled?: boolean;
}

// GET /api/robots/:id/stats
// 获取机器人统计

// GET /api/robots/health-check
// 机器人健康检查
```

#### 告警管理

```typescript
// POST /api/alerts/rules
// 创建告警规则
{
  name: string;
  description?: string;
  category?: string;
  rule_type: 'threshold' | 'pattern' | 'anomaly';
  conditions: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
  notification_config: Record<string, any>;
  notification_channels: string[];
  aggregation_config?: Record<string, any>;
}

// GET /api/alerts/rules
// 获取告警规则列表

// GET /api/alerts/rules/:id
// 获取告警规则详情

// PUT /api/alerts/rules/:id
// 更新告警规则

// DELETE /api/alerts/rules/:id
// 删除告警规则

// POST /api/alerts/rules/:id/enable
// 启用告警规则

// POST /api/alerts/rules/:id/disable
// 禁用告警规则

// GET /api/alerts/history
// 获取告警历史
Query: {
  rule_id?: string;
  severity?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

// GET /api/alerts/history/:id
// 获取告警详情

// POST /api/alerts/history/:id/acknowledge
// 确认告警
{
  staff_id: string;
}

// POST /api/alerts/history/:id/resolve
// 解决告警
{
  staff_id: string;
  resolution_notes?: string;
}

// GET /api/alerts/stats
// 告警统计
```

#### 执行监控

```typescript
// GET /api/monitoring/executions
// 获取执行记录
Query: {
  type?: 'flow' | 'ai' | 'message';
  status?: string;
  start_date?: string;
  end_date?: string;
}

// GET /api/monitoring/executions/:id
// 获取执行详情

// GET /api/monitoring/ai-logs
// 获取AI调用日志
Query: {
  model?: string;
  robot_id?: string;
  start_date?: string;
  end_date?: string;
}

// GET /api/monitoring/health
// 健康检查
Response: {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    information_center: 'healthy' | 'unhealthy';
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    ai_service: 'healthy' | 'unhealthy';
  };
}
```

---

## 核心业务流程

### 1. 用户对话流程

```
1. 用户发送消息
   ↓
2. 机器人接收消息
   ↓
3. 回调到信息中心（POST /api/messages）
   ↓
4. 消息收集服务
   - 解析消息内容
   - 提取元数据
   - 保存消息到数据库
   ↓
5. 并行触发以下服务：
   a. 发送者识别服务
      - 识别发送者类型（user/staff/system）
      - 如果是工作人员，记录工作人员信息
   
   b. 会话管理服务
      - 检查是否已存在会话
      - 如果不存在，创建新会话
      - 更新会话统计（消息数+1，最后消息时间）
      - 更新会话缓存
   
   c. AI服务集成
      - 检索历史消息
      - 构建上下文
      - 调用LLM生成回复
      - 保存AI回复到数据库
      - 推送AI回复到前端（SSE）
      - 触发满意度推断
   ↓
6. 返回响应给机器人
   ↓
7. 机器人发送回复给用户
```

### 2. 工作人员介入流程

```
1. 工作人员在群中回复（@用户或发送消息）
   ↓
2. 机器人接收消息
   ↓
3. 回调到信息中心
   ↓
4. 发送者识别服务
   - 识别为工作人员
   - 匹配工作人员ID
   ↓
5. 介入判断服务
   - 检查是否@用户
   - 检查是否包含介入关键词
   - 检查上下文
   - 应用置信度阈值
   - 排除条件检查（群公告、自动回复）
   ↓
6. 如果需要介入：
   - 记录介入事件
   - 更新会话状态（staff_intervened = true）
   - 增加工作人员介入计数
   - 暂停AI自动回复（可选）
   - 通知相关工作人员
   ↓
7. 协同决策服务
   - 评估介入效果
   - 生成优化建议
   ↓
8. 返回响应
```

### 3. 流程执行流程

```
1. 触发流程
   - 手动触发
   - 消息触发
   - 定时触发
   - 事件触发
   ↓
2. 创建流程实例
   - 加载流程定义
   - 初始化上下文
   - 创建执行记录
   ↓
3. 执行流程
   - 解析流程图
   - 按顺序/并行执行节点
   - 处理节点输入/输出
   - 应用条件逻辑
   - 处理循环/分支
   ↓
4. 监控执行
   - 更新执行状态
   - 记录执行日志
   - 处理错误
   ↓
5. 流程完成
   - 保存执行结果
   - 更新统计
   - 触发后续流程（如果有）
   ↓
6. 返回执行结果
```

### 4. 告警处理流程

```
1. 告警规则检测
   - 定时扫描指标
   - 匹配告警规则
   ↓
2. 触发告警
   - 评估告警级别
   - 聚合相似告警
   - 去重告警
   ↓
3. 生成告警
   - 创建告警记录
   - 保存告警历史
   ↓
4. 发送通知
   - 根据配置选择通知渠道
   - 应用通知模板
   - 发送通知
   - 记录通知日志
   ↓
5. 处理告警
   - 工作人员确认告警
   - 工作人员解决告警
   - 记录解决方案
   ↓
6. 告警关闭
   - 更新告警状态
   - 更新统计
   ↓
7. 生成报告
   - 定期生成告警报告
   - 分析告警趋势
   - 优化告警规则
```

---

## 部署架构

### 开发环境

```
┌─────────────────────────────────────────────────────────┐
│                  开发环境（单机）                        │
│                                                         │
│  ┌──────────────┐                                      │
│  │  前端服务    │  端口 3000                            │
│  │  (Next.js)   │                                      │
│  └──────────────┘                                      │
│         ↓                                               │
│  ┌──────────────┐                                      │
│  │  应用服务    │  端口 9002                            │
│  │  (Fastify)   │                                      │
│  └──────────────┘                                      │
│         ↓                                               │
│  ┌──────────────┐                                      │
│  │  信息中心    │  端口 9001                            │
│  │  (Fastify)   │                                      │
│  └──────────────┘                                      │
│         ↓                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ PostgreSQL   │  │    Redis     │  │     S3       ││
│  │   5432       │  │    6379      │  │    9000      ││
│  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 生产环境

```
┌─────────────────────────────────────────────────────────┐
│                   生产环境（集群）                      │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │   负载均衡器     │  │   反向代理       │           │
│  │   (Nginx)        │  │   (Nginx)        │           │
│  └──────────────────┘  └──────────────────┘           │
│           ↓                     ↓                       │
│  ┌────────────────────────────────────────────┐        │
│  │           前端服务集群（Next.js）           │        │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │        │
│  │  │ 实例1   │  │ 实例2   │  │ 实例3   │   │        │
│  │  │ 端口3000│  │ 端口3000│  │ 端口3000│   │        │
│  │  └─────────┘  └─────────┘  └─────────┘   │        │
│  └────────────────────────────────────────────┘        │
│           ↓                     ↓                       │
│  ┌────────────────────────────────────────────┐        │
│  │         应用服务集群（Fastify）             │        │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │        │
│  │  │ 实例1   │  │ 实例2   │  │ 实例3   │   │        │
│  │  │ 端口9002│  │ 端口9002│  │ 端口9002│   │        │
│  │  └─────────┘  └─────────┘  └─────────┘   │        │
│  └────────────────────────────────────────────┘        │
│           ↓                     ↓                       │
│  ┌────────────────────────────────────────────┐        │
│  │       信息中心集群（Fastify）               │        │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │        │
│  │  │ 实例1   │  │ 实例2   │  │ 实例3   │   │        │
│  │  │ 端口9001│  │ 端口9001│  │ 端口9001│   │        │
│  │  └─────────┘  └─────────┘  └─────────┘   │        │
│  └────────────────────────────────────────────┘        │
│           ↓                     ↓                       │
│  ┌────────────────────────────────────────────┐        │
│  │             数据库层                         │        │
│  │  ┌─────────────┐  ┌─────────────┐          │        │
│  │  │ PostgreSQL  │  │    Redis    │          │        │
│  │  │  主从复制   │  │  哨兵模式   │          │        │
│  │  └─────────────┘  └─────────────┘          │        │
│  └────────────────────────────────────────────┘        │
│           ↓                                             │
│  ┌────────────────────────────────────────────┐        │
│  │              存储层                         │        │
│  │  ┌─────────────┐                            │        │
│  │  │  S3存储     │                            │        │
│  │  └─────────────┘                            │        │
│  └────────────────────────────────────────────┘        │
│                                                         │
│  ┌────────────────────────────────────────────┐        │
│  │             监控告警                         │        │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │        │
│  │  │ Prometheus │  │ Grafana │  │ AlertManager│       │        │
│  │  └─────────┘  └─────────┘  └─────────┘   │        │
│  └────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### 服务配置

```yaml
# information-center/.env
PORT=9001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/worktool

# Redis
REDIS_URL=redis://localhost:6379

# AI Services
DOUBAO_API_KEY=your_api_key
DOUBAO_API_ENDPOINT=https://api.doubao.com

# Object Storage
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=access_key
S3_SECRET_KEY=secret_key
S3_BUCKET=worktool

# CORS
CORS_ORIGIN=https://your-domain.com
```

```yaml
# application-service/.env
PORT=9002
NODE_ENV=production

# Information Center API
INFO_CENTER_URL=http://localhost:9001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/worktool

# Redis
REDIS_URL=redis://localhost:6379
```

```yaml
# frontend/.env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com
```

---

## 总结

### 系统特点

1. **清晰的分层架构**：用户层 → 接入层 → 数据服务层（信息中心） → 应用层 → 前端层
2. **独立的信息中心**：作为数据中枢，负责所有数据收集、处理、存储、查询
3. **模块化设计**：各服务职责明确，易于扩展和维护
4. **实时性支持**：WebSocket/SSE实时推送
5. **高可用性**：集群部署，负载均衡
6. **监控告警**：全方位监控，实时告警

### 技术亮点

1. **Drizzle ORM**：类型安全的数据库操作
2. **Fastify**：高性能后端框架
3. **Next.js 16**：React Server Components，性能优化
4. **shadcn/ui**：现代化UI组件库
5. **流程引擎**：可视化流程设计，灵活的业务编排
6. **AI集成**：豆包大语言模型，智能对话
7. **协同决策**：智能介入判断，优化人机协作

### 下一步工作

1. 实现信息中心数据库表结构
2. 实现信息中心核心服务逻辑
3. 实现应用层各服务
4. 实现前端各模块页面
5. 完善监控告警系统
6. 编写测试用例
7. 性能优化
8. 部署上线

---

**文档版本**: v1.0
**最后更新**: 2025-01-09
**维护者**: WorkTool AI Team

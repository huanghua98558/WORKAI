# WorkTool AI 机器人系统 API 架构设计文档

## 📋 目录

1. [系统架构概览](#系统架构概览)
2. [核心模块设计](#核心模块设计)
3. [API 接口清单](#api-接口清单)
4. [数据流与联动机制](#数据流与联动机制)
5. [错误处理规范](#错误处理规范)

---

## 1. 系统架构概览

### 1.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (Next.js)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ 机器人管理   │ │ 分组管理     │ │ 角色管理     │           │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘           │
│         │               │               │                   │
│         └───────────────┼───────────────┘                   │
│                         ▼                                   │
│              ┌─────────────────┐                            │
│              │  API Gateway    │                            │
│              │  (Next.js API)   │                            │
│              └────────┬────────┘                            │
└───────────────────────┼────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│   后端服务       │          │   数据库         │
│  (Fastify @5001) │◄────────►│  (PostgreSQL)    │
├──────────────────┤          ├──────────────────┤
│ 机器人管理       │          │ robots           │
│ 分组管理         │          │ robot_groups     │
│ 角色管理         │          │ robot_roles      │
│ 指令管理         │          │ robot_commands   │
│ 负载均衡         │          │ robot_load_balancing│
│ 性能监控         │          │ robot_performance_metrics│
└──────────────────┘          └──────────────────┘
```

### 1.2 数据库表关系

```
robot_groups (1) ─────┐
                      │ (1:N)
                      ├──────────────> robots (N)
                      │                  │
robot_roles (1) ─────┘                  │
                                         │ (1:N)
                                         ▼
                                    sessions (N)
                                         │
                                         │ (1:N)
                                         ▼
                                    messages (N)

robot_commands (1) ──┐
                     │ (1:N)
robot_command_queue  ├──────────────> robots (N)
robot_load_balancing│
robot_performance_metrics│
```

---

## 2. 核心模块设计

### 2.1 模块列表

| 模块 | 功能描述 | 优先级 |
|------|---------|-------|
| **机器人管理** | 机器人的CRUD、状态检测、配置验证 | 🔴 P0 |
| **分组管理** | 机器人分组的CRUD、权限控制 | 🔴 P0 |
| **角色管理** | 机器人角色的CRUD、权限配置 | 🔴 P0 |
| **指令管理** | 发送指令、队列管理、执行追踪 | 🟡 P1 |
| **负载均衡** | 会话分配、健康检查、性能评估 | 🟡 P1 |
| **性能监控** | 性能指标收集、历史记录、分析 | 🟢 P2 |
| **日志追踪** | 操作日志、错误日志、调试信息 | 🟢 P2 |

---

## 3. API 接口清单

### 3.1 机器人管理 API (`/api/admin/robots`)

#### 基础 CRUD

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/admin/robots` | 获取机器人列表 | admin |
| GET | `/api/admin/robots/:id` | 获取机器人详情 | admin |
| POST | `/api/admin/robots` | 创建机器人 | admin |
| PUT | `/api/admin/robots/:id` | 更新机器人 | admin |
| DELETE | `/api/admin/robots/:id` | 删除机器人 | admin |
| PATCH | `/api/admin/robots/:id/status` | 更新机器人状态 | admin |

#### 查询接口

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/api/admin/robots/by-robot-id/:robotId` | 根据robotId查询 | robotId |
| GET | `/api/admin/robots/by-group/:groupId` | 获取分组的机器人 | groupId |
| GET | `/api/admin/robots/by-role/:roleId` | 获取角色的机器人 | roleId |

#### 操作接口

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| POST | `/api/admin/robots/:id/validate` | 验证机器人配置 | - |
| POST | `/api/admin/robots/:id/test` | 测试机器人连接 | - |
| POST | `/api/admin/robots/:id/check-status` | 检查机器人状态 | - |
| POST | `/api/admin/robots/check-status-all` | 检查所有机器人状态 | - |
| POST | `/api/admin/robots/:id/generate-urls` | 重新生成回调地址 | - |

#### 批量操作

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/admin/robots/batch-enable` | 批量启用 |
| POST | `/api/admin/robots/batch-disable` | 批量禁用 |
| POST | `/api/admin/robots/batch-delete` | 批量删除 |

---

### 3.2 分组管理 API (`/api/admin/robot-groups`)

#### 基础 CRUD

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/robot-groups` | 获取分组列表 |
| GET | `/api/admin/robot-groups/:id` | 获取分组详情 |
| POST | `/api/admin/robot-groups` | 创建分组 |
| PUT | `/api/admin/robot-groups/:id` | 更新分组 |
| DELETE | `/api/admin/robot-groups/:id` | 删除分组 |

#### 关联查询

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/robot-groups/:id/robots` | 获取分组的机器人 |
| GET | `/api/admin/robot-groups/:id/statistics` | 获取分组统计信息 |

---

### 3.3 角色管理 API (`/api/admin/robot-roles`)

#### 基础 CRUD

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/robot-roles` | 获取角色列表 |
| GET | `/api/admin/robot-roles/:id` | 获取角色详情 |
| POST | `/api/admin/robot-roles` | 创建角色 |
| PUT | `/api/admin/robot-roles/:id` | 更新角色 |
| DELETE | `/api/admin/robot-roles/:id` | 删除角色 |

#### 权限管理

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/robot-roles/:id/robots` | 获取角色的机器人 |
| GET | `/api/admin/robot-roles/permissions` | 获取所有可用权限 |

---

### 3.4 指令管理 API (`/api/admin/robot-commands`)

#### 指令操作

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/robot-commands` | 获取指令列表 |
| GET | `/api/admin/robot-commands/:id` | 获取指令详情 |
| POST | `/api/admin/robot-commands` | 创建指令 |
| PUT | `/api/admin/robot-commands/:id` | 更新指令 |
| DELETE | `/api/admin/robot-commands/:id` | 删除指令 |
| POST | `/api/admin/robot-commands/:id/cancel` | 取消指令 |
| POST | `/api/admin/robot-commands/:id/retry` | 重试指令 |

#### 队列管理

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/robot-commands/queue` | 获取队列状态 |
| POST | `/api/admin/robot-commands/queue/pause` | 暂停队列 |
| POST | `/api/admin/robot-commands/queue/resume` | 恢复队列 |
| POST | `/api/admin/robot-commands/queue/clear` | 清空队列 |

---

### 3.5 负载均衡 API (`/api/admin/robot-loadbalancing`)

#### 负载均衡

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/robot-loadbalancing` | 获取负载均衡状态 |
| GET | `/api/admin/robot-loadbalancing/:robotId` | 获取机器人负载详情 |
| POST | `/api/admin/robot-loadbalancing/:robotId/adjust` | 调整权重 |
| GET | `/api/admin/robot-loadbalancing/assign` | 自动分配会话 |

---

### 3.6 性能监控 API (`/api/admin/robot-monitoring`)

#### 实时监控

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/robot-monitoring/realtime` | 实时性能数据 |
| GET | `/api/admin/robot-monitoring/summary` | 监控摘要 |
| GET | `/api/admin/robot-monitoring/metrics` | 获取指标数据 |
| GET | `/api/admin/robot-monitoring/trends` | 趋势分析 |

#### 历史记录

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/robot-monitoring/history` | 历史数据 |
| GET | `/api/admin/robot-monitoring/callbacks` | 回调日志 |
| GET | `/api/admin/robot-monitoring/errors` | 错误日志 |

---

### 3.7 统计分析 API

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/robot-stats/overview` | 总体统计 |
| GET | `/api/admin/robot-stats/by-group` | 按分组统计 |
| GET | `/api/admin/robot-stats/by-role` | 按角色统计 |
| GET | `/api/admin/robot-stats/active` | 活跃度排行 |

---

## 4. 数据流与联动机制

### 4.1 添加机器人流程

```
前端表单
  ↓ POST /api/admin/robots
Next.js API (验证数据)
  ↓ 转发
后端服务 (robot.service.addRobot)
  ├─ 验证配置 (validateRobotConfig)
  ├─ 生成URLs (generateRobotUrls)
  └─ 插入数据库
  ↓
数据库 (robots表)
  ↓
返回完整机器人数据
  ↓
前端列表刷新
```

### 4.2 消息处理流程

```
WorkTool 回调
  ↓ POST /api/worktool/callback/message
后端服务解析 robotId
  ↓ 查找机器人
数据库查询 robots
  ↓
获取机器人配置 (分组、角色)
  ↓
会话分配 (负载均衡)
  ↓
AI 处理
  ↓
回复消息
  ↓
记录日志
```

### 4.3 负载均衡流程

```
新会话到达
  ↓
查询 robot_load_balancing
  ├─ 过滤可用机器人 (is_available = true)
  ├─ 按健康评分排序
  ├─ 按权重筛选
  └─ 选择最优机器人
  ↓
更新负载均衡数据 (current_sessions++)
  ↓
关联会话与机器人
  ↓
返回分配结果
```

---

## 5. 错误处理规范

### 5.1 标准响应格式

#### 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

#### 错误响应
```json
{
  "code": -1,
  "message": "错误描述",
  "error": "详细错误信息",
  "timestamp": "2026-02-06T01:00:00Z"
}
```

### 5.2 错误码定义

| 错误码 | 说明 | HTTP状态码 |
|--------|------|-----------|
| 0 | 成功 | 200 |
| -1 | 通用错误 | 500 |
| 1001 | 参数验证失败 | 400 |
| 1002 | 机器人不存在 | 404 |
| 1003 | 机器人ID已存在 | 400 |
| 1004 | 配置验证失败 | 400 |
| 2001 | 分组不存在 | 404 |
| 2002 | 分组名称已存在 | 400 |
| 3001 | 角色不存在 | 404 |
| 3002 | 角色名称已存在 | 400 |
| 4001 | 指令不存在 | 404 |
| 4002 | 指令已执行 | 400 |
| 5001 | 数据库错误 | 500 |
| 5002 | 网络请求失败 | 502 |

---

## 6. 数据库Schema

### 6.1 核心表结构

#### robots 表
```sql
CREATE TABLE robots (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  robot_id VARCHAR(64) UNIQUE NOT NULL,
  api_base_url VARCHAR(255) NOT NULL,
  group_id VARCHAR(36),
  role_id VARCHAR(36),
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'unknown',
  last_check_at TIMESTAMP,
  last_error TEXT,
  -- 回调地址 (5个)
  message_callback_url VARCHAR(500),
  result_callback_url VARCHAR(500),
  qrcode_callback_url VARCHAR(500),
  online_callback_url VARCHAR(500),
  offline_callback_url VARCHAR(500),
  -- 通讯地址 (8个)
  send_message_api VARCHAR(500),
  update_api VARCHAR(500),
  get_info_api VARCHAR(500),
  online_api VARCHAR(500),
  online_infos_api VARCHAR(500),
  list_raw_message_api VARCHAR(500),
  raw_msg_list_api VARCHAR(500),
  qa_log_list_api VARCHAR(500),
  -- 其他字段
  capabilities JSONB,
  priority INTEGER DEFAULT 10,
  max_concurrent_sessions INTEGER DEFAULT 100,
  current_session_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### robot_groups 表
```sql
CREATE TABLE robot_groups (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7),
  icon VARCHAR(50),
  priority INTEGER DEFAULT 10,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### robot_roles 表
```sql
CREATE TABLE robot_roles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### robot_commands 表
```sql
CREATE TABLE robot_commands (
  id VARCHAR(36) PRIMARY KEY,
  robot_id VARCHAR(255) NOT NULL,
  command_type VARCHAR(50) NOT NULL,
  command_data JSONB NOT NULL,
  priority INTEGER DEFAULT 10,
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### robot_load_balancing 表
```sql
CREATE TABLE robot_load_balancing (
  id VARCHAR(36) PRIMARY KEY,
  robot_id VARCHAR(255) UNIQUE NOT NULL,
  current_sessions INTEGER DEFAULT 0,
  max_sessions INTEGER DEFAULT 100,
  cpu_usage DECIMAL(5,2),
  memory_usage DECIMAL(5,2),
  avg_response_time INTEGER,
  success_rate DECIMAL(5,4),
  error_count INTEGER DEFAULT 0,
  health_score DECIMAL(5,2) DEFAULT 100,
  is_available BOOLEAN DEFAULT true,
  last_updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. 实施计划

### Phase 1: 核心功能 (P0)
- [ ] 执行数据库迁移（创建缺失的表）
- [ ] 实现机器人管理 API
- [ ] 实现分组管理 API
- [ ] 实现角色管理 API
- [ ] 更新前端页面

### Phase 2: 扩展功能 (P1)
- [ ] 实现指令管理 API
- [ ] 实现负载均衡 API
- [ ] 实现机器人状态检测
- [ ] 优化错误处理

### Phase 3: 监控与分析 (P2)
- [ ] 实现性能监控 API
- [ ] 实现统计分析 API
- [ ] 添加日志追踪
- [ ] 性能优化

---

## 8. 测试用例

### 8.1 机器人管理测试
- [ ] 创建机器人
- [ ] 查询机器人列表
- [ ] 更新机器人信息
- [ ] 删除机器人
- [ ] 批量操作

### 8.2 联动测试
- [ ] 机器人创建后自动生成回调地址
- [ ] 机器人状态检测
- [ ] 分组关联查询
- [ ] 角色权限控制

---

**文档版本**: v1.0
**最后更新**: 2026-02-06
**维护者**: WorkTool AI Team

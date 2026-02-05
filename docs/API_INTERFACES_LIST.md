# WorkTool AI 系统API接口清单

## 📋 接口总览

- **新建接口（9个）**：告警分析（5个）+ 监控（4个）
- **老接口（通过proxy代理）**：5个核心接口
- **其他老接口**：机器人、会话、告警配置等

---

## 🆕 新建接口（9个）

### 告警分析接口（5个）

#### 1. `/api/alerts/analytics/overview`
**功能**：告警概览统计
- 获取告警总数、待处理、已处理、已升级数量
- 获取Critical/Warning/Info各级别数量
- 获取告警级别分布百分比
- 获取影响范围（群组数、用户数、会话数）
- 获取关键指标（响应时间、升级次数）

**数据返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 10,
    "pending": 5,
    "handled": 3,
    "ignored": 0,
    "sent": 0,
    "critical": 2,
    "warning": 3,
    "info": 5,
    "escalated": 1,
    "avgEscalationCount": 0.5,
    "maxEscalationCount": 2,
    "affectedGroups": 3,
    "affectedUsers": 5,
    "affectedChats": 4,
    "avgResponseTimeSeconds": 5.2,
    "levelDistribution": [
      {"level": "critical", "count": 2, "percentage": "20.0%"},
      {"level": "warning", "count": 3, "percentage": "30.0%"},
      {"level": "info", "count": 5, "percentage": "50.0%"}
    ]
  }
}
```

---

#### 2. `/api/alerts/analytics/trends`
**功能**：每日告警趋势
- 获取指定时间范围内的每日告警统计
- 支持参数：`days`（天数，默认7天）
- 返回趋势数据和统计信息

**数据返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "timeRange": "7天",
    "trends": [
      {"date": "2026-01-30", "total": 5, "pending": 3, "handled": 2, "critical": 1, "warning": 2, "info": 2, "escalated": 0, "avgResponseTimeSeconds": 4.5},
      {"date": "2026-01-31", "total": 8, "pending": 4, "handled": 3, "critical": 2, "warning": 3, "info": 3, "escalated": 1, "avgResponseTimeSeconds": 5.8}
    ],
    "stats": {
      "totalDays": 7,
      "totalAlerts": 50,
      "avgPerDay": 7,
      "maxDay": {"date": "2026-01-31", "total": 10}
    }
  }
}
```

---

#### 3. `/api/alerts/analytics/by-group`
**功能**：按分组统计告警
- 获取每个告警分组的统计信息
- 获取Top活跃群组排行
- 支持参数：`startDate`、`endDate`、`limit`

**数据返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "groups": [
      {"id": "xxx", "name": "客户群", "code": "customer_group", "color": "#3b82f6", "total": 5, "pending": 2, "handled": 2, "critical": 1, "warning": 2, "info": 2, "escalated": 0},
      {"id": "yyy", "name": "内部群", "code": "internal_group", "color": "#10b981", "total": 3, "pending": 1, "handled": 1, "critical": 0, "warning": 1, "info": 2, "escalated": 0}
    ],
    "topGroups": [
      {"rank": 1, "groupChatId": "group1", "groupName": "测试群", "totalAlerts": 5, "criticalAlerts": 1, "escalatedAlerts": 0, "affectedUsers": 3}
    ],
    "stats": {
      "totalGroups": 4,
      "activeGroups": 2,
      "totalAlerts": 8
    }
  }
}
```

---

#### 4. `/api/alerts/analytics/top-users`
**功能**：Top用户告警排行
- 获取告警最多的用户排行
- 支持参数：`days`（天数）、`limit`（数量）

**数据返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "users": [
      {"rank": 1, "userId": "user1", "userName": "张三", "totalAlerts": 5, "criticalAlerts": 1, "escalatedAlerts": 0, "escalationRate": "0.00"},
      {"rank": 2, "userId": "user2", "userName": "李四", "totalAlerts": 3, "criticalAlerts": 0, "escalatedAlerts": 0, "escalationRate": "0.00"}
    ],
    "stats": {
      "totalUsers": 2,
      "totalAlerts": 8,
      "totalCritical": 1,
      "totalEscalated": 0
    },
    "timeRange": "7天"
  }
}
```

---

#### 5. `/api/alerts/analytics/top-groups`
**功能**：Top群组告警排行
- 获取告警最多的群组排行
- 支持参数：`days`（天数）、`limit`（数量）

**数据返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "groups": [
      {"rank": 1, "groupChatId": "group1", "groupName": "测试群", "totalAlerts": 5, "criticalAlerts": 1, "escalatedAlerts": 0, "affectedUsers": 3, "escalationRate": "0.00"},
      {"rank": 2, "groupChatId": "group2", "groupName": "开发群", "totalAlerts": 3, "criticalAlerts": 0, "escalatedAlerts": 0, "affectedUsers": 2, "escalationRate": "0.00"}
    ],
    "stats": {
      "totalGroups": 2,
      "totalAlerts": 8,
      "totalCritical": 1,
      "totalEscalated": 0,
      "totalAffectedUsers": 5
    },
    "timeRange": "7天"
  }
}
```

---

### 监控接口（4个）

#### 6. `/api/monitoring/summary`
**功能**：今日监控摘要
- 获取今日回调统计（总数、成功、失败、成功率）
- 获取AI响应统计
- 获取活跃会话数
- 获取AI错误数、回调错误数

**数据返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "date": "2026-02-05",
    "executions": {
      "total": 100,
      "success": 95,
      "error": 3,
      "processing": 2,
      "successRate": "95.00"
    },
    "ai": {
      "total": 80,
      "success": 76,
      "error": 2,
      "successRate": "95.00"
    },
    "sessions": {
      "active": 10,
      "total": 50
    },
    "aiErrors": 2,
    "totalCallbacks": 100,
    "aiSuccessRate": "95.00",
    "systemMetrics": {
      "callbackReceived": 100,
      "callbackProcessed": 95,
      "callbackError": 3,
      "aiRequests": 80,
      "aiErrors": 2
    }
  }
}
```

---

#### 7. `/api/monitoring/robots-status`
**功能**：机器人状态摘要
- 获取所有机器人的状态
- 显示消息处理数、错误数、成功率
- 显示健康状态

**数据返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "robots": [
      {
        "id": "xxx",
        "robotId": "robot-001",
        "name": "客服机器人",
        "nickname": "客服助手",
        "status": "online",
        "isActive": true,
        "messagesProcessed": 50,
        "errors": 2,
        "successRate": 96,
        "healthStatus": "healthy",
        "lastCheckTime": "2026-02-05T21:10:41.957Z"
      }
    ],
    "stats": {
      "totalRobots": 3,
      "onlineRobots": 2,
      "offlineRobots": 0,
      "unknownRobots": 1,
      "healthyRobots": 3,
      "warningRobots": 0,
      "criticalRobots": 0,
      "totalMessages": 150,
      "totalErrors": 5,
      "avgSuccessRate": "96.67"
    }
  }
}
```

---

#### 8. `/api/monitoring/active-groups`
**功能**：活跃群组排行
- 获取最活跃的群组
- 支持参数：`limit`（数量）、`date`（日期）

**数据返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "groups": [
      {
        "rank": 1,
        "groupId": "group1",
        "totalMessages": 50,
        "activityLevel": "high"
      },
      {
        "rank": 2,
        "groupId": "group2",
        "totalMessages": 30,
        "activityLevel": "medium"
      }
    ],
    "stats": {
      "totalGroups": 2,
      "totalMessages": 80,
      "avgMessages": 40,
      "highActivity": 1,
      "mediumActivity": 1,
      "lowActivity": 0
    }
  }
}
```

---

#### 9. `/api/monitoring/active-users`
**功能**：活跃用户排行
- 获取最活跃的用户
- 支持参数：`limit`（数量）、`date`（日期）

**数据返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "users": [
      {
        "rank": 1,
        "userId": "user1",
        "totalMessages": 20,
        "groupCount": 2,
        "groups": ["group1", "group2"],
        "avgMessagesPerGroup": 10,
        "activityLevel": "high"
      },
      {
        "rank": 2,
        "userId": "user2",
        "totalMessages": 15,
        "groupCount": 1,
        "groups": ["group1"],
        "avgMessagesPerGroup": 15,
        "activityLevel": "medium"
      }
    ],
    "stats": {
      "totalUsers": 2,
      "totalMessages": 35,
      "totalGroups": 2,
      "avgMessages": 17.5,
      "highActivity": 1,
      "mediumActivity": 1,
      "lowActivity": 0
    }
  }
}
```

---

## 🔴 老接口（通过proxy代理）（5个核心）

### 1. `/api/proxy/admin/monitor/summary`
**功能**：监控摘要（老版本）
- 通过代理调用后端服务

---

### 2. `/api/proxy/admin/alerts/stats`
**功能**：告警统计（老版本）
- 通过代理调用后端服务

---

### 3. `/api/proxy/admin/sessions/active`
**功能**：活跃会话列表
- 获取当前活跃的会话
- 返回会话详情（用户、群组、消息）

**数据返回示例**：
```json
{
  "code": 0,
  "data": [
    {
      "sessionId": "session1",
      "userId": "user1",
      "groupId": "group1",
      "userName": "张三",
      "groupName": "测试群",
      "status": "auto",
      "lastActiveTime": "2026-02-05T13:00:00Z",
      "messageCount": 10,
      "lastMessage": "你好"
    }
  ]
}
```

---

### 4. `/api/proxy/admin/robots`
**功能**：机器人列表
- 获取所有机器人信息
- 返回机器人详情（名称、状态、IP等）

---

### 5. `/api/proxy/admin/callbacks`
**功能**：回调地址配置
- 获取或设置回调地址

---

## 📊 其他老接口

### 机器人管理
- `/api/admin/robots` - 机器人CRUD
- `/api/admin/robots/[robotId]` - 单个机器人详情
- `/api/admin/robots/check-status/[robotId]` - 检查机器人状态
- `/api/admin/robot-commands` - 机器人命令
- `/api/admin/robot-groups` - 机器人分组

### 告警配置
- `/api/alerts/rules` - 告警规则管理
- `/api/alerts/history` - 告警历史
- `/api/alerts/stats` - 告警统计（老版本）

### 会话管理
- `/api/messages` - 消息列表
- `/api/messages/[id]` - 单条消息详情
- `/api/messages/[id]/history` - 消息历史
- `/api/messages/stream` - 消息流式

### 协同分析
- `/api/collab/decision-logs` - 决策日志
- `/api/collab/recommendations` - 推荐列表
- `/api/collab/staff-activity` - 员工活动
- `/api/collab/stats` - 协同统计

### 流程引擎
- `/api/flow-engine/definitions` - 流程定义
- `/api/flow-engine/instances` - 流程实例

---

## 🔄 新老接口对比

| 功能 | 老接口（proxy） | 新接口 | 状态 |
|------|----------------|--------|------|
| 监控摘要 | `/api/proxy/admin/monitor/summary` | `/api/monitoring/summary` | ✅ 新接口已创建 |
| 告警统计 | `/api/proxy/admin/alerts/stats` | `/api/alerts/analytics/overview` | ✅ 新接口已创建 |
| 机器人状态 | `/api/proxy/admin/robots` | `/api/monitoring/robots-status` | ✅ 新接口已创建 |
| 活跃群组 | ❌ 无 | `/api/monitoring/active-groups` | ✅ 新接口已创建 |
| 活跃用户 | ❌ 无 | `/api/monitoring/active-users` | ✅ 新接口已创建 |
| 告警趋势 | ❌ 无 | `/api/alerts/analytics/trends` | ✅ 新接口已创建 |
| 分组统计 | ❌ 无 | `/api/alerts/analytics/by-group` | ✅ 新接口已创建 |
| Top用户 | ❌ 无 | `/api/alerts/analytics/top-users` | ✅ 新接口已创建 |
| Top群组 | ❌ 无 | `/api/alerts/analytics/top-groups` | ✅ 新接口已创建 |
| 活跃会话 | `/api/proxy/admin/sessions/active` | ❌ 暂无 | 保留老接口 |

---

## 📌 当前使用情况

### ✅ 主页面（page.tsx）已迁移到新接口

**已修改的接口调用：**
1. `loadRobots()` - 现在调用 `/api/monitoring/robots-status`（新接口）✅
2. `loadData()` - 现在调用 `/api/monitoring/summary`（新接口）✅
3. `loadData()` - 现在调用 `/api/alerts/analytics/overview`（新接口）✅

**保留的老接口（暂未迁移）：**
1. `/api/proxy/admin/sessions/active` - 活跃会话（新接口暂未实现，需要保留）
2. `/api/proxy/admin/callbacks` - 回调地址配置（保留，配置功能不需要迁移）

**已删除的跨域请求：**
1. ~~`http://localhost:5001/api/alerts/stats`~~ - 已删除，使用新接口替代

### 新仪表盘页面（new-dashboard/page.tsx）

**✅ 已使用新接口：**
1. `/api/monitoring/summary` - 监控摘要
2. `/api/monitoring/robots-status` - 机器人状态
3. `/api/monitoring/active-groups` - 活跃群组
4. `/api/monitoring/active-users` - 活跃用户
5. `/api/alerts/analytics/overview` - 告警概览
6. `/api/alerts/analytics/trends` - 告警趋势
7. `/api/alerts/analytics/by-group` - 分组统计
8. `/api/alerts/analytics/top-users` - Top用户
9. `/api/alerts/analytics/top-groups` - Top群组

---

## 🎯 迁移状态总结

| 功能 | 老接口（proxy） | 新接口 | 迁移状态 |
|------|----------------|--------|------|
| 监控摘要 | `/api/proxy/admin/monitor/summary` | `/api/monitoring/summary` | ✅ 已迁移 |
| 告警统计 | `/api/proxy/admin/alerts/stats` | `/api/alerts/analytics/overview` | ✅ 已迁移 |
| 机器人状态 | `/api/proxy/admin/robots` | `/api/monitoring/robots-status` | ✅ 已迁移 |
| 活跃群组 | ❌ 无 | `/api/monitoring/active-groups` | ✅ 新接口已实现 |
| 活跃用户 | ❌ 无 | `/api/monitoring/active-users` | ✅ 新接口已实现 |
| 告警趋势 | ❌ 无 | `/api/alerts/analytics/trends` | ✅ 新接口已实现 |
| 分组统计 | ❌ 无 | `/api/alerts/analytics/by-group` | ✅ 新接口已实现 |
| Top用户 | ❌ 无 | `/api/alerts/analytics/top-users` | ✅ 新接口已实现 |
| Top群组 | ❌ 无 | `/api/alerts/analytics/top-groups` | ✅ 新接口已实现 |
| 活跃会话 | `/api/proxy/admin/sessions/active` | ❌ 暂无 | ⚠️ 保留老接口（新接口待开发） |
| 回调配置 | `/api/proxy/admin/callbacks` | ❌ 暂无 | ⚠️ 保留老接口（配置功能） |

---

## ✅ 完成的工作

### 1. 主页面（src/app/page.tsx）接口迁移
- ✅ 修改 `loadRobots()` 函数，从 `/api/proxy/admin/robots` 迁移到 `/api/monitoring/robots-status`
- ✅ 修改 `loadData()` 函数，从 `/api/proxy/admin/monitor/summary` 迁移到 `/api/monitoring/summary`
- ✅ 修改 `loadData()` 函数，从 `/api/proxy/admin/alerts/stats` 迁移到 `/api/alerts/analytics/overview`
- ✅ 删除跨域请求 `http://localhost:5001/api/alerts/stats`
- ✅ 保留 `/api/proxy/admin/sessions/active`（活跃会话，新接口暂未实现）
- ✅ 保留 `/api/proxy/admin/callbacks`（回调配置）

### 2. 新仪表盘页面（src/app/new-dashboard/page.tsx）
- ✅ 已全部使用新接口（9个新接口）

### 3. 接口测试验证
- ✅ `/api/monitoring/summary` - 测试通过，返回正常数据
- ✅ `/api/monitoring/robots-status` - 测试通过，返回正常数据
- ✅ `/api/alerts/analytics/overview` - 测试通过，返回正常数据

---

## 📝 下一步建议

1. **实现活跃会话新接口**：创建 `/api/monitoring/active-sessions` 接口，替代 `/api/proxy/admin/sessions/active`
2. **逐步废弃老接口**：在新接口稳定后，可以考虑废弃或标记老接口为deprecated
3. **更新API文档**：在API文档中标注新老接口状态
4. **性能优化**：可以进一步优化新接口的查询性能，增加缓存机制

---

## 📝 接口路径总结

### 新接口（9个）
```
/api/alerts/analytics/overview
/api/alerts/analytics/trends
/api/alerts/analytics/by-group
/api/alerts/analytics/top-users
/api/alerts/analytics/top-groups
/api/monitoring/summary
/api/monitoring/robots-status
/api/monitoring/active-groups
/api/monitoring/active-users
```

### 老接口（proxy）（5个核心）
```
/api/proxy/admin/sessions/active
/api/proxy/admin/robots
/api/proxy/admin/alerts/stats
/api/proxy/admin/monitor/summary
/api/proxy/admin/callbacks
```

### 需要保留的接口
```
/api/proxy/admin/sessions/active  # 活跃会话，新接口暂未实现
```

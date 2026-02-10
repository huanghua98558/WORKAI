# WorkTool AI 数据库表迁移分析

## 📊 表对比分析

### 云数据库中的表（12张）✅ 已迁移

| 序号 | 表名 | 状态 | 说明 |
|------|------|------|------|
| 1 | ai_interventions | ✅ | AI介入记录 |
| 2 | alert_history | ✅ | 告警历史 |
| 3 | alert_rules | ✅ | 告警规则 |
| 4 | group_sessions | ✅ | 社群会话 |
| 5 | intent_configs | ✅ | 意图配置 |
| 6 | notification_methods | ✅ | 通知方式 |
| 7 | robots | ✅ | 机器人 |
| 8 | satisfaction_analysis | ✅ | 满意度分析 |
| 9 | session_messages | ✅ | 会话消息 |
| 10 | staff_activities | ✅ | 工作人员活跃度 |
| 11 | tasks | ✅ | 任务管理 |
| 12 | user_sessions | ✅ | 用户会话 |

### Schema.js中定义但未迁移的表（30张）❌ 未迁移

#### 🤖 AI相关表（7张）

| 序号 | 表名 | 优先级 | 说明 |
|------|------|--------|------|
| 1 | aiModels | P1 | AI模型配置 |
| 2 | aiProviders | P1 | AI服务商 |
| 3 | aiRoles | P1 | AI角色 |
| 4 | aiRoleVersions | P2 | AI角色版本 |
| 5 | aiModelUsage | P2 | AI模型使用统计 |
| 6 | aiBudgetSettings | P2 | AI预算设置 |
| 7 | ai_io_logs | P1 | AI交互日志 |

#### 🔄 流程引擎表（4张）

| 序号 | 表名 | 优先级 | 说明 |
|------|------|--------|------|
| 8 | flowDefinitions | P0 | 流程定义 |
| 9 | flowInstances | P0 | 流程实例 |
| 10 | flowExecutionLogs | P0 | 流程执行日志 |
| 11 | prompt_templates | P0 | Prompt模板 |

#### 👤 用户管理表（5张）

| 序号 | 表名 | 优先级 | 说明 |
|------|------|--------|------|
| 12 | users | P0 | 用户表（核心） |
| 13 | userLoginSessions | P1 | 用户登录会话 |
| 14 | userAuditLogs | P2 | 用户审计日志 |
| 15 | userSessions | ✅ | 用户会话（已迁移） |
| 16 | sessionStaffStatus | P1 | 会话工作人员状态 |

#### 🤖 机器人管理表（2张）

| 序号 | 表名 | 优先级 | 说明 |
|------|------|--------|------|
| 17 | robotCommands | P1 | 机器人命令 |
| 18 | robotCommandQueue | P1 | 机器人命令队列 |
| 19 | robots | ✅ | 机器人（已迁移） |
| 20 | robotPermissions | P1 | 机器人权限 |

#### 📝 文档管理表（1张）

| 序号 | 表名 | 优先级 | 说明 |
|------|------|--------|------|
| 21 | documents | P1 | 文档管理 |

#### 📊 协同分析表（5张）

| 序号 | 表名 | 优先级 | 说明 |
|------|------|--------|------|
| 22 | staffMessages | P1 | 工作人员消息 |
| 23 | collaborationDecisionLogs | P1 | 协同决策日志 |
| 24 | staffActivities | ✅ | 工作人员活跃度（已迁移） |
| 25 | tasks | ✅ | 任务管理（已迁移） |
| 26 | satisfactionAnalysis | ✅ | 满意度分析（已迁移） |

#### 📋 系统配置表（5张）

| 序号 | 表名 | 优先级 | 说明 |
|------|------|--------|------|
| 27 | systemSettings | P0 | 系统设置 |
| 28 | systemLogs | P2 | 系统日志 |
| 29 | qaDatabase | P2 | QA数据库 |
| 30 | promptCategoryTemplates | P1 | Prompt分类模板 |
| 31 | prompt_tests | P1 | Prompt测试 |

#### 🚨 告警相关表（6张）

| 序号 | 表名 | 优先级 | 说明 |
|------|------|--------|------|
| 32 | alertRules | ✅ | 告警规则（已迁移） |
| 33 | alertHistory | ✅ | 告警历史（已迁移） |
| 34 | notificationMethods | ✅ | 通知方式（已迁移） |
| 35 | riskMessages | P1 | 风险消息 |
| 36 | infoDetectionHistory | P1 | 信息检测历史 |
| 37 | apiCallLogs | P2 | API调用日志 |
| 38 | callbackHistory | P2 | 回调历史 |

#### 💬 会话相关表（3张）

| 序号 | 表名 | 优先级 | 说明 |
|------|------|--------|------|
| 39 | sessionMessages | ✅ | 会话消息（已迁移） |
| 40 | sessions | P0 | 会话表（核心） |
| 41 | userSessions | ✅ | 用户会话（已迁移） |
| 42 | groupSessions | ✅ | 社群会话（已迁移） |

---

## 🚨 关键发现

### P0优先级表（必须立即迁移）

这些表是系统运行的核心，必须立即迁移：

| 表名 | 说明 | 影响 |
|------|------|------|
| **users** | 用户表 | 无法登录、无法管理用户 |
| **sessions** | 会话表 | 无法管理会话状态 |
| **flowDefinitions** | 流程定义 | 无法定义业务流程 |
| **flowInstances** | 流程实例 | 无法执行流程 |
| **flowExecutionLogs** | 流程执行日志 | 无法追踪流程执行 |
| **prompt_templates** | Prompt模板 | 无法管理AI提示词 |
| **systemSettings** | 系统设置 | 无法配置系统参数 |

**共7张P0优先级表**

### P1优先级表（重要功能，第一阶段迁移）

这些表支撑重要功能，建议在第一阶段迁移：

| 表名 | 说明 | 影响 |
|------|------|------|
| **aiModels** | AI模型配置 | 无法配置AI模型 |
| **aiProviders** | AI服务商 | 无法管理AI服务 |
| **aiRoles** | AI角色 | 无法定义AI角色 |
| **ai_io_logs** | AI交互日志 | 无法追踪AI交互 |
| **userLoginSessions** | 用户登录会话 | 无法管理登录状态 |
| **robotCommands** | 机器人命令 | 无法发送机器人命令 |
| **robotCommandQueue** | 机器人命令队列 | 无法管理命令队列 |
| **robotPermissions** | 机器人权限 | 无法管理机器人权限 |
| **documents** | 文档管理 | 无法管理文档 |
| **staffMessages** | 工作人员消息 | 无法追踪工作人员消息 |
| **collaborationDecisionLogs** | 协同决策日志 | 无法记录协同决策 |

**共11张P1优先级表**

### P2优先级表（增强功能，第二阶段迁移）

这些表用于增强功能，可以在第二阶段迁移：

| 表名 | 说明 | 影响 |
|------|------|------|
| aiRoleVersions | AI角色版本 | 无法管理版本 |
| aiModelUsage | AI模型使用统计 | 无法统计使用情况 |
| aiBudgetSettings | AI预算设置 | 无法管理预算 |
| userAuditLogs | 用户审计日志 | 无法审计用户操作 |
| sessionStaffStatus | 会话工作人员状态 | 无法管理工作人员状态 |
| systemLogs | 系统日志 | 无法记录系统日志 |
| qaDatabase | QA数据库 | 无法管理QA |
| promptCategoryTemplates | Prompt分类模板 | 无法分类管理Prompt |
| prompt_tests | Prompt测试 | 无法测试Prompt |
| riskMessages | 风险消息 | 无法管理风险消息 |
| infoDetectionHistory | 信息检测历史 | 无法追踪信息检测 |
| apiCallLogs | API调用日志 | 无法追踪API调用 |
| callbackHistory | 回调历史 | 无法追踪回调 |

**共13张P2优先级表**

---

## 🎯 迁移建议

### 第一阶段：核心功能迁移（P0）

**目标：确保系统基本功能可以运行**

**迁移表（7张）：**
1. ✅ users（用户表）
2. ✅ sessions（会话表）
3. ✅ flowDefinitions（流程定义）
4. ✅ flowInstances（流程实例）
5. ✅ flowExecutionLogs（流程执行日志）
6. ✅ prompt_templates（Prompt模板）
7. ✅ systemSettings（系统设置）

**预期时间：** 1天

### 第二阶段：重要功能迁移（P1）

**目标：增强系统功能，支持AI和协同分析**

**迁移表（11张）：**
1. ✅ aiModels（AI模型配置）
2. ✅ aiProviders（AI服务商）
3. ✅ aiRoles（AI角色）
4. ✅ ai_io_logs（AI交互日志）
5. ✅ userLoginSessions（用户登录会话）
6. ✅ robotCommands（机器人命令）
7. ✅ robotCommandQueue（机器人命令队列）
8. ✅ robotPermissions（机器人权限）
9. ✅ documents（文档管理）
10. ✅ staffMessages（工作人员消息）
11. ✅ collaborationDecisionLogs（协同决策日志）

**预期时间：** 1-2天

### 第三阶段：增强功能迁移（P2）

**目标：完善系统功能，支持统计和审计**

**迁移表（13张）：**
1. aiRoleVersions（AI角色版本）
2. aiModelUsage（AI模型使用统计）
3. aiBudgetSettings（AI预算设置）
4. userAuditLogs（用户审计日志）
5. sessionStaffStatus（会话工作人员状态）
6. systemLogs（系统日志）
7. qaDatabase（QA数据库）
8. promptCategoryTemplates（Prompt分类模板）
9. prompt_tests（Prompt测试）
10. riskMessages（风险消息）
11. infoDetectionHistory（信息检测历史）
12. apiCallLogs（API调用日志）
13. callbackHistory（回调历史）

**预期时间：** 1天

---

## 📋 总计

| 类别 | 表数量 |
|------|--------|
| ✅ 已迁移 | 12张 |
| ❌ 未迁移（P0） | 7张 |
| ❌ 未迁移（P1） | 11张 |
| ❌ 未迁移（P2） | 13张 |
| **总计** | **43张** |

---

## 🚨 立即行动

### 建议立即执行（今天）

**第一阶段迁移：7张P0优先级表**

这些表是系统运行的核心，必须立即迁移，否则系统无法正常运行。

**执行步骤：**

1. ✅ 创建P0表迁移脚本
2. ✅ 执行迁移脚本
3. ✅ 验证表结构
4. ✅ 测试基本功能

---

## 📞 结论

**发现了30张表未迁移到云数据库！**

其中：
- **7张P0优先级表**：必须立即迁移，否则系统无法正常运行
- **11张P1优先级表**：第一阶段迁移，支持重要功能
- **13张P2优先级表**：第二阶段迁移，完善系统功能

**建议立即开始P0优先级表的迁移！** 🚀

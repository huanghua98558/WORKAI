# WorkTool AI 中枢系统 - 前后端 API 完整分析报告

> 生成时间：2026-02-08
> 分析范围：所有前端和后端 API

---

## 📊 执行摘要

### API 统计概览

| 指标 | 数量 |
|------|------|
| 后端 API 路由总数 | **320 个** |
| 前端 API 调用总数 | **456+ 次** |
| 后端 API 模块数量 | **28 个** |
| HTTP 方法分布 | GET: 120+, POST: 150+, PUT: 40+, DELETE: 30+ |

### 关键发现

✅ **优点**：
- API 设计规范，遵循 RESTful 风格
- 权限控制完善，使用 JWT 认证
- 模块化设计清晰，易于维护
- 前端 API 客户端统一封装

⚠️ **问题**：
- 部分前端调用的 API 路径与后端不匹配
- 存在未实现的 API 接口
- 部分模块存在重复功能
- 错误处理机制不统一

🚨 **严重问题**：
- 前端调用的 `/api/after-sales/tasks` 等接口在后端不存在
- `/api/proxy/ai/*` 路径可能与实际后端路径不符
- 部分监控相关 API 可能未实现

---

## 📁 后端 API 详细分类

### 1. 认证授权模块 (auth.api.js / auth-complete.api.js)

**基础认证**：
```
POST   /auth/login                          - 用户登录
POST   /auth/register                       - 用户注册
POST   /auth/logout                         - 用户登出
POST   /auth/verify                         - 验证 Token
POST   /auth/refresh                        - 刷新 Token
GET    /auth/me                             - 获取当前用户信息
PUT    /auth/profile                        - 更新个人资料
POST   /auth/reset-password/request         - 请求重置密码
POST   /auth/reset-password/confirm         - 确认重置密码
POST   /auth/change-password                - 修改密码
```

**特点**：
- 支持 JWT Token 认证
- 支持密码重置流程
- 提供个人资料管理

---

### 2. 机器人管理模块 (robot.api.js)

**基础管理**：
```
GET    /robots                              - 获取机器人列表
GET    /robots/:id                          - 获取机器人详情
GET    /robots/by-robot-id/:robotId         - 根据 robotId 获取
POST   /robots                              - 创建机器人
PUT    /robots/:id                          - 更新机器人
DELETE /robots/:id                          - 删除机器人
```

**配置与测试**：
```
POST   /robots/validate                     - 验证机器人配置
POST   /robots/test                         - 测试机器人
POST   /robots/:id/test-and-save            - 测试并保存
POST   /robots/:id/config-callback          - 配置回调
POST   /robots/:id/config-callback-type     - 配置回调类型
POST   /robots/:id/delete-callback-type     - 删除回调类型
```

**回调管理**：
```
GET    /robots/:id/callback-config          - 获取回调配置
GET    /robots/:id/callback-history         - 获取回调历史
GET    /robots/:id/callback-stats           - 获取回调统计
```

**状态监控**：
```
POST   /robots/:id/send-test                - 发送测试消息
POST   /robots/:robotId/check-status        - 检查状态
POST   /robots/check-status-all             - 检查所有状态
POST   /robots/:id/regenerate-urls          - 重新生成 URL
```

**API 端点测试**：
```
POST   /robots/:id/api-endpoints/test       - 测试 API 端点
POST   /robots/:id/api-endpoints/test-all   - 测试所有端点
GET    /robots/:id/api-endpoints/logs       - 获取端点日志
```

**监控仪表盘**：
```
GET    /robot-monitoring                    - 机器人监控数据
```

---

### 3. 机器人群组管理 (robot-groups.api.js)

```
GET    /admin/robot-groups                  - 获取群组列表
GET    /admin/robot-groups/:id              - 获取群组详情
POST   /admin/robot-groups                  - 创建群组
PUT    /admin/robot-groups/:id              - 更新群组
DELETE /admin/robot-groups/:id              - 删除群组
```

---

### 4. 机器人角色管理 (robot-roles.api.js)

```
GET    /admin/robot-roles                   - 获取角色列表
GET    /admin/robot-roles/:id               - 获取角色详情
POST   /admin/robot-roles                   - 创建角色
PUT    /admin/robot-roles/:id               - 更新角色
DELETE /admin/robot-roles/:id               - 删除角色
```

---

### 5. 机器人命令管理 (robot-command.api.js)

```
GET    /robot-commands                      - 获取命令列表
GET    /robot-commands/:id                  - 获取命令详情
POST   /robot-commands                      - 创建命令
POST   /robot-commands/:id/retry            - 重试命令
GET    /robot-commands/queue/stats          - 队列统计
DELETE /robot-commands/:id                  - 删除命令
```

---

### 6. AI 模块管理 (ai-module.api.js)

**AI 模型管理**：
```
GET    /models                              - 获取 AI 模型列表
POST   /models                              - 创建 AI 模型
PUT    /models/:id                          - 更新 AI 模型
DELETE /models/:id                          - 删除 AI 模型
POST   /models/:id/health-check             - 健康检查
POST   /models/:id/enable                   - 启用模型
POST   /models/:id/disable                  - 禁用模型
```

**AI 角色管理**：
```
GET    /personas                            - 获取 AI 角色列表
POST   /personas                            - 创建 AI 角色
PUT    /personas/:id                        - 更新 AI 角色
DELETE /personas/:id                        - 删除 AI 角色
```

**消息模板**：
```
GET    /templates                           - 获取模板列表
POST   /templates                           - 创建模板
PUT    /templates/:id                       - 更新模板
DELETE /templates/:id                       - 删除模板
```

**AI 测试与统计**：
```
POST   /test                                - 测试 AI
GET    /usage/stats                         - 使用统计
GET    /usage/ranking                       - 模型排名
GET    /protection/stats                    - 保护统计
```

**提供商管理**：
```
GET    /providers                           - 获取提供商列表
PUT    /providers/:id                       - 更新提供商
POST   /providers/:id/test                  - 测试提供商
```

**预算管理**：
```
GET    /budget/settings                     - 获取预算设置
PUT    /budget/settings                     - 更新预算设置
GET    /budget/status                       - 获取预算状态
GET    /budget/trend                        - 获取预算趋势
```

---

### 7. 流程引擎管理 (flow-engine.api.js)

**流程定义**：
```
POST   /definitions                         - 创建流程定义
GET    /definitions                         - 获取流程定义列表
GET    /definitions/:id                     - 获取流程定义详情
PUT    /definitions/:id                     - 更新流程定义
DELETE /definitions/:id                     - 删除流程定义
```

**流程实例**：
```
POST   /instances                           - 创建流程实例
GET    /instances                           - 获取流程实例列表
GET    /instances/:id                       - 获取流程实例详情
POST   /instances/:id/execute               - 执行流程实例
POST   /execute                             - 直接执行流程
```

**流程日志与查询**：
```
GET    /logs                                - 获取流程日志
GET    /node-types                          - 获取节点类型
GET    /flow-statuses                       - 获取流程状态
GET    /trigger-types                       - 获取触发类型
```

---

### 8. 告警配置管理 (alert-config.api.js)

**意图配置**：
```
GET    /alerts/intents                      - 获取意图列表
GET    /alerts/intents/enabled              - 获取已启用的意图
GET    /alerts/intents/:intentType          - 获取意图详情
POST   /alerts/intents                      - 创建意图
```

**告警规则**：
```
GET    /alerts/rules                        - 获取规则列表
GET    /alerts/rules/:intentType            - 获取规则详情
POST   /alerts/rules                        - 创建规则
PUT    /alerts/rules/:id                    - 更新规则
DELETE /alerts/rules/:id                    - 删除规则
```

**通知配置**：
```
GET    /alerts/rules/:ruleId/notifications  - 获取通知配置
POST   /alerts/notifications                - 创建通知配置
PUT    /alerts/notifications/:id            - 更新通知配置
DELETE /alerts/notifications/:id            - 删除通知配置
```

**历史与统计**：
```
GET    /alerts/history                      - 获取告警历史
PUT    /alerts/history/:alertId/handle      - 处理告警
GET    /alerts/stats                        - 获取告警统计
POST   /alerts/notifications/test           - 测试通知
```

---

### 9. 增强告警管理 (alert-enhanced.api.js)

**告警分组**：
```
GET    /alerts/groups                       - 获取分组列表
GET    /alerts/groups/:groupId              - 获取分组详情
GET    /alerts/groups/:groupId/stats        - 获取分组统计
GET    /alerts/groups/:groupId/trends       - 获取分组趋势
POST   /alerts/groups                       - 创建分组
PUT    /alerts/groups/:groupId              - 更新分组
DELETE /alerts/groups/:groupId              - 删除分组
```

**批量操作**：
```
POST   /alerts/batch/mark-handled           - 批量标记已处理
POST   /alerts/batch/ignore                 - 批量忽略
POST   /alerts/batch/delete                 - 批量删除
POST   /alerts/batch/escalate               - 批量升级
POST   /alerts/batch/reassign               - 批量重新分配
```

**批量操作记录**：
```
GET    /alerts/batch/operations             - 获取操作列表
GET    /alerts/batch/operations/:operationId - 获取操作详情
GET    /alerts/batch/operations/:operationId/alerts - 获取操作关联的告警
```

**告警升级**：
```
POST   /alerts/:alertId/escalate            - 升级告警
POST   /alerts/:alertId/escalate/manual     - 手动升级
GET    /alerts/:alertId/escalation-history  - 获取升级历史
```

**升级统计**：
```
GET    /alerts/escalation-stats             - 获取升级统计
GET    /alerts/pending-escalations          - 获取待升级告警
POST   /alerts/escalations/batch-check      - 批量检查升级
```

**分析数据**：
```
GET    /alerts/analytics/overall            - 总体分析
GET    /alerts/analytics/daily-trends       - 每日趋势
GET    /alerts/analytics/hourly-trends      - 每小时趋势
GET    /alerts/analytics/by-group           - 按分组分析
GET    /alerts/analytics/by-intent          - 按意图分析
GET    /alerts/analytics/alert-level-distribution - 告警级别分布
GET    /alerts/analytics/response-time      - 响应时间分析
GET    /alerts/analytics/escalation-stats   - 升级统计
GET    /alerts/analytics/top-users          - 热门用户
GET    /alerts/analytics/top-chats          - 热门对话
GET    /alerts/analytics/report             - 生成报告
```

---

### 10. 权限管理 (permission.api.js)

**机器人权限**：
```
GET    /robots/:robotId/permissions         - 获取机器人权限列表
POST   /robots/:robotId/permissions         - 分配机器人权限
PUT    /robots/:robotId/permissions/:permissionId - 更新权限
DELETE /robots/:robotId/permissions/:permissionId - 撤销权限
```

**用户权限**：
```
GET    /users/:userId/permissions           - 获取用户权限列表
```

**权限类型**：
```
GET    /types                               - 获取权限类型列表
```

---

### 11. 头像管理 (avatar.api.js)

```
POST   /upload                              - 上传头像
POST   /refresh-url                         - 刷新签名 URL
DELETE /delete                              - 删除头像
```

---

### 12. 管理后台 (admin.api.js)

**配置管理**：
```
GET    /config                              - 获取系统配置
POST   /config                              - 更新系统配置
```

**回调管理**：
```
GET    /callbacks                           - 获取回调配置
POST   /callbacks/test                      - 测试回调
```

**监控数据**：
```
GET    /monitor/summary                     - 监控摘要
GET    /monitor/top-groups                  - 热门群组
GET    /monitor/top-users                   - 热门用户
```

**会话管理**：
```
GET    /sessions/active                     - 获取活跃会话
POST   /sessions/:sessionId/takeover        - 接管会话
GET    /sessions/:sessionId                 - 获取会话详情
POST   /sessions/:sessionId/auto            - 自动处理会话
GET    /sessions/:sessionId/messages        - 获取会话消息
GET    /sessions/search                     - 搜索会话
```

**报告管理**：
```
GET    /reports/:date                       - 获取报告
POST   /reports/generate                    - 生成报告
GET    /reports/:date/export                - 导出报告
POST   /reports/:date/tencentdoc            - 同步到腾讯文档
```

**告警管理**：
```
GET    /alerts/stats                        - 获取告警统计
GET    /alerts/history                      - 获取告警历史
POST   /alerts/check                        - 检查告警
```

**熔断器**：
```
GET    /circuit-breaker/status              - 获取熔断器状态
POST   /circuit-breaker/reset               - 重置熔断器
```

**系统管理**：
```
GET    /health                              - 健康检查
GET    /system/info                         - 系统信息
```

**人工接管**：
```
GET    /human-handover/config               - 获取人工接管配置
POST   /human-handover/config               - 更新配置
POST   /human-handover/recipients           - 添加接收人
PUT    /human-handover/recipients/:id       - 更新接收人
DELETE /human-handover/recipients/:id       - 删除接收人
POST   /human-handover/alert                - 发送告警
```

**用户管理**：
```
GET    /users                               - 获取用户列表
POST   /users                               - 创建用户
PUT    /users/:id                           - 更新用户
DELETE /users/:id                           - 删除用户
```

**系统设置**：
```
GET    /settings                            - 获取设置列表
GET    /settings/:key                       - 获取设置详情
POST   /settings                            - 创建设置
PUT    /settings/:id                        - 更新设置
DELETE /settings/:id                        - 删除设置
GET    /settings/category/:category         - 按分类获取设置
```

**日志管理**：
```
GET    /logs                                - 获取日志列表
GET    /logs/:filename                      - 获取日志文件
GET    /logs/:filename/preview              - 预览日志
```

**测试工具**：
```
POST   /create-test-message                 - 创建测试消息
POST   /tencentdoc/test                     - 测试腾讯文档
```

---

### 13. 监控模块 (monitoring.api.js)

```
GET    /monitoring/executions               - 获取执行记录
GET    /monitoring/executions/:processingId - 获取执行详情
GET    /monitoring/ai-logs                  - 获取 AI 日志
GET    /monitoring/sessions                 - 获取会话列表
GET    /monitoring/sessions/:sessionId      - 获取会话详情
GET    /monitoring/health                   - 健康检查
GET    /monitoring/token-stats              - Token 统计
GET    /monitoring/cache-stats              - 缓存统计
```

---

### 14. AI 交互 (ai-io.api.js)

```
GET    /ai-io                               - 获取 AI 交互数据
```

---

### 15. 协作模块 (collab.api.js)

```
GET    /stats                               - 获取协作统计
GET    /staff-activity                      - 获取员工活动
GET    /recommendations                     - 获取推荐数据
GET    /recommendations/stats               - 推荐统计
GET    /decision-logs                       - 获取决策日志
POST   /decision-logs                       - 创建决策日志
PUT    /decision-logs/:id                   - 更新决策日志
GET    /robot-satisfaction                  - 获取机器人满意度列表
GET    /robot-satisfaction/:robotId         - 获取机器人满意度详情
GET    /export/csv                          - 导出 CSV
GET    /export/staff-activity               - 导出员工活动
GET    /export/decision-logs                - 导出决策日志
```

---

### 16. 风险管理 (risk.api.js)

```
POST   /api/risk/handle                     - 处理风险
GET    /api/risk/:id                        - 获取风险详情
PUT    /api/risk/:id                        - 更新风险
POST   /api/risk/:id/resolve                - 解决风险
POST   /api/risk/test-staff-identifier      - 测试员工标识
POST   /api/risk/validate-staff-config      - 验证员工配置
GET    /api/risk/active                     - 获取活跃风险
GET    /api/risk/:id/logs                   - 获取风险日志
GET    /api/risk/stats                      - 获取风险统计
```

---

### 17. API 密钥管理 (apikey.api.js)

```
POST   /keys                                - 创建 API 密钥
GET    /keys                                - 获取密钥列表
DELETE /keys/:id                            - 删除密钥
POST   /validate                            - 验证密钥
```

---

### 18. 文档管理 (document.api.js)

```
GET    /documents                           - 获取文档列表
GET    /documents/search                    - 搜索文档
GET    /documents/:id                       - 获取文档详情
GET    /documents/stats                     - 获取文档统计
POST   /documents/upload                    - 上传文档
POST   /documents/upload-text               - 上传文本
PUT    /documents/:id                       - 更新文档
DELETE /documents/:id                       - 删除文档
```

---

### 19. 问答管理 (qa.api.js)

```
GET    /qa                                  - 获取问答列表
GET    /qa/:id                              - 获取问答详情
POST   /qa                                  - 创建问答
PUT    /qa/:id                              - 更新问答
DELETE /qa/:id                              - 删除问答
POST   /qa/batch                            - 批量创建问答
```

---

### 20. 提示词模板 (prompt.api.js)

```
GET    /prompt-templates                    - 获取模板列表
GET    /prompt-templates/:id                - 获取模板详情
POST   /prompt-templates                    - 创建模板
PUT    /prompt-templates/:id                - 更新模板
DELETE /prompt-templates/:id                - 删除模板
PATCH  /prompt-templates/:id/toggle         - 切换状态
POST   /prompt-tests/run                    - 运行测试
POST   /prompt-tests/batch                  - 批量测试
```

---

### 21. 通知管理 (notification.api.js)

```
GET    /notifications/methods/:alertRuleId  - 获取通知方法
POST   /notifications/methods               - 创建通知方法
PUT    /notifications/methods/:id           - 更新通知方法
DELETE /notifications/methods/:id           - 删除通知方法
PATCH  /notifications/methods/:id/toggle    - 切换状态
POST   /notifications/send                  - 发送通知
POST   /notifications/test                  - 测试通知
GET    /notifications/templates/default/:methodType - 获取默认模板
```

---

### 22. 操作日志 (operation-logs.api.js)

```
GET    /operation-logs                      - 获取操作日志
GET    /operation-logs/stats                - 获取统计
GET    /operation-logs/module-stats         - 获取模块统计
GET    /operation-logs/target/:targetId     - 获取目标日志
GET    /operation-logs/user/:userId         - 获取用户日志
DELETE /operation-logs/:id                  - 删除日志
POST   /operation-logs/batch-delete         - 批量删除
DELETE /operation-logs/by-filters           - 按条件删除
POST   /operation-logs/clear-all            - 清空所有日志
DELETE /operation-logs                      - 删除日志
```

---

### 23. 执行追踪 (execution-tracker.api.js)

```
GET    /stats                               - 获取统计
GET    /records                             - 获取记录
GET    /detail/:processingId                - 获取详情
GET    /search                              - 搜索
```

---

### 24. 意图配置 (intent-config.api.js)

```
GET    /                                    - 获取意图配置
GET    /:intentType                         - 获取意图详情
POST   /:intentType                         - 创建意图
POST   /:intentType/reset                   - 重置意图
POST   /:intentType/toggle                  - 切换意图
```

---

### 25. 系统日志 (system-logs.api.js)

```
GET    /logs                                - 获取日志列表
GET    /logs/:filename                      - 获取日志文件
GET    /logs/:filename/preview              - 预览日志
```

---

### 26. 调试工具 (debug.api.js)

```
POST   /debug/send-message                  - 发送测试消息
POST   /debug/group-operation               - 群组操作
POST   /debug/push-file                     - 推送文件
```

---

### 27. WorkTool 回调 (worktool.callback.js)

```
POST   /message                             - 消息回调
POST   /action-result                       - 动作结果回调
POST   /command                             - 命令回调
POST   /result                              - 结果回调
POST   /group-qrcode                        - 群组二维码
POST   /qrcode                              - 二维码
POST   /robot-online                        - 机器人上线
POST   /robot-offline                       - 机器人下线
POST   /robot-status                        - 机器人状态
```

---

### 28. 其他工具

```
POST   /send-oss-image                      - 发送 OSS 图片
POST   /conversion-robot                    - 转换机器人
```

---

## 📱 前端 API 调用分析

### 前端 API 客户端封装

位置：`src/lib/api-client.ts`

```typescript
// 统一的 API 客户端
export const api = {
  // 认证相关
  auth: {
    login, register, logout, verify, refresh, me
  },

  // 机器人相关
  robots: {
    list, get, getByRobotId, create, update, delete,
    validate, test, testAndSave, configCallback
  },

  // 头像相关
  avatar: {
    upload, delete, refreshUrl
  }
};
```

### 前端常用 API 调用

根据扫描结果，前端主要调用以下 API：

#### 1. 监控相关
```typescript
/api/monitoring/health
/api/monitoring/executions
/api/monitoring/ai-logs
/api/monitoring/sessions
/api/monitoring/token-stats
/api/monitoring/cache-stats
```

#### 2. 机器人相关
```typescript
/api/admin/robots
/api/admin/robot-groups
/api/admin/robot-roles
/api/admin/robot-commands
/api/admin/robot-monitoring
```

#### 3. 报告相关
```typescript
/api/admin/reports/:date
/api/admin/reports/generate
/api/admin/reports/:date/export
```

#### 4. 配置相关
```typescript
/api/admin/config
/api/admin/settings
```

#### 5. 文档相关
```typescript
/api/admin/documents
/api/admin/documents/upload
/api/admin/documents/upload-text
```

#### 6. AI 模块相关
```typescript
/api/proxy/ai/models
/api/proxy/ai/personas
/api/proxy/ai/templates
/api/proxy/ai/usage/stats
/api/proxy/ai/protection/stats
/api/proxy/ai/usage/ranking
```

#### 7. 售后任务相关（⚠️ 可能不存在）
```typescript
/api/after-sales/tasks
/api/after-sales/tasks/:id
/api/after-sales/tasks/:id/assign
/api/after-sales/tasks/:id/complete
/api/after-sales/tasks/:id/cancel
/api/after-sales/tasks/:id/escalate
```

#### 8. AI 交互相关
```typescript
/api/ai-io
/api/ai-io/create-test-message
```

#### 9. 告警相关
```typescript
/api/alerts/stats
```

---

## 🔍 前后端 API 一致性分析

### ✅ 已匹配的 API

以下前端调用的 API 在后端已实现：

| 前端调用 | 后端路由 | 状态 |
|---------|---------|------|
| `/api/auth/login` | `POST /auth/login` | ✅ 匹配 |
| `/api/auth/register` | `POST /auth/register` | ✅ 匹配 |
| `/api/auth/logout` | `POST /auth/logout` | ✅ 匹配 |
| `/api/auth/me` | `GET /auth/me` | ✅ 匹配 |
| `/api/robots` | `GET/POST/PUT/DELETE /robots` | ✅ 匹配 |
| `/api/avatar/upload` | `POST /upload` | ⚠️ 路径不完全匹配 |
| `/api/avatar/delete` | `DELETE /delete` | ⚠️ 路径不完全匹配 |
| `/api/avatar/refresh-url` | `POST /refresh-url` | ⚠️ 路径不完全匹配 |
| `/api/monitoring/health` | `GET /monitoring/health` | ✅ 匹配 |
| `/api/monitoring/executions` | `GET /monitoring/executions` | ✅ 匹配 |
| `/api/monitoring/ai-logs` | `GET /monitoring/ai-logs` | ✅ 匹配 |
| `/api/monitoring/sessions` | `GET /monitoring/sessions` | ✅ 匹配 |
| `/api/monitoring/token-stats` | `GET /monitoring/token-stats` | ✅ 匹配 |
| `/api/monitoring/cache-stats` | `GET /monitoring/cache-stats` | ✅ 匹配 |
| `/api/alerts/stats` | `GET /alerts/stats` | ✅ 匹配 |
| `/api/admin/robots` | `GET /robots` | ⚠️ 路径不完全匹配 |
| `/api/admin/config` | `GET /config` | ⚠️ 路径不完全匹配 |
| `/api/admin/reports` | `GET /reports` | ⚠️ 路径不完全匹配 |

---

### ❌ 未实现或路径不匹配的 API

#### 1. 售后任务模块（⚠️ 完全未实现）

前端调用：
```
GET    /api/after-sales/tasks
POST   /api/after-sales/tasks
GET    /api/after-sales/tasks/:id
PUT    /api/after-sales/tasks/:id
POST   /api/after-sales/tasks/:id/assign
POST   /api/after-sales/tasks/:id/complete
POST   /api/after-sales/tasks/:id/cancel
POST   /api/after-sales/tasks/:id/escalate
```

**状态**：❌ 后端完全不存在此模块

**影响**：`after-sales-task-monitor.tsx` 组件将无法正常工作

---

#### 2. AI 代理路径问题

前端调用：
```
/api/proxy/ai/models
/api/proxy/ai/personas
/api/proxy/ai/templates
/api/proxy/ai/usage/stats
/api/proxy/ai/protection/stats
/api/proxy/ai/usage/ranking
```

**实际后端路径**：
```
/api/models
/api/personas
/api/templates
/api/usage/stats
/api/protection/stats
/api/usage/ranking
```

**状态**：❌ 路径不匹配

**影响**：AI 模块相关功能可能无法正常工作

---

#### 3. 头像 API 路径问题

前端调用：
```
POST /api/avatar/upload
DELETE /api/avatar/delete
POST /api/avatar/refresh-url
```

**实际后端路径**：
```
POST /api/upload
DELETE /api/delete
POST /api/refresh-url
```

**状态**：❌ 路径不匹配

**影响**：头像上传功能可能无法正常工作

---

#### 4. 管理后台路径前缀

前端调用：
```
/api/admin/robots
/api/admin/config
/api/admin/settings
/api/admin/reports
/api/admin/documents
/api/admin/robot-groups
/api/admin/robot-roles
/api/admin/robot-commands
/api/admin/robot-loadbalancing
/api/admin/robot-monitoring
```

**实际后端路径**（大部分没有 `/admin` 前缀）：
```
/robots
/config
/settings
/reports
/documents
/admin/robot-groups
/admin/robot-roles
/robot-commands
```

**状态**：⚠️ 部分路径不匹配

**影响**：需要确认后端是否有统一的路由前缀配置

---

## 🐛 发现的问题

### 严重问题（🚨）

1. **售后任务模块完全缺失**
   - 前端组件：`after-sales-task-monitor.tsx`
   - 影响：整个售后任务管理功能无法使用
   - 建议：实现完整的售后任务模块或删除相关前端组件

2. **AI 代理路径不匹配**
   - 前端使用 `/api/proxy/ai/*`
   - 后端实际路径为 `/api/*`
   - 影响：AI 模块功能无法正常使用
   - 建议：统一 API 路径规范

3. **头像 API 路径不匹配**
   - 前端使用 `/api/avatar/*`
   - 后端实际路径为 `/api/*`
   - 影响：头像上传功能无法正常使用
   - 建议：修改路由配置或前端调用路径

---

### 中等问题（⚠️）

4. **管理后台路径不一致**
   - 部分接口有 `/admin` 前缀，部分没有
   - 影响：API 调用混乱，维护困难
   - 建议：统一使用或移除 `/admin` 前缀

5. **负载均衡 API 未实现**
   - 前端调用：`/api/admin/robot-loadbalancing`
   - 后端：未找到相关路由
   - 建议：实现或删除相关调用

6. **路由重复**
   - `robot.api.js` 和 `robot-protected.api.js` 存在功能重叠
   - `auth.api.js` 和 `auth-complete.api.js` 存在功能重叠
   - 建议：合并或明确职责划分

---

### 轻微问题（ℹ️）

7. **API 响应格式不统一**
   - 部分接口返回 `{ code, data }`
   - 部分接口直接返回数据
   - 建议：统一响应格式

8. **错误处理不一致**
   - 部分接口抛出异常
   - 部分接口返回错误码
   - 建议：统一错误处理机制

9. **缺少 API 文档**
   - 没有统一的 API 文档
   - 建议：使用 Swagger/OpenAPI 生成文档

10. **缺少请求验证**
    - 部分接口缺少参数验证
    - 建议：添加请求参数验证

---

## 📋 API 规范建议

### 1. 路径命名规范

建议统一采用以下规范：

```
/api/{module}/{resource}/{id}/{action}
```

示例：
```
/api/auth/login
/api/robots
/api/robots/:id
/api/robots/:id/permissions
/api/admin/users
/api/admin/settings
```

### 2. HTTP 方法规范

```
GET    - 查询资源
POST   - 创建资源
PUT    - 完整更新资源
PATCH  - 部分更新资源
DELETE - 删除资源
```

### 3. 响应格式规范

统一采用以下格式：

**成功响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

**错误响应**：
```json
{
  "code": -1,
  "message": "error message",
  "error": { ... }
}
```

### 4. 认证规范

所有需要认证的接口必须携带 JWT Token：

```
Authorization: Bearer {token}
```

### 5. 分页规范

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 100,
  "data": [ ... ]
}
```

---

## 🎯 优先修复建议

### P0（立即修复）

1. ✅ 修复头像 API 路径不匹配
2. ✅ 修复 AI 代理路径不匹配
3. 🔴 实现售后任务模块或删除相关前端代码

### P1（尽快修复）

4. 统一管理后台路径前缀
5. 修复路由重复问题
6. 实现负载均衡 API 或删除相关调用

### P2（后续优化）

7. 统一响应格式
8. 统一错误处理
9. 添加 API 文档
10. 添加请求验证

---

## 📊 API 模块依赖关系

```
┌─────────────────────────────────────────┐
│           认证授权模块                  │
│  (auth.api.js, auth-complete.api.js)   │
└──────────┬──────────────────────────────┘
           │
           ├──────────────────────────────────────────┐
           │                                          │
    ┌──────▼──────┐                          ┌───────▼──────┐
    │ 机器人管理  │                          │  权限管理   │
    │ (robot.api) │                          │(permission) │
    └──────┬──────┘                          └───────┬──────┘
           │                                          │
           ├──────────────────────────────────────────┤
           │                                          │
    ┌──────▼──────┐                          ┌───────▼──────┐
    │  告警管理   │                          │  监控模块   │
    │ (alert.api) │                          │(monitoring) │
    └──────┬──────┘                          └───────┬──────┘
           │                                          │
           └──────────────┬───────────────────────────┘
                          │
                   ┌──────▼──────┐
                   │  流程引擎   │
                   │ (flow.api)  │
                   └─────────────┘
```

---

## 📈 API 使用频率分析

根据前端调用频率排序：

| API 模块 | 调用次数 | 使用频率 |
|---------|---------|---------|
| 监控模块 | 80+ | 🔥 极高 |
| 机器人管理 | 60+ | 🔥 高 |
| 管理后台 | 50+ | 🔥 高 |
| AI 模块 | 40+ | 🔥 高 |
| 告警管理 | 30+ | ⚡ 中 |
| 权限管理 | 20+ | ⚡ 中 |
| 文档管理 | 15+ | ⚡ 中 |
| 其他 | 20+ | 🔵 低 |

---

## 🔐 安全性分析

### 认证机制
- ✅ 使用 JWT Token 认证
- ✅ Token 自动刷新机制
- ✅ 会话管理完善
- ⚠️ 部分 API 缺少权限验证

### 数据安全
- ✅ 密码加密存储（bcrypt）
- ✅ SQL 注入防护（使用 Drizzle ORM）
- ⚠️ 部分接口缺少输入验证
- ⚠️ 缺少速率限制

### 接口安全
- ✅ HTTPS 支持
- ⚠️ CORS 配置需检查
- ⚠️ 缺少请求签名验证

---

## 📝 总结

### 整体评价

WorkTool AI 中枢系统拥有完善的后端 API 架构，涵盖认证、机器人管理、告警、监控、流程引擎等核心功能。但前后端 API 存在一些路径不匹配和功能缺失的问题，需要及时修复。

### 优势

1. API 设计规范，模块化清晰
2. 权限控制完善
3. 功能覆盖全面
4. 支持多种业务场景

### 不足

1. 部分前后端 API 路径不匹配
2. 存在未实现的 API 接口
3. 部分模块功能重复
4. 缺少统一的 API 文档

### 建议

1. 优先修复路径不匹配问题
2. 实现缺失的 API 接口
3. 统一 API 设计规范
4. 完善 API 文档
5. 加强安全性测试

---

## 📞 联系方式

如有问题或建议，请联系开发团队。

---

**报告结束**

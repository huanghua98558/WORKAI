# WorkTool AI 2.1 - 系统改造计划

## 📋 概述

基于现有系统分析，制定渐进式改造计划，优先级从高到低，分阶段实施。

## 🎯 改造原则

1. **保留现有功能**：不删除或修改已有代码
2. **渐进式增强**：按需新增功能
3. **最小化改动**：避免大规模重构
4. **测试先行**：每次改动后充分测试

---

## 📊 改造计划（按优先级）

### 🥇 第一阶段：数据库基础（最高优先级）

#### 目标
建立核心数据模型，为后续功能提供数据基础。

#### 任务列表

##### 1.1 创建数据库Schema ⭐⭐⭐
**优先级**：P0（最高）

**任务**：
- [ ] 创建 `src/storage/database/new-schemas/messages.ts`
- [ ] 创建 `src/storage/database/new-schemas/sessions.ts`
- [ ] 创建 `src/storage/database/new-schemas/robots.ts`
- [ ] 创建 `src/storage/database/new-schemas/staff.ts`
- [ ] 创建 `src/storage/database/new-schemas/intents.ts`
- [ ] 创建 `src/storage/database/new-schemas/index.ts`

**说明**：
- 基于 Drizzle ORM 定义表结构
- 包含完整的字段定义、索引、约束
- 参考 ARCHITECTURE.md 中的数据库设计

**预计时间**：2-3天

##### 1.2 数据库迁移
**优先级**：P0（最高）

**任务**：
- [ ] 创建迁移脚本 `scripts/migrate-db.sh`
- [ ] 执行数据库迁移
- [ ] 验证表结构正确性

**预计时间**：1天

##### 1.3 数据访问层
**优先级**：P1（高）

**任务**：
- [ ] 创建 `src/lib/db/queries/messages.ts`
- [ ] 创建 `src/lib/db/queries/sessions.ts`
- [ ] 创建 `src/lib/db/queries/robots.ts`
- [ ] 创建 `src/lib/db/queries/staff.ts`
- [ ] 创建 `src/lib/db/queries/intents.ts`

**说明**：
- 实现基本的 CRUD 操作
- 实现复杂查询（会话统计、消息搜索等）

**预计时间**：2-3天

---

### 🥈 第二阶段：核心服务（高优先级）

#### 目标
实现核心业务逻辑，支持消息处理和会话管理。

#### 任务列表

##### 2.1 消息收集服务
**优先级**：P0（最高）

**任务**：
- [ ] 创建 `src/lib/services/message-service.ts`
  - [ ] 消息接收与解析
  - [ ] 消息验证
  - [ ] 消息持久化
  - [ ] 触发后续处理流程

**说明**：
- 整合到现有的 `/api/ai-io/route.ts`
- 复用现有逻辑，新增会话管理

**预计时间**：2天

##### 2.2 会话管理服务
**优先级**：P0（最高）

**任务**：
- [ ] 创建 `src/lib/services/session-service.ts`
  - [ ] 会话创建与更新
  - [ ] 会话状态维护
  - [ ] 会话统计更新
  - [ ] 会话超时处理

**预计时间**：2天

##### 2.3 发送者识别服务
**优先级**：P1（高）

**任务**：
- [ ] 创建 `src/lib/services/sender-identification.ts`
  - [ ] 消息发送者类型识别
  - [ ] 工作人员匹配
  - [ ] 用户画像更新

**预计时间**：1天

##### 2.4 AI服务集成增强
**优先级**：P1（高）

**任务**：
- [ ] 增强 `src/lib/services/ai-integration.ts`
  - [ ] 历史消息检索
  - [ ] 上下文构建
  - [ ] 意图识别
  - [ ] Prompt构建
  - [ ] LLM调用优化

**说明**：
- 整合到现有的 `/api/ai/` 和 `/server/services/ai/`
- 增强现有功能，不替换

**预计时间**：3天

---

### 🥉 第三阶段：API接口（中优先级）

#### 目标
提供完整的 RESTful API 和 SSE 实时流接口。

#### 任务列表

##### 3.1 消息API
**优先级**：P0（最高）

**任务**：
- [ ] 创建 `src/app/api/messages/route.ts`
  - [ ] POST /api/messages - 上报消息
  - [ ] GET /api/messages - 消息列表
  - [ ] 创建 `src/app/api/messages/[id]/route.ts`
  - [ ] GET /api/messages/:id - 消息详情
  - [ ] 创建 `src/app/api/messages/stream/route.ts`
  - [ ] GET /api/messages/stream - 消息实时流（SSE）

**预计时间**：2天

##### 3.2 会话API
**优先级**：P0（最高）

**任务**：
- [ ] 创建 `src/app/api/sessions/route.ts`
  - [ ] GET /api/sessions - 会话列表
  - [ ] 创建 `src/app/api/sessions/[id]/route.ts`
  - [ ] GET /api/sessions/:id - 会话详情
  - [ ] 创建 `src/app/api/sessions/[id]/messages/route.ts`
  - [ ] GET /api/sessions/:id/messages - 会话消息
  - [ ] 创建 `src/app/api/sessions/stream/route.ts`
  - [ ] GET /api/sessions/stream - 会话实时流（SSE）
  - [ ] 创建 `src/app/api/sessions/active/route.ts`
  - [ ] GET /api/sessions/active - 活跃会话

**预计时间**：2天

##### 3.3 工作人员API
**优先级**：P1（高）

**任务**：
- [ ] 创建 `src/app/api/staff/route.ts`
  - [ ] GET /api/staff - 工作人员列表
  - [ ] POST /api/staff - 创建工作人员
  - [ ] 创建 `src/app/api/staff/[id]/route.ts`
  - [ ] GET /api/staff/:id - 工作人员详情
  - [ ] PUT /api/staff/:id - 更新工作人员
  - [ ] 创建 `src/app/api/staff/[id]/sessions/route.ts`
  - [ ] GET /api/staff/:id/sessions - 当前会话
  - [ ] 创建 `src/app/api/staff/workload/route.ts`
  - [ ] GET /api/staff/workload - 工作负载

**预计时间**：2天

##### 3.4 统计API
**优先级**：P2（中）

**任务**：
- [ ] 创建 `src/app/api/stats/sessions/route.ts`
  - [ ] GET /api/stats/sessions - 会话统计
- [ ] 创建 `src/app/api/stats/messages/route.ts`
  - [ ] GET /api/stats/messages - 消息统计
- [ ] 创建 `src/app/api/stats/staff/route.ts`
  - [ ] GET /api/stats/staff - 工作人员统计
- [ ] 创建 `src/app/api/stats/ai/route.ts`
  - [ ] GET /api/stats/ai - AI统计

**预计时间**：2天

##### 3.5 API客户端
**优先级**：P2（中）

**任务**：
- [ ] 创建 `src/lib/api/messages.ts`
- [ ] 创建 `src/lib/api/sessions.ts`
- [ ] 创建 `src/lib/api/staff.ts`
- [ ] 创建 `src/lib/api/stats.ts`

**预计时间**：1天

---

### 🏅 第四阶段：前端页面（中优先级）

#### 目标
实现新的前端页面，提供完整的用户界面。

#### 任务列表

##### 4.1 会话分析页面
**优先级**：P1（高）

**任务**：
- [ ] 创建 `src/app/sessions/layout.tsx`
- [ ] 创建 `src/app/sessions/page.tsx` - 会话列表
  - [ ] 会话列表组件
  - [ ] 会话过滤器
  - [ ] 会话统计卡片
- [ ] 创建 `src/app/sessions/[sessionId]/page.tsx` - 会话详情
  - [ ] 会话头部组件
  - [ ] 消息列表组件
  - [ ] 满意度面板
  - [ ] 时间线组件

**预计时间**：3-4天

##### 4.2 工作人员管理页面
**优先级**：P1（高）

**任务**：
- [ ] 创建 `src/app/staff/layout.tsx`
- [ ] 创建 `src/app/staff/page.tsx` - 工作人员列表
  - [ ] 工作人员列表组件
  - [ ] 工作人员卡片
  - [ ] 创建工作人员对话框
- [ ] 创建 `src/app/staff/[staffId]/page.tsx` - 工作人员详情
  - [ ] 工作人员详情组件
  - [ ] 工作负载图表
  - [ ] 工作时间配置
- [ ] 创建 `src/app/staff/[staffId]/settings/page.tsx` - 工作人员设置

**预计时间**：3-4天

##### 4.3 流程编辑器页面
**优先级**：P2（中）

**任务**：
- [ ] 创建 `src/app/flows/layout.tsx`
- [ ] 创建 `src/app/flows/page.tsx` - 流程列表
  - [ ] 流程列表组件
  - [ ] 创建流程对话框
- [ ] 创建 `src/app/flows/[flowId]/page.tsx` - 流程编辑器
  - [ ] 流程画布组件（基于 React Flow）
  - [ ] 节点调色板
  - [ ] 属性面板
  - [ ] 工具栏
- [ ] 创建 `src/app/flows/[flowId]/settings/page.tsx` - 流程设置

**说明**：
- 可复用现有的 `flow-engine-manage` 组件
- 增强现有功能

**预计时间**：5-7天

##### 4.4 数据报表页面
**优先级**：P2（中）

**任务**：
- [ ] 创建 `src/app/reports/layout.tsx`
- [ ] 创建 `src/app/reports/page.tsx` - 报表列表
  - [ ] 报表列表组件
  - [ ] 报表卡片
- [ ] 创建 `src/app/reports/[reportId]/page.tsx` - 报表详情
  - [ ] 报表图表组件
  - [ ] 报表导出功能
- [ ] 创建 `src/app/reports/generate/page.tsx` - 生成报表

**预计时间**：3-4天

##### 4.5 设置中心扩展
**优先级**：P3（低）

**任务**：
- [ ] 创建 `src/app/settings/general/page.tsx` - 通用设置
  - [ ] 界面设置
  - [ ] 用户偏好
  - [ ] 系统信息

**预计时间**：1-2天

---

### 🎖️ 第五阶段：增强功能（低优先级）

#### 目标
实现满意度推断、协同决策等高级功能。

#### 任务列表

##### 5.1 满意度推断服务
**优先级**：P2（中）

**任务**：
- [ ] 创建 `src/lib/services/satisfaction-inference.ts`
  - [ ] 对话质量分析
  - [ ] 满意度评分
  - [ ] 问题类型识别
  - [ ] 改进建议生成
- [ ] 创建数据库表 `satisfaction`
- [ ] 集成到消息处理流程

**预计时间**：3-4天

##### 5.2 协同决策服务增强
**优先级**：P2（中）

**任务**：
- [ ] 创建数据库表 `collaborations`
- [ ] 增强 `src/lib/services/collaborative-decision.ts`
  - [ ] 工作人员分配优化
  - [ ] 介入效果评估
  - [ ] 优化建议生成
- [ ] 集成到介入判断流程

**说明**：
- 整合到现有的 `/api/collab/` API

**预计时间**：2-3天

##### 5.3 介入判断服务增强
**优先级**：P2（中）

**任务**：
- [ ] 创建数据库表 `staff_interventions`
- [ ] 增强 `src/lib/services/intervention-judgment.ts`
  - [ ] 规则引擎完善
  - [ ] 置信度评估
  - [ ] 排除条件检查
- [ ] 集成到消息处理流程

**说明**：
- 整合到现有的 `riskMessages` 和 `collab` API

**预计时间**：2-3天

##### 5.4 流程引擎增强
**优先级**：P3（低）

**任务**：
- [ ] 创建数据库表 `flow_definitions`
- [ ] 创建数据库表 `flow_executions`
- [ ] 增强流程执行引擎
  - [ ] 复杂流程控制
  - [ ] 错误处理
  - [ ] 性能优化

**说明**：
- 整合到现有的 `/api/flow-engine/` API

**预计时间**：5-7天

---

### 🏆 第六阶段：优化与测试（持续）

#### 目标
优化性能、完善测试、编写文档。

#### 任务列表

##### 6.1 性能优化
**优先级**：P2（中）

**任务**：
- [ ] 数据库查询优化
- [ ] Redis缓存优化
- [ ] API响应时间优化
- [ ] 前端渲染优化

**预计时间**：3-5天

##### 6.2 测试
**优先级**：P2（中）

**任务**：
- [ ] 单元测试
  - [ ] 服务层测试
  - [ ] 数据访问层测试
  - [ ] API测试
- [ ] 集成测试
  - [ ] 端到端测试
  - [ ] 性能测试

**预计时间**：5-7天

##### 6.3 文档
**优先级**：P3（低）

**任务**：
- [ ] API文档更新
- [ ] 数据库文档更新
- [ ] 开发文档更新
- [ ] 部署文档更新

**预计时间**：2-3天

---

## 📅 实施时间表

| 阶段 | 任务 | 预计时间 | 优先级 |
|------|------|----------|--------|
| 第一阶段 | 数据库基础 | 5-7天 | P0-P1 |
| 第二阶段 | 核心服务 | 8-10天 | P0-P1 |
| 第三阶段 | API接口 | 9-11天 | P0-P2 |
| 第四阶段 | 前端页面 | 12-18天 | P1-P3 |
| 第五阶段 | 增强功能 | 12-17天 | P2-P3 |
| 第六阶段 | 优化测试 | 10-15天 | P2-P3 |
| **总计** | | **56-78天** | |

**说明**：
- P0：必须实现，阻塞后续功能
- P1：高优先级，影响核心体验
- P2：中优先级，增强功能
- P3：低优先级，锦上添花

---

## 🎯 里程碑

### 里程碑1：数据基础完成（第1-2周）
- ✅ 数据库Schema创建完成
- ✅ 数据迁移完成
- ✅ 数据访问层完成

**验收标准**：
- 所有核心表创建成功
- 基本CRUD操作正常
- 查询性能满足要求

### 里程碑2：核心服务完成（第3-4周）
- ✅ 消息收集服务完成
- ✅ 会话管理服务完成
- ✅ 发送者识别服务完成
- ✅ AI服务集成增强完成

**验收标准**：
- 消息正常接收和处理
- 会话正常创建和管理
- 发送者识别准确
- AI回复正常生成

### 里程碑3：API接口完成（第5-6周）
- ✅ 消息API完成
- ✅ 会话API完成
- ✅ 工作人员API完成
- ✅ 统计API完成

**验收标准**：
- 所有API接口正常工作
- SSE实时流正常
- API文档完整

### 里程碑4：核心页面完成（第7-10周）
- ✅ 会话分析页面完成
- ✅ 工作人员管理页面完成

**验收标准**：
- 页面UI完整
- 功能正常
- 用户体验良好

### 里程碑5：扩展功能完成（第11-14周）
- ✅ 流程编辑器页面完成
- ✅ 数据报表页面完成
- ✅ 满意度推断服务完成

**验收标准**：
- 扩展功能正常
- 与现有功能整合良好

### 里程碑6：系统优化完成（第15-17周）
- ✅ 性能优化完成
- ✅ 测试完成
- ✅ 文档完成

**验收标准**：
- 性能满足要求
- 测试覆盖率达标
- 文档完整

---

## ⚠️ 风险与应对

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 数据库迁移失败 | 高 | 中 | 先在测试环境验证，做好备份 |
| 现有功能被破坏 | 高 | 低 | 充分测试，保持向后兼容 |
| 性能不达标 | 中 | 中 | 提前进行性能测试，优化查询 |
| 时间延期 | 中 | 高 | 合理安排任务，优先P0-P1 |
| 团队协作问题 | 低 | 低 | 定期沟通，明确职责 |

---

## 📝 注意事项

1. **增量开发**：每个阶段完成后进行验收，再进入下一阶段
2. **持续集成**：每次改动后运行测试，确保不破坏现有功能
3. **代码审查**：关键代码需要团队审查
4. **用户反馈**：定期收集用户反馈，及时调整
5. **文档同步**：保持文档与代码同步更新

---

## 🚀 快速启动

### 立即开始（P0任务）

```bash
# 1. 创建数据库Schema
# 创建 src/storage/database/new-schemas/messages.ts
# 创建 src/storage/database/new-schemas/sessions.ts

# 2. 执行迁移
pnpm db:push

# 3. 实现消息收集服务
# 创建 src/lib/services/message-service.ts

# 4. 实现会话管理服务
# 创建 src/lib/services/session-service.ts

# 5. 创建消息API
# 创建 src/app/api/messages/route.ts
```

---

**文档版本**: v1.0
**最后更新**: 2025-01-09
**维护者**: WorkTool AI Team

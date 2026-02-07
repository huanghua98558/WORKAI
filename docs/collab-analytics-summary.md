# 协同分析模块 - 配合需求总结（简洁版）

## 🎯 核心配合板块（5个）

### 1️⃣ 机器人管理 ⭐⭐⭐⭐⭐
**提供**: 机器人列表、状态、分组
**需要**: robot_id, robot_name, robot_status, business_roles[]
**用途**: 按机器人筛选、分析机器人效能

### 2️⃣ 业务角色管理 ⭐⭐⭐⭐⭐（最重要）
**提供**: 角色定义、AI行为、关键词、工作人员识别
**需要**: id, name, code, aiBehavior, staffTypeFilter, keywords
**用途**:
  - 决策时记录 business_role
  - 按角色分析 AI 效能
  - 关键词触发分析
  - 工作人员类型筛选

### 3️⃣ 工作人员管理 ⭐⭐⭐⭐
**提供**: 工作人员信息、状态、会话数
**需要**: staff_user_id, staff_name, staff_type（需新增）, status
**用途**: 工作人员活跃度分析、按类型分析

### 4️⃣ 会话管理 ⭐⭐⭐⭐⭐
**提供**: 会话信息、状态、消息统计
**需要**: session_id, robot_id, staff_user_id, has_staff_intervention（已有）
**用途**:
  - 计算协同率
  - 统计 AI vs 工作人员回复数
  - 分析会话质量

### 5️⃣ 监控大屏 ⭐⭐⭐⭐
**提供**: 实时监控、健康度、成功率
**需要**: robot_id, health_score, collaboration_rate（需新增）
**用途**: 实时显示协同指标、预警

---

## 🔧 次要配合板块（2个）

### 6️⃣ 指令发送 ⭐⭐⭐
**可选**: 在指令中记录业务角色
**用途**: 分析业务角色的指令执行效率

### 7️⃣ 知识库 ⭐⭐
**可选**: 关键词关联业务角色
**用途**: 优化关键词配置

---

## 📊 数据流简化图

```
用户消息
  ↓
机器人处理
  ↓
查询业务角色 (robot_id → business_roles)
  ↓
匹配关键词 + 检查AI行为 + 检查工作人员识别
  ↓
决策 (AI回复 / 工作人员回复)
  ↓
记录决策日志
  ├─→ business_role ✅
  ├─→ robot_id
  └─→ session_id
  ↓
【新建】创建任务 + 关键词触发 + 工作人员活动
  ↓
协同分析统计
```

---

## 🔵 需要新增的内容

### 数据库（5个）

1. ✅ `collaboration_decision_logs.business_role` - 已有
2. 🔵 `staff_activities.staff_type` - 需要添加
3. 🔵 `sessions.business_role` - 需要添加
4. ✅ `tasks` 表 - 待创建（已有脚本）
5. ✅ `keyword_triggers` 表 - 待创建（已有脚本）

### API（4个）

1. 🔵 `GET /api/collaboration/by-business-role` - 按业务角色统计
2. 🔵 `GET /api/collaboration/keywords` - 关键词分析
3. 🔵 `GET /api/collaboration/tasks` - 任务统计
4. 🔵 `GET /api/collaboration/staff-type` - 按工作人员类型统计

### 前端（3个标签页）

1. 🔵 业务角色分析 - 角色效能对比
2. 🔵 关键词分析 - 触发统计、优化建议
3. 🔵 任务分析 - 任务完成率、时效性

---

## ⏱️ 实施计划

### 阶段 1: 核心配合（1-2天）
- ✅ 确认 business_role 字段使用
- 🔵 添加 staff_type 字段
- 🔵 添加 sessions.business_role 字段
- 🔵 创建 tasks 和 keyword_triggers 表
- 🔵 开发按业务角色统计 API

### 阶段 2: 数据注入（2-3天）
- 🔵 修改决策逻辑，注入 business_role
- 🔵 修改工作人员活动记录，注入 staff_type
- 🔵 实现任务创建功能
- 🔵 实现关键词触发记录功能

### 阶段 3: 前端展示（3-4天）
- 🔵 业务角色分析标签页
- 🔵 关键词分析标签页
- 🔵 任务分析标签页

### 阶段 4: 增强功能（2-3天）
- 🔵 监控大屏显示协同指标
- 🔵 指令发送支持业务角色选择

**总计：8-12天**

---

## 🎬 快速开始

### 立即可做（P0）

1. **查看已有表结构**
   ```bash
   drizzle-kit introspect
   ```

2. **执行数据库脚本**
   ```bash
   psql -f scripts/create-collab-tables.sql
   ```

3. **确认业务角色字段**
   - 检查 `collaboration_decision_logs.business_role` 是否已使用

4. **开始开发 API**
   - 先实现 `GET /api/collaboration/by-business-role`

### 后续优化（P1-P2）

1. 添加 `staff_type` 字段到 `staff_activities`
2. 添加 `business_role` 字段到 `sessions`
3. 开发前端标签页
4. 集成到监控大屏

---

## 💡 关键要点

1. **业务角色是核心** - 所有协同分析都围绕业务角色展开
2. **数据注入是关键** - 决策时必须记录 business_role
3. **数据库是基础** - tasks 和 keyword_triggers 表必须先创建
4. **API 是桥梁** - 先开发后端 API，再开发前端展示
5. **分阶段实施** - 先核心，后增强，逐步完善

---

## 📝 下一步行动

1. ✅ 阅读本文档
2. 🔵 审查 `scripts/create-collab-tables.sql`
3. 🔵 确认数据库连接和权限
4. 🔵 开始开发按业务角色统计的 API
5. 🔵 更新 TODO 列表，跟踪进度

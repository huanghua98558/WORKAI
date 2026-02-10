# WorkTool AI 数据库迁移自动化机制

## 📋 概述

本文档描述了 WorkTool AI 项目的数据库迁移自动化机制，确保数据库结构与 schema.js 保持一致，避免遗漏表的问题。

---

## 🎯 目标

1. ✅ 自动检查数据库与 schema.js 的一致性
2. ✅ 自动生成迁移脚本
3. ✅ 自动应用迁移
4. ✅ 版本化迁移历史
5. ✅ 避免手动迁移导致的问题

---

## 🛠️ 自动化工具

### 1. 数据库一致性检查脚本

**文件：** `scripts/check-db-consistency.js`

**功能：**
- 对比 schema.js 和数据库
- 检测缺失的表
- 检测额外的表
- 按模块统计完整性

**使用方法：**

```bash
# 运行一致性检查
node scripts/check-db-consistency.js

# 输出示例：
✅ 用户管理: 3/3 (100%)
✅ 会话管理: 5/5 (100%)
✅ 流程引擎: 3/3 (100%)
...
✅ 检查完成
```

**集成到CI/CD：**

```yaml
# .github/workflows/db-check.yml
name: Database Consistency Check

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node scripts/check-db-consistency.js
```

---

### 2. Drizzle Kit 配置

**文件：** `drizzle.config.js`

**配置内容：**

```javascript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/database/schema.js',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: false,
  },
  verbose: true,
  strict: true,
});
```

---

### 3. Drizzle Kit 命令

#### 生成迁移文件

```bash
# 生成迁移文件（基于 schema.js）
pnpm drizzle-kit generate

# 输出：
# ✅ Generated 3 migrations
# drizzle/0001_init.sql
# drizzle/0002_add_sessions.sql
# drizzle/0003_add_ai_tables.sql
```

#### 应用迁移

```bash
# 应用所有迁移
pnpm drizzle-kit migrate

# 应用特定迁移
pnpm drizzle-kit migrate --custom
```

#### 推送 schema（开发环境）

```bash
# 直接推送 schema 到数据库（仅开发环境）
pnpm drizzle-kit push

# 使用 --strict 模式（会要求确认）
pnpm drizzle-kit push --strict
```

#### 检查数据库状态

```bash
# 查看数据库状态
pnpm drizzle-kit studio

# 打开浏览器访问：http://localhost:4983
```

---

## 🔄 迁移工作流程

### 开发流程

```
1. 修改 schema.js
   ↓
2. 生成迁移文件
   pnpm drizzle-kit generate
   ↓
3. 检查生成的 SQL
   查看 drizzle/*.sql
   ↓
4. 应用迁移
   pnpm drizzle-kit migrate
   ↓
5. 验证数据库
   node scripts/check-db-consistency.js
   ↓
6. 提交代码
   git add drizzle/*.sql
   git commit -m "feat: add new table"
```

### 生产流程

```
1. 开发环境测试迁移
   pnpm drizzle-kit migrate
   ↓
2. 备份生产数据库
   在阿里云控制台创建快照
   ↓
3. 应用迁移到生产
   pnpm drizzle-kit migrate
   ↓
4. 验证生产数据库
   node scripts/check-db-consistency.js
   ↓
5. 监控数据库性能
   检查慢查询日志
   ↓
6. 如有问题，回滚
   从快照恢复
```

---

## 📦 迁移脚本

### 已创建的迁移脚本

| 脚本 | 说明 | 使用场景 |
|------|------|---------|
| `scripts/db-init-full.js` | 初始化12张基础表 | 首次部署 |
| `scripts/db-migrate-p0.js` | 迁移7张P0核心表 | 核心功能 |
| `scripts/db-migrate-p1.js` | 迁移11张P1重要表 | AI、机器人、协同 |
| `scripts/db-migrate-p2.js` | 迁移13张P2增强表 | 审计、统计、日志 |
| `scripts/check-db-consistency.js` | 数据库一致性检查 | 定期检查、CI/CD |

### 使用迁移脚本

```bash
# 完整初始化（包含所有表）
node scripts/db-init-full.js && \
node scripts/db-migrate-p0.js && \
node scripts/db-migrate-p1.js && \
node scripts/db-migrate-p2.js

# 分阶段迁移（推荐）
node scripts/db-migrate-p0.js   # 核心功能
node scripts/db-migrate-p1.js   # 重要功能
node scripts/db-migrate-p2.js   # 增强功能

# 检查数据库状态
node scripts/check-db-consistency.js
```

---

## 🔒 最佳实践

### 1. 使用 Drizzle Kit（推荐）

```bash
# ✅ 推荐：使用 Drizzle Kit
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# ❌ 不推荐：手动写 SQL
# 容易出错，难以维护
```

### 2. 版本化迁移

```bash
# ✅ 迁移文件应该提交到 Git
drizzle/0001_init.sql
drizzle/0002_add_sessions.sql
drizzle/0003_add_ai_tables.sql

# ❌ 不要删除旧的迁移文件
# 否则无法回滚
```

### 3. 生产前测试

```bash
# ✅ 在测试环境先测试迁移
# 通过后再应用到生产

# ❌ 不要直接在生产环境应用未测试的迁移
```

### 4. 定期备份

```bash
# ✅ 定期备份数据库
# 在阿里云控制台设置自动备份（每天）

# ❌ 不要在生产环境迁移前不备份
```

### 5. 一致性检查

```bash
# ✅ 定期运行一致性检查
node scripts/check-db-consistency.js

# ❌ 不要忽视一致性检查的结果
```

---

## 📊 当前状态

### 数据库统计

```
总表数：43张
  - 用户管理：3张 ✅
  - 会话管理：5张 ✅
  - 流程引擎：3张 ✅
  - AI服务：8张 ✅
  - 机器人管理：5张 ✅
  - 告警系统：5张 ✅
  - 协同分析：5张 ✅
  - Prompt管理：3张 ✅
  - 文档管理：1张 ✅
  - 系统配置：3张 ✅
  - API日志：2张 ✅

完整性：100% ✅
```

### 迁移历史

```
阶段1：初始迁移（12张表）
  - 基础会话管理
  - 机器人管理
  - 告警系统

阶段2：P0核心表（7张表）
  - 用户表
  - 流程引擎
  - Prompt管理
  - 系统设置

阶段3：P1重要表（11张表）
  - AI服务
  - 机器人命令
  - 协同分析
  - 文档管理

阶段4：P2增强表（13张表）
  - AI版本管理
  - 审计日志
  - 统计分析
  - API日志
```

---

## 🚀 下一步

### 立即行动

1. ✅ 使用 Drizzle Kit 生成迁移文件
2. ✅ 应用迁移到数据库
3. ✅ 运行一致性检查
4. ✅ 集成到 CI/CD

### 长期改进

1. ✅ 建立迁移版本管理
2. ✅ 自动化迁移流程
3. ✅ 监控迁移性能
4. ✅ 文档化最佳实践

---

## 📚 相关文档

- `docs/optimization-plan.md` - 数据库优化方案
- `docs/database-migration-analysis.md` - 数据库迁移分析
- `docs/database-migration-p0-complete.md` - P0迁移完成文档
- `server/database/schema.js` - 数据库 schema 定义

---

## 🎯 总结

**数据库迁移自动化机制已建立！**

✅ 一致性检查脚本（`scripts/check-db-consistency.js`）
✅ Drizzle Kit 配置（`drizzle.config.js`）
✅ 迁移工作流程
✅ 最佳实践文档
✅ 数据库完整性：100%

**建议：**
- 使用 Drizzle Kit 进行日常迁移
- 定期运行一致性检查
- 集成到 CI/CD 流程
- 生产环境迁移前先测试

---

**生成时间：** 2024年
**状态：** ✅ 已完成
**数据库完整性：** 100% (43/43张表)

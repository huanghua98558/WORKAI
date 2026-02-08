# 数据初始化说明

## 概述

本项目包含多个种子数据初始化脚本，用于在首次部署或需要重置数据时初始化必要的数据库数据。

## 种子数据内容

### 1. AI 模块数据 (`server/scripts/seed-ai-data.js`)
- AI 提供商（豆包、DeepSeek、Kimi）
- AI 模型（10个内置模型）
- AI 角色（7个预设角色）

### 2. 意图配置和告警规则 (`server/scripts/seed-intent-alert.js`)
- 意图配置（7个）
- 告警规则（4个）
- 通知方式（1个）

### 3. 流程定义 (`server/scripts/import-default-flows.js`)
- 协作决策流程
- 人工转接流程
- 统一告警处理流程
- 统一消息处理流程

## 使用方法

### 方式一：自动初始化（推荐）

在启动生产环境时，`scripts/start.sh` 会自动执行数据初始化：

```bash
# 启动生产环境（会自动初始化数据）
./scripts/start.sh
```

### 方式二：手动初始化

如果需要手动初始化数据，可以使用以下命令：

```bash
# 使用统一初始化脚本
./scripts/init-data.sh
```

或者直接运行 Node.js 脚本：

```bash
# 初始化所有数据
node server/scripts/init-all-data.js

# 单独初始化某个模块
node server/scripts/seed-ai-data.js
node server/scripts/seed-intent-alert.js
node server/scripts/import-default-flows.js
```

### 方式三：开发环境

在开发环境中，首次启动后也可以手动运行初始化脚本：

```bash
# 确保后端服务已启动
cd server && node app.js

# 在另一个终端窗口执行初始化
./scripts/init-data.sh
```

## 初始化策略

所有种子脚本都采用"幂等性"设计：
- ✅ 如果数据已存在，会跳过初始化
- ✅ 不会重复插入相同的数据
- ✅ 支持多次运行而不产生错误

## 故障排查

### 问题：数据库连接失败
**错误信息**: `ECONNREFUSED` 或 `Connection refused`

**解决方案**:
1. 确保数据库服务正在运行
2. 检查 `.env` 文件中的数据库配置
3. 验证数据库连接字符串是否正确

### 问题：端口被占用
**错误信息**: `Port 5001 in use`

**解决方案**:
```bash
# 查找占用端口的进程
ss -lntp | grep 5001

# 杀死占用端口的进程
kill -9 <PID>
```

### 问题：数据已存在警告
**错误信息**: `数据已存在，跳过初始化`

**说明**: 这是正常的，说明数据已经初始化过了。如果需要重新初始化，请先清理数据库。

## 注意事项

1. **生产环境**: 首次部署时，`start.sh` 会自动执行数据初始化，无需手动操作
2. **开发环境**: 可以随时手动运行初始化脚本来同步数据
3. **数据安全**: 初始化脚本不会删除现有数据，只会添加缺失的数据
4. **日志查看**: 初始化日志会输出到 `logs/data-init.log`（如果存在）

## 验证数据

初始化完成后，可以通过以下方式验证数据：

### 使用 API

```bash
# 检查 AI 模型
curl http://localhost:5001/api/ai/models

# 检查流程定义
curl http://localhost:5001/api/flow-engine/definitions
```

### 使用数据库

```bash
# 连接到数据库并查询
psql $DATABASE_URL -c "SELECT COUNT(*) FROM ai_models;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM flow_definitions;"
```

### 使用前端界面

访问管理后台页面：
- AI 模块：http://localhost:5000/#ai-module
- 流程引擎：http://localhost:5000/#flow-engine

## 更新种子数据

如果需要更新种子数据：

1. 修改对应的种子脚本文件
2. 重新运行初始化脚本
3. 验证数据是否正确更新

## 相关文件

- `server/scripts/init-all-data.js` - 统一初始化脚本
- `server/scripts/seed-ai-data.js` - AI 模块数据
- `server/scripts/seed-intent-alert.js` - 意图和告警数据
- `server/scripts/import-default-flows.js` - 流程定义
- `scripts/init-data.sh` - 初始化命令行工具
- `scripts/start.sh` - 生产环境启动脚本（包含自动初始化）

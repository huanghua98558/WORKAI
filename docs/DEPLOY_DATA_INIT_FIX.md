# 部署数据初始化问题修复说明

## 问题描述

部署到生产环境后，数据和开发环境不一致，导致前端无法正常显示默认AI模型和流程引擎板块数据。

## 根本原因

1. **缺少数据初始化流程**：部署脚本 `scripts/start.sh` 没有包含数据初始化步骤
2. **种子脚本不兼容**：现有的种子数据脚本（`seed-ai-data.js`、`seed-intent-alert.js`）在直接运行时会调用 `process.exit()`，导致无法被主初始化脚本调用
3. **流程文件名不匹配**：`import-default-flows.js` 中定义的流程文件名与实际文件名不一致

## 解决方案

### 1. 创建统一数据初始化脚本

创建了 `server/scripts/init-all-data.js`，用于统一执行所有数据初始化：
- AI 模块数据（提供商、模型、角色）
- 意图配置和告警规则
- 流程定义

### 2. 修改种子脚本

修改了以下种子脚本，使其可以被主脚本调用：

#### `server/scripts/seed-ai-data.js`
- 移除直接调用 `process.exit()`
- 使用 Promise 链式调用
- 导出 `seedData()` 函数供外部调用

#### `server/scripts/seed-intent-alert.js`
- 移除直接调用 `process.exit()`
- 使用 Promise 链式调用
- 导出 `seedIntentAndAlertData()` 函数供外部调用

#### `server/scripts/import-default-flows.js`
- 修正流程文件名与实际文件匹配
- 保持模块化结构

### 3. 集成到部署流程

修改了 `scripts/start.sh`，在服务启动后自动执行数据初始化：

```bash
# 执行数据初始化
echo "🔍 检查并初始化种子数据..."
if [ -f "server/scripts/init-all-data.js" ]; then
    if [ "$IS_READONLY_FILESYSTEM" = true ]; then
        # 只读文件系统：不重定向日志
        node server/scripts/init-all-data.js
    else
        # 可写文件系统：重定向日志
        node server/scripts/init-all-data.js >> logs/data-init.log 2>&1
    fi
    if [ $? -eq 0 ]; then
        echo "✅ 数据初始化完成"
    else
        echo "⚠️  数据初始化遇到问题，但服务将继续运行"
    fi
else
    echo "⚠️  未找到数据初始化脚本，跳过"
fi
```

### 4. 创建辅助工具

创建了 `scripts/init-data.sh`，用于手动执行数据初始化：

```bash
./scripts/init-data.sh
```

### 5. 编写文档

创建了 `docs/DATA_INIT.md`，详细说明：
- 种子数据内容
- 使用方法（自动/手动）
- 故障排查指南
- 验证数据的方法

## 修复后的效果

### 初始化数据统计

运行初始化脚本后，数据库中的数据：

| 数据类型 | 数量 | 说明 |
|---------|------|------|
| AI 提供商 | 3 | 豆包、DeepSeek、Kimi |
| AI 模型 | 15 | 内置模型 + 自定义模型 |
| AI 角色 | 7 | 预设角色 |
| 意图配置 | 7 | 服务请求、帮助请求、日常对话等 |
| 告警规则 | 4 | 风险告警、垃圾信息过滤等 |
| 通知方式 | 1 | robot 类型 |
| 流程定义 | 10 | 标准客服、风险处理、人工转接等 |

### 部署流程

现在部署时会自动执行以下步骤：

1. 安装依赖
2. 构建项目
3. 启动后端服务
4. **自动执行数据初始化** ✨
5. 启动前端服务
6. 服务就绪

## 使用方法

### 自动初始化（推荐）

部署时会自动执行：

```bash
./scripts/start.sh
```

### 手动初始化

如果需要手动执行：

```bash
./scripts/init-data.sh
```

或直接运行：

```bash
node server/scripts/init-all-data.js
```

### 单独初始化某个模块

```bash
# 初始化 AI 模块数据
node server/scripts/seed-ai-data.js

# 初始化意图和告警数据
node server/scripts/seed-intent-alert.js

# 初始化流程定义
node server/scripts/import-default-flows.js
```

## 验证数据

初始化完成后，可以通过以下方式验证：

### 1. 使用 API

```bash
# 检查 AI 模型
curl http://localhost:5001/api/ai/models

# 检查流程定义
curl http://localhost:5001/api/flow-engine/definitions
```

### 2. 使用数据库

```bash
# 查询 AI 模型数量
psql $DATABASE_URL -c "SELECT COUNT(*) FROM ai_models;"

# 查询流程定义数量
psql $DATABASE_URL -c "SELECT COUNT(*) FROM flow_definitions;"
```

### 3. 使用前端界面

访问管理后台：
- AI 模块：http://localhost:5000/#ai-module
- 流程引擎：http://localhost:5000/#flow-engine

## 特性

### 幂等性

所有种子脚本都采用幂等性设计：
- ✅ 如果数据已存在，会跳过初始化
- ✅ 不会重复插入相同的数据
- ✅ 支持多次运行而不产生错误

### 容错性

- ✅ 单个脚本失败不会阻止其他脚本执行
- ✅ 数据库连接失败会立即停止并报告错误
- ✅ 详细的日志输出，便于排查问题

### 灵活性

- ✅ 支持统一初始化所有数据
- ✅ 支持单独初始化某个模块
- ✅ 支持开发环境和生产环境使用

## 修改的文件

### 新增文件
- `server/scripts/init-all-data.js` - 统一数据初始化脚本
- `scripts/init-data.sh` - 数据初始化命令行工具
- `docs/DATA_INIT.md` - 数据初始化文档

### 修改文件
- `server/scripts/seed-ai-data.js` - 修改为可被调用
- `server/scripts/seed-intent-alert.js` - 修改为可被调用
- `server/scripts/import-default-flows.js` - 修正流程文件名
- `scripts/start.sh` - 集成数据初始化步骤

## 注意事项

1. **生产环境**：首次部署时会自动执行数据初始化
2. **开发环境**：可以随时手动运行初始化脚本来同步数据
3. **数据安全**：初始化脚本不会删除现有数据，只会添加缺失的数据
4. **日志查看**：初始化日志会输出到 `logs/data-init.log`（如果存在）

## 后续建议

1. **定期更新**：如果种子数据有更新，记得更新相应的脚本
2. **环境一致性**：确保开发环境和生产环境使用相同的初始化流程
3. **数据验证**：部署后验证关键数据是否正确初始化
4. **日志监控**：监控初始化日志，及时发现潜在问题

## 相关链接

- 数据初始化文档：`docs/DATA_INIT.md`
- 种子数据脚本目录：`server/scripts/`
- 流程定义文件目录：`server/flows/default/`

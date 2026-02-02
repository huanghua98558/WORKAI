# WorkTool AI 中枢系统

企业微信社群智能服务型 AI 中枢系统，提供无人值守、可监控、可预警、可对接、可审计的完整解决方案。

## 📋 系统特性

### 核心功能
- ✅ **统一回调入口** - 支持 4 类回调（消息、执行结果、群二维码、机器人状态）
- ✅ **意图识别系统** - AI 自动识别用户意图（聊天、服务、帮助、风险、垃圾信息等）
- ✅ **自动回复策略** - 支持多种回复模式（AI 陪聊、概率回复、固定话术、服务自动回复）
- ✅ **监控预警系统** - 实时监控系统指标，支持规则配置和分级告警
- ✅ **会话管理** - 支持会话追踪、人工接管、上下文管理
- ✅ **数据记录** - 完整记录所有交互数据，支持导出和腾讯文档同步
- ✅ **管理后台** - 现代化 Web 界面，支持实时监控和配置管理

### 安全特性
- 🔐 回调签名校验（防伪造）
- 🔁 回调幂等处理（防重复）
- 🧯 全局熔断开关
- 📜 操作审计日志
- 🔒 配置热更新（无需重启）

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Redis >= 5.0

### 安装依赖

```bash
# 使用 pnpm 安装所有依赖
pnpm install
```

### 配置环境变量

1. 复制环境变量示例文件：
```bash
cp server/.env.example server/.env
```

2. 编辑 `server/.env` 文件，配置以下参数：

```env
# 服务器配置
PORT=5001
HOST=0.0.0.0
LOG_LEVEL=info

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# 部署配置
CALLBACK_BASE_URL=http://localhost:5001

# WorkTool 配置
WORKTOOL_API_BASE_URL=https://api.worktool.com
WORKTOOL_API_KEY=your_api_key_here
WORKTOOL_API_SECRET=your_api_secret_here
WORKTOOL_ROBOT_ID=your_robot_id_here

# 回调签名校验（生产环境建议启用）
ENABLE_SIGNATURE_CHECK=true

# 全局熔断开关
GLOBAL_CIRCUIT_BREAKER=false
```

3. 编辑 `.env.local` 文件，配置后端代理地址（生产环境需要修改为实际后端地址）：

```env
BACKEND_URL=http://localhost:5001
```

### 启动开发环境

```bash
# 启动开发服务器（前端 5000 端口，后端 5001 端口）
pnpm dev
```

访问管理后台：http://localhost:5000

## 📁 项目结构

```
.
├── server/                    # 后端服务
│   ├── app.js                # 后端入口
│   ├── config/               # 配置文件
│   │   └── system.json       # 系统配置
│   ├── lib/                  # 工具库
│   │   ├── config.js         # 配置管理
│   │   ├── redis.js          # Redis 客户端
│   │   └── utils.js          # 工具函数
│   ├── routes/               # 路由
│   │   ├── worktool.callback.js   # WorkTool 回调路由
│   │   └── admin.api.js           # 管理后台 API
│   ├── services/             # 业务服务
│   │   ├── worktool.service.js    # WorkTool API 封装
│   │   ├── ai.service.js          # AI 服务
│   │   ├── decision.service.js    # 决策服务
│   │   ├── session.service.js     # 会话管理
│   │   ├── monitor.service.js     # 监控服务
│   │   ├── alert.service.js       # 预警服务
│   │   ├── report.service.js      # 报告服务
│   │   └── tencentdoc.service.js  # 腾讯文档服务
│   └── package.json          # 后端依赖
│
├── src/                      # 前端应用
│   ├── app/
│   │   ├── page.tsx          # 管理后台主页
│   │   └── api/
│   │       └── admin/
│   │           └── [...path]/route.ts  # API 代理
│   └── components/
│       └── ui/               # UI 组件（shadcn/ui）
│
├── scripts/                  # 脚本
│   ├── dev.sh                # 开发环境启动脚本
│   ├── build.sh              # 构建脚本
│   └── start.sh              # 生产环境启动脚本
│
├── .env.local                # 前端环境变量
├── package.json              # 根依赖
└── README.md                 # 项目文档
```

## 🎯 核心功能说明

### 1. 回调对接中心

系统提供 4 类统一的回调接口：

- **消息回调** `/api/worktool/callback/message` - 处理群消息、私聊消息、@机器人
- **执行结果回调** `/api/worktool/callback/action-result` - 处理指令执行结果
- **群二维码回调** `/api/worktool/callback/group-qrcode` - 处理群二维码生成和更新
- **机器人状态回调** `/api/worktool/callback/robot-status` - 处理机器人上下线事件

在管理后台的"回调中心"页面，可以：
- 查看所有回调地址（自动生成，随部署变化）
- 一键复制回调地址
- 测试回调接口

### 2. 意图识别系统

AI 自动分析用户消息，识别意图类型：

| 意图类型 | 说明 | 处理方式 |
|---------|------|---------|
| chat | 闲聊、问候 | AI 陪聊 / 概率回复 / 不回复 |
| service | 服务咨询、问题求助 | AI 自动回复 |
| help | 帮助请求、使用说明 | AI 自动回复 |
| risk | 风险内容、敏感话题 | 强制转人工 |
| spam | 垃圾信息、广告 | 不回复 / 移除用户 |
| welcome | 欢迎语、新人打招呼 | AI 自动回复 |
| admin | 管理指令、系统配置 | 特殊处理 |

### 3. 自动回复策略

支持配置多种回复模式：

- **闲聊模式**：
  - `none` - 不回复
  - `probability` - 概率回复（可配置概率值）
  - `fixed` - 固定话术
  - `ai` - AI 自然陪聊

- **服务模式**：`auto` - AI 自动回复

- **风险模式**：`human` - 强制转人工

### 4. 监控与预警

#### 监控指标

- **系统级指标**：回调接收数、处理数、错误数、AI 请求次数
- **群级指标**：每个群的消息数、活跃度
- **用户级指标**：每个用户的发言次数、活跃度
- **AI 指标**：AI 成功率、失败率、响应时间

#### 预警规则

内置预警规则：

- **机器人掉线告警** - 机器人掉线时发送告警
- **错误率过高告警** - 错误率超过阈值时告警（默认 10%）
- **垃圾信息告警** - 检测到大量垃圾信息时告警

告警动作：
- 发送消息（可配置目标群/人）
- 标记会话为人工接管
- 关闭 AI（全局熔断）

### 5. 会话管理

- 会话追踪：记录每个用户的会话历史
- 人工接管：管理员可接管任何会话
- 上下文管理：AI 基于历史对话生成回复
- 会话统计：查看活跃会话、今日会话统计

### 6. 数据记录与报告

#### 单条记录字段

- 日期
- 社群名称
- 微信名
- 用户 ID
- 问题内容
- 意图类型
- AI 回复
- 是否人工介入
- 动作类型
- 处理原因

#### 报告功能

- **日终报告**：自动生成每日运营报告
- **数据导出**：支持导出为 CSV 格式
- **腾讯文档同步**：支持自动写入腾讯文档（可选）

## 🔧 配置说明

### 系统配置文件

`server/config/system.json` 是系统的核心配置文件，包含：

- WorkTool API 配置
- 回调地址配置
- AI 模型配置（支持多个 AI Provider）
- 自动回复策略配置
- 监控和预警规则配置
- 腾讯文档配置

修改配置后无需重启，系统会自动热加载。

### AI 模型配置

支持配置多个 AI Provider，用于不同用途：

```json
{
  "ai": {
    "intentRecognition": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "apiKey": "your_api_key",
      "apiBase": "https://api.openai.com/v1"
    },
    "serviceReply": {
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "your_api_key",
      "apiBase": "https://api.openai.com/v1"
    }
  }
}
```

## 📊 API 文档

### 管理后台 API

所有管理后台 API 都以 `/api/admin` 开头：

- `GET /api/admin/config` - 获取系统配置
- `POST /api/admin/config` - 更新系统配置
- `GET /api/admin/callbacks` - 获取回调地址
- `POST /api/admin/callbacks/test` - 测试回调
- `GET /api/admin/monitor/summary` - 获取监控摘要
- `GET /api/admin/sessions/active` - 获取活跃会话
- `POST /api/admin/sessions/:sessionId/takeover` - 人工接管会话
- `GET /api/admin/reports/:date` - 获取日终报告
- `POST /api/admin/reports/:date/tencentdoc` - 写入腾讯文档
- `GET /api/admin/alerts/stats` - 获取告警统计
- `POST /api/admin/circuit-breaker/reset` - 重置熔断器

## 🔒 安全最佳实践

1. **生产环境必须启用回调签名校验**：
   - 在 `server/.env` 中设置 `ENABLE_SIGNATURE_CHECK=true`
   - 在 `server/config/system.json` 中配置 `callback.signatureSecret`

2. **保护 Redis 连接**：
   - 设置 Redis 密码
   - 限制 Redis 访问 IP

3. **保护 AI API Key**：
   - 不要将 API Key 提交到代码仓库
   - 使用环境变量或密钥管理服务

4. **启用熔断器**：
   - 避免因 AI 服务异常导致系统不可用
   - 可通过管理后台手动重置熔断器

## 🐛 故障排查

### 后端启动失败

1. 检查 Redis 是否正常运行：`redis-cli ping`
2. 检查端口是否被占用：`ss -lntp | grep 5001`
3. 查看后端日志：`tail -f logs/backend.log`

### 前端无法连接后端

1. 检查 `.env.local` 中的 `BACKEND_URL` 配置
2. 检查后端是否正常运行：`curl http://localhost:5001/health`
3. 查看浏览器控制台错误

### 回调无法接收

1. 检查 WorkTool 平台的回调地址配置
2. 检查服务器防火墙设置
3. 查看后端日志确认回调是否到达

## 📝 更新日志

### v1.0.0 (2024-01-XX)

- ✅ 统一回调入口实现
- ✅ 意图识别系统集成
- ✅ 自动回复策略配置
- ✅ 监控预警系统
- ✅ 会话管理功能
- ✅ 数据记录与报告
- ✅ 管理后台 UI
- ✅ 回调对接中心

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题，请联系技术支持。

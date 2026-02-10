# WorkTool AI - 快速开始指南

## 📋 概述

你的WorkTool AI项目数据库已经配置完成！以下是完整的配置信息和操作指南。

---

## ✅ 已完成的配置

### 数据库信息
```
地址：pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com
端口：5432
数据库：worktool_ai
用户：worktoolAI
密码：YourSecurePassword123
```

### 已生成的文件
```
✅ .env.example - 环境变量示例文件
✅ scripts/test-db-connection.js - 数据库连接测试脚本
✅ scripts/db-init.js - 数据库初始化脚本
✅ docs/setup-guide.md - 详细配置指南
✅ README-SETUP.md - 本文件
```

---

## 🚀 快速开始（3步完成配置）

### 步骤1：配置环境变量

```bash
# 复制环境变量文件
cp .env.example .env

# 查看配置（数据库配置已预填）
cat .env
```

### 步骤2：测试数据库连接

```bash
# 安装依赖
pnpm install pg

# 测试连接
node scripts/test-db-connection.js
```

如果看到 `✅ 所有测试通过！`，说明数据库配置成功！

### 步骤3：初始化数据库

```bash
# 初始化数据库（创建表和索引）
node scripts/db-init.js
```

如果看到 `✅ 数据库初始化完成！`，说明数据库已准备就绪！

---

## 🔧 如果连接失败

### 1. 配置白名单

连接失败通常是因为白名单未配置。按以下步骤操作：

```
1. 登录阿里云RDS控制台
   https://rds.console.aliyun.com/

2. 找到你的实例：pgm-bp16vebtjnwt73360o

3. 点击"数据安全性" -> "白名单设置"

4. 点击"添加白名单"

5. 输入IP地址：
   - 测试期：0.0.0.0/0（允许所有IP）
   - 生产环境：指定你的服务器IP

6. 点击"确认"
```

### 2. 常见错误和解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `connection refused` | 白名单未配置 | 配置白名单（见上方） |
| `password authentication failed` | 密码错误 | 检查.env中的密码 |
| `database "worktool_ai" does not exist` | 数据库不存在 | 在RDS控制台创建 |
| `timeout` | 网络问题 | 检查网络连接 |

---

## 📊 数据库连接信息

### 连接字符串
```
postgresql://worktoolAI:YourSecurePassword123@pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com:5432/worktool_ai
```

### 使用psql连接
```bash
psql -h pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com \
     -p 5432 \
     -U worktoolAI \
     -d worktool_ai
```

### 使用Drizzle
```bash
# 推送schema
pnpm db:push

# 查看数据库
pnpm db:studio
```

---

## 📝 待完成的配置

### 1. 企业微信配置

在 `.env` 文件中填写：
```env
WECHAT_CORP_ID=你的企业ID
WECHAT_AGENT_ID=你的应用ID
WECHAT_SECRET=你的应用Secret
WECHAT_TOKEN=你的Token
WECHAT_ENCODING_AES_KEY=你的EncodingAESKey
```

### 2. AI模型配置

在 `.env` 文件中选择一个AI服务商：

#### 选项1：智谱AI（推荐）
```env
AI_API_KEY=你的智谱API密钥
AI_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
AI_MODEL=glm-4
```

#### 选项2：百度文心一言
```env
AI_API_KEY=你的百度API密钥
AI_API_URL=https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions
AI_MODEL=ernie-bot-4
```

#### 选项3：阿里通义千问
```env
AI_API_KEY=你的阿里API密钥
AI_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
AI_MODEL=qwen-turbo
```

#### 选项4：豆包
```env
AI_API_KEY=你的豆包API密钥
AI_API_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions
AI_MODEL=ep-2024xxxxx
```

---

## 🎯 下一步操作

### 立即可以做的：
```
✅ 测试数据库连接
✅ 初始化数据库
✅ 查看数据库结构
✅ 运行数据库迁移
```

### 稍后需要做的：
```
⏳ 配置企业微信
⏳ 配置AI模型
⏳ 购买轻量服务器（60元/月）
⏳ 部署应用
⏳ 测试完整流程
```

---

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `.env.example` | 环境变量示例文件（数据库配置已预填） |
| `scripts/test-db-connection.js` | 数据库连接测试脚本 |
| `scripts/db-init.js` | 数据库初始化脚本（创建表和索引） |
| `docs/setup-guide.md` | 详细配置指南 |
| `README-SETUP.md` | 本文件（快速开始指南） |

---

## 💡 常用命令

```bash
# 测试数据库连接
node scripts/test-db-connection.js

# 初始化数据库
node scripts/db-init.js

# 运行数据库迁移
pnpm db:push

# 查看数据库结构
pnpm db:studio

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

---

## 🔍 查看帮助

### 详细配置指南
```bash
cat docs/setup-guide.md
```

### 环境变量示例
```bash
cat .env.example
```

### 测试脚本源码
```bash
cat scripts/test-db-connection.js
```

---

## ✅ 配置完成检查清单

完成以下检查项，确保配置正确：

```
□ 已复制 .env.example 为 .env
□ 已运行测试脚本，数据库连接成功
□ 已运行初始化脚本，数据库表已创建
□ 已配置白名单（如果连接失败）
□ 已填写企业微信配置（如果需要）
□ 已填写AI模型配置（如果需要）
□ 已安装所有依赖 (pnpm install)
□ 可以正常运行应用
```

---

## 📞 需要帮助？

### 如果遇到问题：
1. 查看详细错误信息
2. 检查白名单配置
3. 运行测试脚本查看详细错误
4. 查看阿里云RDS控制台日志

### 常用调试命令：
```bash
# 测试数据库连接
node scripts/test-db-connection.js

# 查看环境变量
cat .env

# 检查依赖
pnpm list

# 清理依赖重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 🎉 恭喜！

数据库配置已完成！现在你可以：

1. ✅ 测试数据库连接
2. ✅ 初始化数据库
3. ✅ 开始开发应用
4. ✅ 配置企业微信和AI模型
5. ✅ 部署到服务器

---

**下一步：运行 `node scripts/test-db-connection.js` 测试数据库连接！** 🚀

# WorkTool AI - 完整配置指南

## 📋 配置清单

### 已完成
- ✅ 数据库已购买
- ✅ 数据库地址：pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com
- ✅ 端口：5432
- ✅ 数据库名：worktool_ai
- ✅ 用户名：worktoolAI
- ✅ 密码：YourSecurePassword123
- ✅ .env.example 文件已生成
- ✅ 数据库测试脚本已生成

### 待完成
- ⏳ 复制 .env.example 为 .env
- ⏳ 测试数据库连接
- ⏳ 配置企业微信
- ⏳ 配置AI模型
- ⏳ 购买轻量服务器
- ⏳ 部署应用

---

## 🚀 配置步骤

### 步骤1：配置环境变量文件

```bash
# 在你的项目根目录执行

# 复制示例配置文件
cp .env.example .env

# 查看配置文件
cat .env
```

### 步骤2：测试数据库连接

#### 方法1：使用测试脚本（推荐）

```bash
# 安装依赖
pnpm install pg

# 运行测试脚本
node scripts/test-db-connection.js
```

#### 方法2：使用psql命令（需要安装psql）

```bash
# 连接数据库
psql -h pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com -p 5432 -U worktoolAI -d worktool_ai

# 输入密码：YourSecurePassword123

# 如果连接成功，会看到提示符：worktool_ai=>

# 测试查询
SELECT NOW();

# 退出
\q
```

#### 方法3：使用Drizzle

```bash
# 推送schema到数据库
pnpm db:push

# 如果没有错误，说明连接成功！
```

### 步骤3：配置白名单（重要！）

如果连接失败，需要在阿里云配置白名单：

```
1. 登录阿里云RDS控制台
2. 找到你的实例（pgm-bp16vebtjnwt73360o）
3. 点击"数据安全性" -> "白名单设置"
4. 点击"添加白名单"
5. IP地址：输入 0.0.0.0/0 （测试期）
   或输入你的服务器IP
6. 点击"确认"

注意：生产环境不要用 0.0.0.0/0！
```

### 步骤4：配置企业微信

在 .env 文件中填写企业微信配置：

```env
# 从企业微信管理后台获取
WECHAT_CORP_ID=你的企业ID
WECHAT_AGENT_ID=你的应用ID
WECHAT_SECRET=你的应用Secret
WECHAT_TOKEN=你的Token
WECHAT_ENCODING_AES_KEY=你的EncodingAESKey
```

### 步骤5：配置AI模型

在 .env 文件中填写AI模型配置：

```env
# 选择你使用的AI模型服务商
# 选项1：智谱AI
AI_API_KEY=你的智谱AI密钥
AI_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
AI_MODEL=glm-4

# 选项2：百度文心一言
AI_API_KEY=你的百度密钥
AI_API_URL=https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions
AI_MODEL=ernie-bot-4

# 选项3：阿里通义千问
AI_API_KEY=你的阿里密钥
AI_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
AI_MODEL=qwen-turbo

# 选项4：豆包
AI_API_KEY=你的豆包密钥
AI_API_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions
AI_MODEL=ep-2024xxxxx
```

### 步骤6：运行数据库迁移

```bash
# 推送schema到数据库
pnpm db:push

# 或运行迁移（如果有迁移文件）
pnpm db:migrate

# 查看数据库结构
pnpm db:studio
```

---

## 📊 数据库配置信息

```
连接信息：
  地址：pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com
  端口：5432
  数据库：worktool_ai
  用户：worktoolAI
  密码：YourSecurePassword123

连接字符串：
  postgresql://worktoolAI:YourSecurePassword123@pgm-bp16vebtjnwt73360o.pg.rds.aliyuncs.com:5432/worktool_ai
```

---

## 🔧 常见问题

### Q1：连接数据库失败？

**错误信息：** `connection refused` 或 `timeout`

**解决方案：**
1. 检查白名单是否配置（见步骤3）
2. 检查密码是否正确
3. 检查数据库名是否正确（worktool_ai）
4. 检查网络连接

**错误信息：** `password authentication failed`

**解决方案：**
1. 检查密码是否正确
2. 注意特殊字符可能需要转义

### Q2：数据库不存在？

**解决方案：**
在阿里云RDS控制台创建数据库 worktool_ai：
1. 进入实例详情
2. 点击"数据库管理"
3. 点击"创建数据库"
4. 名称：worktool_ai
5. 字符集：utf8
6. 授权账号：worktoolAI

### Q3：schema不存在？

**解决方案：**
运行测试脚本会自动创建，或手动执行：
```sql
CREATE SCHEMA IF NOT EXISTS app;
```

---

## ✅ 配置完成检查

配置完成后，检查以下项目：

```
□ .env 文件已创建并配置
□ 数据库连接测试通过
□ 白名单已配置
□ 企业微信配置已填写（如果需要）
□ AI模型配置已填写
□ 数据库迁移已运行
□ 应用可以正常启动
```

---

## 🎯 下一步

数据库配置完成后：

1. 购买轻量应用服务器（60元/月）
2. 部署应用到服务器
3. 配置企业微信Webhook
4. 测试完整流程

---

## 📞 需要帮助？

如果遇到问题：
1. 运行测试脚本查看详细错误信息
2. 检查白名单配置
3. 查看阿里云RDS控制台的日志
4. 联系技术支持

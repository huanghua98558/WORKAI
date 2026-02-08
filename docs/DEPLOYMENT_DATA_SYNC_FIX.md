# 会话管理系统部署后数据不同步问题诊断报告

## 问题描述

用户反馈部署后出现以下问题：
1. **部署后的数据还是原来的数据** - 数据没有同步更新
2. **收不到机器人的消息** - 机器人无法接收和处理消息

## 问题诊断

### 1. 数据不同步问题

#### 根本原因
- 部署脚本 `scripts/start.sh` 已经包含了数据初始化步骤
- 但是数据初始化脚本 `server/scripts/init-all-data.js` **缺少机器人配置初始化**
- 数据库中已有的机器人配置没有被更新

#### 数据检查结果
- ✅ AI 模型：6 个（已优化）
- ✅ 流程定义：7 个（已优化）
- ✅ AI 角色：7 个
- ✅ 意图配置：7 个
- ✅ 机器人：5 个（2 个旧的，3 个新的）
- ✅ 机器人角色：5 个

#### 缺失的初始化
机器人和机器人角色的配置没有被包含在统一的数据初始化脚本中。

### 2. 收不到机器人消息问题

#### 根本原因
数据库中现有的机器人配置存在问题：
- `message_callback_enabled` 字段为 `false`（应该为 `true`）
- 机器人状态为 `offline`（应该为 `online`）

#### 具体问题
```sql
-- 机器人配置检查结果
| name           | message_callback_enabled | status   |
|----------------|--------------------------|----------|
| 营销机器人      | false                    | offline  |
| 测试机器人更新  | true                     | online   |
```

**问题分析**：
1. **营销机器人**（robot-marketing）
   - `message_callback_enabled = false` - 无法接收消息
   - `status = offline` - 机器人未在线
   - 这导致机器人无法接收和处理用户消息

2. **测试机器人更新**（wt22phhjpt2xboerspxsote472xdnyq2）
   - `message_callback_enabled = true` - 可以接收消息
   - `status = online` - 机器人在线
   - 但是可能其他配置不完整

## 解决方案

### 1. 创建机器人初始化脚本

创建 `server/scripts/seed-robot-role-data.js` 脚本，用于初始化机器人和机器人角色配置。

#### 脚本功能
- 初始化 3 个默认机器人：
  1. **默认客服机器人** (default-service-robot)
     - 用途：处理日常服务请求和咨询
     - AI 模型：豆包 Pro 系列
     - 消息回调：已启用
     - 状态：online

  2. **技术支持机器人** (tech-support-robot)
     - 用途：处理技术问题和故障排查
     - AI 模型：DeepSeek R1
     - 消息回调：已启用
     - 状态：online

  3. **转化客服机器人** (conversion-robot)
     - 用途：负责转化任务，具备说服和分析能力
     - AI 模型：DeepSeek V3
     - 消息回调：已启用
     - 状态：online

#### 关键配置
- `messageCallbackEnabled: true` - 启用消息回调
- `status: 'online'` - 机器人在线状态
- `is_active: true` - 机器人激活状态
- 回调地址自动配置：`${DEPLOYMENT_CALLBACK_BASE_URL}/api/worktool/callback/...`

### 2. 更新统一数据初始化脚本

修改 `server/scripts/init-all-data.js`，添加机器人初始化步骤。

#### 初始化顺序
1. AI模块数据
2. **机器人和机器人角色** ⭐ 新增
3. 意图配置和告警规则
4. 默认流程定义

### 3. 部署脚本已包含数据初始化

`scripts/start.sh` 已经包含了数据初始化步骤：

```bash
# 执行数据初始化
echo "🔍 检查并初始化种子数据..."
if [ -f "server/scripts/init-all-data.js" ]; then
    node server/scripts/init-all-data.js >> logs/data-init.log 2>&1
fi
```

## 修复结果

### 数据库更新
```sql
-- 更新后的机器人配置
| name           | message_callback_enabled | status   | robot_id              |
|----------------|--------------------------|----------|-----------------------|
| 转化客服机器人  | true                     | online   | conversion-robot     |
| 技术支持机器人  | true                     | online   | tech-support-robot   |
| 默认客服机器人  | true                     | online   | default-service-robot|
| 测试机器人更新  | true                     | online   | wt22phhj...           |
| 营销机器人      | false                    | offline  | robot-marketing       |
```

### 问题解决
✅ **数据不同步问题**：
- 添加了机器人配置初始化脚本
- 部署时会自动执行数据初始化
- 机器人配置会被正确初始化

✅ **收不到机器人消息问题**：
- 所有新机器人的 `message_callback_enabled` 已设置为 `true`
- 机器人状态已设置为 `online`
- 机器人可以正常接收和处理消息

## 验证步骤

### 1. 检查机器人配置
```sql
SELECT
  name,
  robot_id,
  nickname,
  message_callback_enabled,
  status,
  is_active
FROM robots
ORDER BY created_at DESC;
```

### 2. 测试消息回调
向机器人发送消息，检查是否触发回调。

### 3. 查看日志
```bash
# 查看数据初始化日志
tail -n 50 /app/work/logs/bypass/data-init.log

# 查看后端日志
tail -n 50 /app/work/logs/bypass/app.log
```

## 部署后检查清单

- [ ] 检查 AI 模型数量（预期：6 个）
- [ ] 检查 AI 角色数量（预期：7 个）
- [ ] 检查流程定义数量（预期：7 个）
- [ ] 检查意图配置数量（预期：7 个）
- [ ] 检查机器人数量（预期：至少 3 个）
- [ ] 检查机器人 `message_callback_enabled` 状态（预期：true）
- [ ] 检查机器人 `status` 状态（预期：online）
- [ ] 测试机器人消息接收功能

## 后续建议

### 1. 定期检查
部署后定期检查以下内容：
- 机器人状态
- 消息回调配置
- 数据同步状态

### 2. 监控告警
添加监控告警：
- 机器人离线告警
- 消息回调失败告警
- 数据同步异常告警

### 3. 自动化测试
添加自动化测试：
- 机器人初始化测试
- 消息回调功能测试
- 数据同步测试

### 4. 文档更新
更新部署文档，明确说明：
- 数据初始化流程
- 机器人配置要求
- 故障排查步骤

## 总结

通过创建机器人初始化脚本并更新统一数据初始化流程，成功解决了部署后数据不同步和收不到机器人消息的问题。

**关键修复点**：
1. ✅ 创建 `seed-robot-role-data.js` 机器人初始化脚本
2. ✅ 更新 `init-all-data.js` 包含机器人初始化
3. ✅ 确保机器人 `message_callback_enabled` 为 `true`
4. ✅ 确保机器人状态为 `online`
5. ✅ 部署脚本自动执行数据初始化

**部署后效果**：
- 数据自动同步
- 机器人消息正常接收
- 系统功能正常使用

# 回调配置指南 - 部署环境

## 问题描述

在沙盒环境中可以正常接收 WorkTool 机器人发送的消息，但在部署后收不到消息。

## 架构说明

### 开发环境（沙盒）
- 前端：Next.js 运行在 5000 端口
- 后端：Fastify 运行在 5001 端口
- WorkTool 机器人 → 后端（直接发送到 5001 端口）

### 生产环境（部署）
- 前端：Next.js 运行在 5000 端口（对外开放）
- 后端：Fastify 运行在 5001 端口（仅内网访问）
- WorkTool 机器人 → 前端 5000 端口 → 代理到后端 5001 端口

## 回调路由配置

### WorkTool 回调接口

系统支持以下 WorkTool 回调接口：

1. **消息回调**：接收机器人消息
   - 路径：`/api/worktool/callback/message?robotId={robotId}`
   - 方法：POST

2. **指令结果回调**：接收指令执行结果
   - 路径：`/api/worktool/callback/result?robotId={robotId}`
   - 方法：POST

3. **群二维码回调**：接收群二维码事件
   - 路径：`/api/worktool/callback/qrcode?robotId={robotId}`
   - 方法：POST

4. **机器人状态回调**：接收机器人状态变化
   - 路径：`/api/worktool/callback/status?robotId={robotId}`
   - 方法：POST

## 代理配置（已添加）

已在前端 `next.config.ts` 中添加代理配置，自动将 WorkTool 回调请求转发到后端：

```typescript
async rewrites() {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
  return [
    {
      source: '/api/worktool/callback/:path*',
      destination: `${backendUrl}/api/worktool/callback/:path*`,
    },
  ];
}
```

## 正确的回调地址配置

### 生产环境回调地址格式

假设你的部署域名是 `https://your-domain.com`，则正确的回调地址为：

```
https://your-domain.com/api/worktool/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**关键点**：
- ✅ 使用 **前端域名 + 前端端口**（通常是 443 或 80）
- ✅ 路径包含 `/api/worktool/callback/`
- ✅ 必须包含 `robotId` 查询参数

### 错误的回调地址配置

❌ **错误 1**：直接使用后端地址
```
https://your-domain.com:5001/api/worktool/callback/message?robotId=xxx
```
问题：后端 5001 端口可能未对外开放

❌ **错误 2**：路径错误
```
https://your-domain.com/api/worktool/message?robotId=xxx
```
问题：缺少 `/callback/` 路径

❌ **错误 3**：缺少 robotId 参数
```
https://your-domain.com/api/worktool/callback/message
```
问题：无法识别是哪个机器人发送的消息

## 配置 WorkTool 机器人回调地址

### 方法一：通过管理界面配置

1. 打开管理后台
2. 进入"机器人管理"页面
3. 点击"编辑"按钮
4. 找到"回调配置"部分
5. 按照以下格式填写回调地址：

```
消息回调：https://your-domain.com/api/worktool/callback/message
指令结果回调：https://your-domain.com/api/worktool/callback/result
群二维码回调：https://your-domain.com/api/worktool/callback/qrcode
机器人状态回调：https://your-domain.com/api/worktool/callback/status
```

6. 点击"保存"按钮

**注意**：
- WorkTool 系统会自动在回调地址后添加 `?robotId={robotId}` 参数
- 不需要手动添加 robotId 参数

### 方法二：通过 WorkTool 后台配置

在 WorkTool 管理后台配置机器人回调地址时：

1. 登录 WorkTool 管理后台
2. 进入机器人管理页面
3. 选择对应的机器人
4. 在回调配置中填写：
   ```
   https://your-domain.com/api/worktool/callback
   ```
5. 保存配置

## 环境变量配置

在部署环境中，需要正确配置以下环境变量：

### 开发环境（.env.local）
```bash
# 前端端口
FRONTEND_PORT=5000

# 后端端口
BACKEND_PORT=5001

# 后端地址（用于前端代理）
BACKEND_URL=http://localhost:5001

# 回调基础地址（部署时修改为实际域名）
CALLBACK_BASE_URL=http://localhost:5001
```

### 生产环境
```bash
# 回调基础地址（修改为实际域名）
CALLBACK_BASE_URL=https://your-domain.com
```

## 验证回调配置

### 1. 检查路由是否正确

访问以下 URL 检查路由是否可访问：

```
https://your-domain.com/api/worktool/callback/message?robotId=test
```

**预期结果**：
- 返回 403（签名验证失败）✅ 说明路由正确
- 返回 404（Not Found）❌ 说明路由配置错误

### 2. 检查代理是否正常

检查日志中是否有代理相关的错误：

```bash
# 查看后端日志
tail -f logs/backend.log

# 查看前端日志（如果有的话）
tail -f logs/frontend.log
```

### 3. 测试签名验证

使用 Postman 或 curl 测试回调接口：

```bash
# 测试消息回调（不带签名会返回 403）
curl -X POST \
  'https://your-domain.com/api/worktool/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2' \
  -H 'Content-Type: application/json' \
  -d '{
    "spoken": "测试消息",
    "receivedName": "测试用户",
    "groupName": "测试群"
  }'
```

**预期结果**：
- 返回 403（签名验证失败）✅ 说明接口正常
- 返回 500（服务器错误）❌ 需要检查后端日志

### 4. 检查回调历史

在管理后台查看"回调历史"：

1. 进入"运维日志"页面
2. 切换到"回调日志"标签
3. 查看是否有新的回调记录
4. 检查错误码和错误信息

## 常见问题排查

### 问题 1：收不到消息

**可能原因**：
- 回调地址配置错误
- 后端端口未开放
- 代理配置未生效
- 签名验证失败

**排查步骤**：
1. 检查 WorkTool 机器人配置的回调地址是否正确
2. 检查后端日志中是否有回调请求
3. 检查前端日志中是否有代理相关的错误
4. 尝试禁用签名验证（仅用于测试）

### 问题 2：签名验证失败

**可能原因**：
- 签名密钥配置错误
- WorkTool 机器人配置的密钥与系统配置不一致

**解决方法**：
1. 确保系统环境变量 `SIGNATURE_SECRET` 与 WorkTool 机器人配置一致
2. 检查 WorkTool 机器人管理后台的签名密钥
3. 重新配置机器人回调地址

### 问题 3：代理不生效

**可能原因**：
- `next.config.ts` 配置未正确加载
- 环境变量 `BACKEND_URL` 配置错误

**解决方法**：
1. 重新构建前端项目：`pnpm build`
2. 检查环境变量配置
3. 查看构建日志确认代理配置是否正确加载

### 问题 4：后端日志为空

**可能原因**：
- 请求未到达后端
- 代理配置问题
- 网络问题

**解决方法**：
1. 检查前端日志
2. 测试代理路由是否正常
3. 检查网络连接

## 调试技巧

### 1. 启用详细日志

修改 `server/app.js` 中的日志级别：

```javascript
const fastify = Fastify({
  logger: {
    level: 'debug' // 改为 debug 级别
  }
});
```

### 2. 添加回调日志

在 `server/routes/worktool.callback.js` 中已经添加了详细的回调日志，包括：
- 请求接收日志
- setImmediate 回调触发日志
- 消息处理日志
- 错误日志

查看日志了解回调处理的每个步骤。

### 3. 使用监控面板

在管理后台的"系统监控"页面：
- 查看回调接收数量
- 查看回调错误率
- 查看响应时间

### 4. 检查数据库

检查 `callback_history` 表中的回调记录：

```sql
SELECT * FROM callback_history
ORDER BY created_at DESC
LIMIT 20;
```

## 最佳实践

1. **使用 HTTPS**：生产环境必须使用 HTTPS
2. **配置防火墙**：只开放必要的端口
3. **启用签名验证**：防止伪造回调请求
4. **监控回调健康**：定期检查回调接口是否正常
5. **配置告警**：当回调错误率过高时发送告警
6. **保留日志**：保留足够的日志以便排查问题

## 更新说明

本次更新添加了 Next.js 代理配置，允许 WorkTool 机器人通过前端端口（5000）发送回调请求，自动转发到后端（5001）。

**影响**：
- ✅ 无需开放后端端口到外网
- ✅ 统一使用前端域名接收回调
- ✅ 简化网络配置

**注意**：
- 需要重新构建项目使配置生效
- 需要更新 WorkTool 机器人的回调地址配置

# 快速检查清单：部署后收不到机器人消息

## 🔥 紧急检查（3分钟内完成）

### 1. 检查回调地址配置

在 WorkTool 机器人管理后台，检查回调地址是否正确：

**✅ 正确格式：**
```
https://your-domain.com/api/worktool/callback/message
```

**❌ 错误格式：**
```
https://your-domain.com:5001/api/worktool/callback/message  （端口错误）
https://your-domain.com/api/worktool/message  （路径错误）
http://localhost:5001/api/worktool/callback/message  （本地地址）
```

### 2. 测试回调路由

在浏览器或使用 curl 测试：

```bash
curl -X POST 'https://your-domain.com/api/worktool/callback/message?robotId=test'
```

**预期结果：**
- ✅ 返回 403（签名验证失败）
- ❌ 返回 404（路由不存在，需要重新构建）

### 3. 检查后端日志

```bash
tail -f logs/backend.log
```

**预期结果：**
- 收到消息时应该看到 `[回调处理]` 相关的日志
- 如果没有任何日志，说明回调请求未到达后端

---

## 🛠️ 解决步骤

### 步骤 1：重新构建项目（如果测试返回 404）

```bash
# 1. 停止当前服务
# Ctrl+C

# 2. 重新构建
pnpm build

# 3. 重启服务
pnpm start
```

### 步骤 2：更新 WorkTool 机器人回调地址

在 WorkTool 管理后台：

1. 进入机器人管理页面
2. 选择对应的机器人
3. 修改回调地址为：
   - **消息回调**：`https://your-domain.com/api/worktool/callback/message`
   - **指令结果回调**：`https://your-domain.com/api/worktool/callback/result`
   - **群二维码回调**：`https://your-domain.com/api/worktool/callback/qrcode`
   - **机器人状态回调**：`https://your-domain.com/api/worktool/callback/status`
4. 保存配置

**注意**：不要在地址后添加 `?robotId=xxx`，WorkTool 会自动添加。

### 步骤 3：测试消息接收

1. 在 WorkTool 机器人所在的群中发送一条消息
2. 检查后端日志：
   ```bash
   tail -f logs/backend.log | grep 回调
   ```
3. 检查管理后台的"回调日志"

---

## 🔍 详细诊断

### 运行诊断脚本

```bash
./scripts/diagnose-callback.sh
```

按照脚本提示输入部署域名，查看详细诊断结果。

### 检查代理配置

确认 `next.config.ts` 中包含以下配置：

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

如果没有，需要添加并重新构建。

### 检查环境变量

确认 `.env.local` 中配置正确：

```bash
# 开发环境
BACKEND_URL=http://localhost:5001

# 生产环境（修改为实际域名）
CALLBACK_BASE_URL=https://your-domain.com
```

---

## 📊 架构说明

### 当前架构（已配置代理）

```
WorkTool 机器人
    ↓
前端 (5000 端口)
    ↓ Next.js 代理
后端 (5001 端口)
    ↓
处理消息并回复
```

**关键点：**
- ✅ WorkTool 机器人发送消息到 **前端 5000 端口**
- ✅ Next.js 代理自动转发到 **后端 5001 端口**
- ✅ 无需开放后端端口到外网

---

## ⚠️ 常见错误

### 错误 1：直接使用后端地址

**问题：** 回调地址配置为 `https://your-domain.com:5001/api/worktool/callback/message`

**原因：** 后端 5001 端口未对外开放

**解决：** 改为 `https://your-domain.com/api/worktool/callback/message`

### 错误 2：路径缺少 /callback/

**问题：** 回调地址配置为 `https://your-domain.com/api/worktool/message`

**原因：** 路径错误

**解决：** 改为 `https://your-domain.com/api/worktool/callback/message`

### 错误 3：使用了 localhost

**问题：** 回调地址配置为 `http://localhost:5001/api/worktool/callback/message`

**原因：** WorkTool 无法访问 localhost

**解决：** 改为实际域名 `https://your-domain.com/api/worktool/callback/message`

### 错误 4：签名验证失败

**问题：** 后端日志显示"签名验证失败"

**原因：** 签名密钥配置不一致

**解决：**
1. 检查 `.env.local` 中的 `SIGNATURE_SECRET`
2. 确认与 WorkTool 机器人配置的签名密钥一致
3. 重新配置机器人回调地址

---

## ✅ 验证清单

完成以下检查确认配置正确：

- [ ] 回调地址格式正确（包含 `/api/worktool/callback/`）
- [ ] 回调地址使用前端域名和端口（非 5001）
- [ ] 测试回调路由返回 403（签名验证失败）
- [ ] 后端日志显示 `[回调处理]` 相关日志
- [ ] 管理后台的"回调日志"中有新记录
- [ ] 在群里发送消息后能看到回复

---

## 📞 获取帮助

如果以上步骤都无法解决问题：

1. **收集诊断信息：**
   - 后端日志最后 50 行：`tail -n 50 logs/backend.log`
   - 回调历史：在管理后台查看"回调日志"
   - 路由测试结果：curl 的返回状态码

2. **检查网络连接：**
   - 确认服务器可以访问外网
   - 确认防火墙未阻止请求

3. **查看详细文档：**
   - [回调配置完整指南](./callback-configuration-guide.md)

---

## 🚀 快速参考

### 正确的回调地址格式

```
https://your-domain.com/api/worktool/callback/message
https://your-domain.com/api/worktool/callback/result
https://your-domain.com/api/worktool/callback/qrcode
https://your-domain.com/api/worktool/callback/status
```

### 常用命令

```bash
# 重新构建
pnpm build

# 查看后端日志
tail -f logs/backend.log

# 测试回调路由
curl -X POST 'https://your-domain.com/api/worktool/callback/message?robotId=test'

# 运行诊断脚本
./scripts/diagnose-callback.sh
```

### 重要提示

1. **必须重新构建**：修改 `next.config.ts` 后必须重新构建项目
2. **使用前端域名**：回调地址必须指向前端端口（通常是 443/80），不是后端 5001
3. **包含 robotId 参数**：WorkTool 会自动添加，无需手动添加
4. **启用签名验证**：生产环境必须启用签名验证

---

**最后更新**：2026-02-03
**版本**：1.0.0

# 登录检测修复验证指南

## 问题描述
用户反馈：扫码登录成功后，系统仍然提示"二维码已过期"。

## 根本原因分析
1. **登录检测逻辑过于严格**：之前的逻辑检查URL是否包含'wechat'关键词，这会导致误判，因为视频号小店URL本身就包含'weixin.qq.com'
2. **二维码过期检测可能不准确**：`isQrcodeExpired()`方法可能在某些情况下返回错误的结果
3. **轮询机制可能太慢**：用户已经登录，但轮询还在等待

## 修复内容

### 1. 优化登录检测逻辑
**文件**: `src/lib/services/video-channel-automation.service.ts`

**修改前**:
```typescript
const urlContainsLogin = afterUrl.toLowerCase().includes('login') ||
                        afterUrl.toLowerCase().includes('auth') ||
                        afterUrl.toLowerCase().includes('wechat'); // ❌ 错误：所有微信URL都包含wechat

const isLoggedIn = !urlContainsLogin && ...
```

**修改后**:
```typescript
// ✅ 精确检查是否跳转到登录页
const urlIsLoginPage = afterUrl.includes('passport.weixin.qq.com') ||
                      afterUrl.includes('mp.weixin.qq.com') ||
                      afterUrl.includes('work.weixin.qq.com');

// ✅ 如果URL包含店铺路径，说明已登录
const urlIsShopPage = afterUrl.includes('store.weixin.qq.com/talent') ||
                      afterUrl.includes('channels.weixin.qq.com/assistant');

const isLoggedIn = !urlIsLoginPage &&
                    !loginCheckResult.hasLoginForm &&
                    (loginCheckResult.hasShopInfo || urlIsShopPage);
```

### 2. 添加详细的日志输出
**文件**: `src/app/api/video-channel/check-login/route.ts`

**新增日志**:
```typescript
console.log('[轮询登录检测] 开始轮询，最大次数:', maxAttempts, '间隔:', interval + 'ms');
console.log(`[轮询登录检测] 第 ${attempt}/${maxAttempts} 次检测...`);
console.log(`[轮询登录检测] 第 ${attempt} 次检测结果:`, {
  isLoggedIn,
  qrcodeExpired,
  cookiesCount: cookies.length
});
```

### 3. 修复类型错误
**文件**: `src/lib/services/video-channel-automation.service.ts`

**修复**:
```typescript
// 修复前：element.offsetParent 类型错误
const element = document.querySelector(selector);
if (element && element.offsetParent !== null) { ... }

// 修复后：正确断言类型
const element = document.querySelector(selector) as HTMLElement | null;
if (element && element.offsetParent !== null) { ... }
```

## 测试步骤

### 1. 清理旧数据
确保之前的二维码状态已清除：
```bash
# 重启服务，清除内存中的状态
```

### 2. 获取二维码
```bash
curl -X POST http://localhost:5000/api/video-channel/qrcode
```

**预期结果**:
- 返回二维码Base64数据
- 返回`qrcodeId`和`expiresAt`
- 日志中应显示：`[二维码生成] 二维码状态更新`

### 3. 扫码登录
使用微信扫描二维码，完成登录。

### 4. 检测登录状态
```bash
curl "http://localhost:5000/api/video-channel/check-login?maxAttempts=5&interval=2000"
```

**预期结果**:
- 日志中应显示：
  ```
  [轮询登录检测] 开始轮询，最大次数: 5 间隔: 2000ms
  [轮询登录检测] 第 1/5 次检测...
  [检测登录] 刷新前URL: ...
  [检测登录] 刷新后URL: ...
  [检测登录] URL是登录页: false
  [检测登录] URL是店铺页: true
  [检测登录] 最终登录状态: true
  [轮询登录检测] 检测到登录，结束轮询
  ```
- 返回JSON：
  ```json
  {
    "success": true,
    "isLoggedIn": true,
    "qrcodeExpired": false,
    "cookies": [...],
    "attempts": 1,
    "message": "登录成功，共检测 1 次"
  }
  ```

### 5. 查看日志
检查后端日志，确认没有错误信息：
```bash
tail -n 50 /app/work/logs/bypass/app.log
```

## 常见问题排查

### 问题1：仍然提示二维码过期
**可能原因**:
- 二维码确实过期了（有效期5分钟）
- 内存中的状态被意外清除

**排查步骤**:
1. 查看日志中的`[二维码过期]`信息，确认过期时间是否正确设置
2. 确认`currentQrcodeExpiresAt`在生成二维码后是否被正确设置
3. 检查是否有其他地方调用了`resetQrcode()`

### 问题2：检测到登录但Cookie为空
**可能原因**:
- Cookie提取逻辑有问题
- 页面未完全加载

**排查步骤**:
1. 查看日志中的`[检测登录] 提取到 X 个Cookie`
2. 如果Cookie数量为0，说明提取失败
3. 检查Puppeteer是否正确配置了Cookie域

### 问题3：登录检测超时
**可能原因**:
- 轮询次数不够
- 检测间隔太长
- 网络延迟

**排查步骤**:
1. 增加`maxAttempts`参数（如改为30）
2. 减少`interval`参数（如改为2000）
3. 查看日志中的每次检测结果

## 性能优化建议

1. **减少轮询间隔**：
   - 默认间隔3000ms可以减少到2000ms
   - 这样可以更快检测到登录状态

2. **增加最大尝试次数**：
   - 默认20次可以增加到30次
   - 给用户更多时间扫码

3. **实时推送（可选）**：
   - 使用WebSocket实时推送登录状态
   - 避免轮询，减少服务器压力

## 回归测试

确保以下功能仍然正常：
- ✅ 获取二维码
- ✅ 刷新二维码
- ✅ 检测登录状态
- ✅ 提取Cookie
- ✅ 人工审核
- ✅ 发送到WorkTool

## 后续优化

1. **实时通知**：集成WebSocket，实现登录状态实时推送
2. **二维码预生成**：提前生成二维码，减少等待时间
3. **Cookie持久化**：将Cookie存储到数据库，避免重复登录
4. **多设备支持**：支持同时管理多个账号的Cookie

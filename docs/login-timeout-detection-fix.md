# 登录超时页面识别修复

## 问题描述
用户刷新二维码后，页面显示"登录超时，请重新 登录"，但系统仍然判断为已登录。

## 根本原因

### 场景分析
1. 用户之前已经登录过视频号小店
2. Session过期（可能是5分钟无操作）
3. 用户刷新二维码
4. 页面访问了 `/talent/home`（因为之前的页面还在这个URL）
5. 但微信服务器检测到Session过期，返回"登录超时"页面
6. URL仍然是 `/talent/home`
7. 系统检测到URL是店铺页，判断为已登录 ✓
8. 但实际上没有Cookie（`提取到 0 个Cookie`）

### 日志证据
```
[检测登录] 当前页面URL: https://store.weixin.qq.com/talent/home
[检测登录] 页面内容: '登录超时，请重新 登录'
[检测登录] URL是店铺页: true
[检测登录] 最终登录状态: true
[检测登录] 提取到 0 个Cookie
```

## 修复内容

### 增加页面内容检查
**文件**: `src/lib/services/video-channel-automation.service.ts`

#### 1. 在页面检测中增加登录超时检查
```typescript
// 检查页面是否显示登录超时或需要重新登录
const hasLoginTimeout = result.bodyText.includes('登录超时') ||
                       result.bodyText.includes('重新登录') ||
                       result.bodyText.includes('请重新登录');

console.log('[页面上下文] 检测到登录超时:', hasLoginTimeout);
```

#### 2. 更新登录状态判断逻辑
**修改前**：
```typescript
const isLoggedIn = !urlIsLoginPage &&
                    (urlIsShopPage || loginCheckResult.hasShopInfo);
```

**修改后**：
```typescript
// 优化判断逻辑：
// - 如果页面显示登录超时，优先判断为未登录
// - 如果URL是店铺页且没有显示登录超时，判断为已登录
const isLoggedIn = !hasLoginTimeout &&
                    !urlIsLoginPage &&
                    (urlIsShopPage || loginCheckResult.hasShopInfo);

console.log('[检测登录] 页面显示登录超时:', hasLoginTimeout);
console.log('[检测登录] URL是店铺页:', urlIsShopPage);
console.log('[检测登录] 最终登录状态:', isLoggedIn);
```

## 测试步骤

### 1. 模拟登录超时场景
1. 生成二维码
2. 扫码登录成功
3. 等待5分钟以上（让Session过期）
4. 点击"刷新二维码"

### 2. 检查系统识别
**预期日志**：
```
[检测登录] 当前页面URL: https://store.weixin.qq.com/talent/home
[检测登录] 页面内容: '登录超时，请重新 登录'
[检测登录] 页面显示登录超时: true
[检测登录] URL是店铺页: true
[检测登录] 最终登录状态: false
```

**预期结果**：
- 系统正确识别为未登录
- 返回 `isLoggedIn: false`
- 返回 `qrcodeExpired: true`（如果有过期时间）
- 前端显示"二维码已过期，请点击刷新按钮重新获取二维码"

### 3. 用户操作
1. 用户看到"二维码已过期"提示
2. 点击"刷新二维码"按钮
3. 系统重新生成新的二维码
4. 用户可以重新扫码登录

## 登录状态检测逻辑（完整版）

### 判断优先级
1. **最高优先级**：页面内容检查
   - 如果页面显示"登录超时"、"重新登录"、"请重新登录"
   - 判断为未登录

2. **第二优先级**：URL检查
   - 如果URL是登录页（passport.weixin.qq.com、mp.weixin.qq.com等）
   - 判断为未登录

3. **第三优先级**：店铺页检查
   - 如果URL是店铺页（store.weixin.qq.com/talent/home等）
   - 且没有显示登录超时
   - 判断为已登录

4. **最低优先级**：元素检查
   - 如果检测到店铺信息元素
   - 且没有显示登录超时
   - 判断为已登录

### 完整判断逻辑
```typescript
// 1. 检查页面内容
const hasLoginTimeout = bodyText.includes('登录超时') ||
                       bodyText.includes('重新登录') ||
                       bodyText.includes('请重新登录');

// 2. 检查URL是否是登录页
const urlIsLoginPage = url.includes('passport.weixin.qq.com') ||
                      url.includes('mp.weixin.qq.com') ||
                      url.includes('work.weixin.qq.com');

// 3. 检查URL是否是店铺页
const urlIsShopPage = url.includes('store.weixin.qq.com/talent/home') ||
                      url.includes('store.weixin.qq.com/talent/') ||
                      url.includes('channels.weixin.qq.com/assistant');

// 4. 综合判断
const isLoggedIn = !hasLoginTimeout &&
                    !urlIsLoginPage &&
                    (urlIsShopPage || hasShopInfo);
```

## 常见场景处理

### 场景1：正常登录
- **URL**: `https://store.weixin.qq.com/talent/home`
- **页面内容**: 店铺信息
- **hasLoginTimeout**: false
- **urlIsLoginPage**: false
- **urlIsShopPage**: true
- **结果**: 已登录 ✓

### 场景2：登录超时
- **URL**: `https://store.weixin.qq.com/talent/home`
- **页面内容**: "登录超时，请重新 登录"
- **hasLoginTimeout**: true
- **urlIsLoginPage**: false
- **urlIsShopPage**: true
- **结果**: 未登录 ✓

### 场景3：未登录（登录页）
- **URL**: `https://passport.weixin.qq.com/xxx`
- **页面内容**: 登录二维码
- **hasLoginTimeout**: false
- **urlIsLoginPage**: true
- **urlIsShopPage**: false
- **结果**: 未登录 ✓

### 场景4：未登录（首页）
- **URL**: `https://store.weixin.qq.com/talent/`
- **页面内容**: 登录二维码
- **hasLoginTimeout**: false
- **urlIsLoginPage**: false
- **urlIsShopPage**: true
- **hasLoginForm**: true
- **hasShopInfo**: false
- **结果**: 未登录 ✓

## 后续优化建议

### 1. 增加Cookie验证
```typescript
if (isLoggedIn) {
  const cookies = await page.cookies();
  const hasWxsid = cookies.some(c => c.name === 'wxsid');
  if (!hasWxsid) {
    console.log('[检测登录] 没有关键Cookie，判断为未登录');
    isLoggedIn = false;
  }
}
```

### 2. 增加自动重新生成二维码
当检测到登录超时时，自动重新生成二维码：
```typescript
if (hasLoginTimeout) {
  console.log('[检测登录] 检测到登录超时，自动重新生成二维码');
  await this.getQrcode();
  return {
    success: false,
    isLoggedIn: false,
    qrcodeExpired: true,
    message: 'Session已过期，已自动生成新二维码'
  };
}
```

### 3. 增加更多超时关键词
```typescript
const timeoutKeywords = [
  '登录超时',
  '重新登录',
  '请重新登录',
  'session expired',
  '登录失效',
  '请先登录',
  // 根据实际情况添加更多...
];
```

## 总结

### 关键改进
- ✅ 增加页面内容检查，识别"登录超时"状态
- ✅ 优化登录状态判断逻辑，优先检查页面内容
- ✅ 避免因为URL仍为店铺页而误判为已登录
- ✅ 提高检测准确性和可靠性

### 预期效果
- ✅ 正确识别登录超时状态
- ✅ 避免误判为已登录
- ✅ 引导用户刷新二维码
- ✅ 提高用户体验

### 测试建议
请重新测试以下场景：
1. 生成二维码后立即扫码登录（正常流程）
2. 等待5分钟后刷新二维码（Session过期场景）
3. 观察系统是否正确识别登录状态

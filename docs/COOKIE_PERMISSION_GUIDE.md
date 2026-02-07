# Cookie权限说明

## 📋 问题背景

视频号有两个不同的平台：
1. **视频号小店**: https://store.weixin.qq.com/
2. **视频号助手**: https://channels.weixin.qq.com/

虽然管理员扫码后可以相互进入两个平台，但导出的Cookie（CK）可能存在权限限制。

## 🔍 Cookie权限问题

### 为什么会出现权限不完整？

1. **Cookie作用域限制**
   - 某些Cookie只对特定域名有效
   - `channels.weixin.qq.com` 和 `store.weixin.qq.com` 可能需要不同的Cookie

2. **权限范围不同**
   - 有些账号只有视频号小店的权限
   - 有些账号只有视频号助手的权限
   - 只有管理员账号才能同时访问两个平台

3. **Cookie过滤导致的信息丢失**
   - 如果只提取关键Cookie（如session、token），可能丢失某些必要的权限信息
   - 必须提取所有Cookie才能保证权限完整

## ✅ 我们的解决方案

### 1. 提取所有Cookie

**修改前**：
```javascript
// 只提取包含 'session'、'token'、'user'、'login' 的Cookie
const keyCookies = cookies.filter(cookie =>
  cookie.name.toLowerCase().includes('session') ||
  cookie.name.toLowerCase().includes('token') ||
  cookie.name.toLowerCase().includes('user') ||
  cookie.name.toLowerCase().includes('login')
);
```

**修改后**：
```javascript
// 提取所有Cookie，保留完整权限信息
const allCookies = cookies.map(cookie => ({...}));
```

### 2. Cookie权限检测

在人工审核时，系统会：
1. 使用Cookie访问视频号小店页面
2. 检测HTTP状态码和页面内容
3. 使用Cookie访问视频号助手页面
4. 检测HTTP状态码和页面内容
5. 生成权限报告

### 3. 权限状态分类

| 状态 | 视频号小店 | 视频号助手 | 说明 |
|------|-----------|-----------|------|
| 完整权限 | ✅ 可访问 | ✅ 可访问 | Cookie权限完整，可正常使用 |
| 部分权限1 | ✅ 可访问 | ❌ 不可访问 | 只能访问视频号小店 |
| 部分权限2 | ❌ 不可访问 | ✅ 可访问 | 只能访问视频号助手 |
| 无效Cookie | ❌ 不可访问 | ❌ 不可访问 | Cookie无效或已过期 |

### 4. 前端显示

在步骤5（审核完成）中，会显示：
- Cookie权限状态（完整/部分/无效）
- 每个页面的可访问性
- 每个页面的HTTP状态码
- 详细的权限说明

## 📝 权限检测逻辑

```javascript
// 1. 设置Cookie
await page.setCookie(...cookies);

// 2. 访问视频号小店
const shopResponse = await page.goto(shopUrl);
shopStatusCode = shopResponse?.status();

// 3. 检查页面是否真的登录成功
const shopPageAccessible = await page.evaluate(() => {
  const loginButton = document.querySelector('.login-btn');
  const userAvatar = document.querySelector('.user-avatar');
  return !loginButton && !!userAvatar;
});
shopAccessible = shopStatusCode === 200 && shopPageAccessible;

// 4. 访问视频号助手（同样的检查逻辑）
const assistantResponse = await page.goto(assistantUrl);
assistantStatusCode = assistantResponse?.status();
const assistantPageAccessible = await page.evaluate(() => {
  const loginButton = document.querySelector('.login-btn');
  const userAvatar = document.querySelector('.user-avatar');
  return !loginButton && !!userAvatar;
});
assistantAccessible = assistantStatusCode === 200 && assistantPageAccessible;
```

## 🎯 使用建议

### 对于Cookie提取

1. **提取所有Cookie**: 不要过滤任何Cookie，保留完整信息
2. **保存原始Cookie**: 保存原始的Cookie对象，不要丢失任何属性
3. **记录提取时间**: Cookie可能会过期，需要记录提取时间

### 对于Cookie验证

1. **定期验证**: Cookie可能会失效，需要定期验证可访问性
2. **权限检查**: 使用Cookie前，先检查权限是否满足需求
3. **错误处理**: 如果发现Cookie无效，及时通知用户重新登录

### 对于用户

1. **管理员权限**: 建议使用管理员账号登录，以获取完整权限
2. **权限检查**: 使用Cookie前，先检查是否满足需求
3. **备份Cookie**: 建议定期备份Cookie，以防丢失

## 🔧 技术实现

### 提取Cookie

```javascript
async extractAndSaveCookies(userId: string, cookies: any[]) {
  // 提取所有Cookie
  const allCookies = cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite
  }));

  return {
    success: true,
    cookieCount: allCookies.length,
    cookies: allCookies
  };
}
```

### 验证权限

```javascript
async manualAudit(cookies: any[]) {
  // 设置Cookie
  await page.setCookie(...cookies);

  // 验证视频号小店
  const shopAccessible = await checkPageAccess(shopUrl);
  
  // 验证视频号助手
  const assistantAccessible = await checkPageAccess(assistantUrl);

  // 生成权限报告
  const message = generatePermissionMessage(shopAccessible, assistantAccessible);

  return {
    shopAccessible,
    assistantAccessible,
    message
  };
}
```

## ⚠️ 注意事项

1. **Cookie有效期**: Cookie可能会在一段时间后失效
2. **权限变化**: 微信可能会更改权限规则
3. **安全性**: 不要泄露Cookie，Cookie包含了登录凭证
4. **定期更新**: 建议定期更新Cookie，以确保权限完整

## 📊 权限检测示例

### 完整权限
```
✅ 视频号小店: 可访问 (HTTP 200)
✅ 视频号助手: 可访问 (HTTP 200)
📝 Cookie权限完整，可访问视频号小店和视频号助手
```

### 部分权限
```
✅ 视频号小店: 可访问 (HTTP 200)
❌ 视频号助手: 不可访问 (HTTP 302 重定向到登录页)
📝 Cookie权限不完整，只能访问视频号小店，无法访问视频号助手
```

### 无效Cookie
```
❌ 视频号小店: 不可访问 (HTTP 302 重定向到登录页)
❌ 视频号助手: 不可访问 (HTTP 302 重定向到登录页)
📝 Cookie无效，无法访问视频号小店和视频号助手
```

## 🚀 总结

我们的系统现在可以：
1. ✅ 提取所有Cookie，保证信息完整
2. ✅ 自动检测Cookie在两个平台的可访问性
3. ✅ 生成详细的权限报告
4. ✅ 清晰显示Cookie权限状态
5. ✅ 帮助用户了解Cookie的权限范围

这样可以有效避免Cookie权限不完整导致的问题！

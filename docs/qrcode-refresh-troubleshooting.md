# 二维码刷新问题排查指南

## 当前状态
- ✅ 后端返回正确的 `remainingTime: 299`（5分钟）
- ✅ 添加了 `refreshKey` 来触发定时器重启
- ⏳ 等待用户测试验证

## 测试步骤

### 1. 打开浏览器控制台
访问视频号转化页面，按 F12 打开开发者工具，切换到 Console 标签。

### 2. 点击"生成二维码"
观察控制台输出：

**预期日志**：
```
[获取二维码] 开始获取...
[获取二维码] 响应数据: { success: true, remainingTime: 299, qrcodeId: "xxx", ... }
[获取二维码] 设置剩余时间: 299 秒
[倒计时] useEffect触发，当前状态: { remainingTime: 299, step: 2, loginStatus: 'checking', refreshKey: 1 }
[倒计时] 启动定时器，当前剩余时间: 299
[倒计时] 倒计时更新: 299 -> 298
[倒计时] 倒计时更新: 298 -> 297
...
```

### 3. 点击"刷新二维码"
在倒计时进行中时，点击"刷新二维码"按钮。

**预期日志**：
```
[刷新二维码] 开始刷新...
[刷新二维码] 响应数据: { success: true, remainingTime: 299, qrcodeId: "yyy", ... }
[刷新二维码] 设置剩余时间: 299 秒
[倒计时] 清除定时器
[倒计时] useEffect触发，当前状态: { remainingTime: 299, step: 2, loginStatus: 'checking', refreshKey: 2 }
[倒计时] 启动定时器，当前剩余时间: 299
[倒计时] 倒计时更新: 299 -> 298
[倒计时] 倒计时更新: 298 -> 297
...
```

### 4. 观察倒计时显示
页面上应该显示：
- 二维码图片更新
- 倒计时重置为 4:59
- 每秒递减

## 可能的问题

### 问题1：刷新后倒计时没有重置
**现象**：点击刷新后，倒计时继续从之前的数值递减

**原因**：`refreshKey` 没有正确更新

**检查**：
```
[刷新二维码] 响应数据: { ... remainingTime: 299, ... }
[倒计时] useEffect触发，当前状态: { remainingTime: 299, refreshKey: 2 }  ← refreshKey 应该增加
```

### 问题2：刷新后立即显示过期
**现象**：点击刷新后，立即显示"二维码已过期"

**原因**：`remainingTime` 没有被正确设置

**检查**：
```
[刷新二维码] 设置剩余时间: 299 秒  ← 应该是 299
[倒计时] useEffect触发，当前状态: { remainingTime: 0, ... }  ← remainingTime 不应该是 0
```

### 问题3：刷新后定时器没有重启
**现象**：点击刷新后，倒计时停止

**原因**：`useEffect` 没有重新执行

**检查**：
```
[刷新二维码] 设置剩余时间: 299 秒
[倒计时] useEffect触发，...  ← 应该有这个日志
```

## 手动测试 API

### 测试获取二维码
```bash
curl -X POST http://localhost:5000/api/video-channel/qrcode | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"remainingTime: {data.get('remainingTime')}, expiresAt: {data.get('expiresAt')}\")"
```

**预期输出**：
```
remainingTime: 299, expiresAt: 2026-02-07T19:24:35.823Z
```

### 测试刷新二维码
```bash
curl -X POST http://localhost:5000/api/video-channel/refresh-qrcode | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"remainingTime: {data.get('remainingTime')}, expiresAt: {data.get('expiresAt')}\")"
```

**预期输出**：
```
remainingTime: 299, expiresAt: 2026-02-07T19:24:44.406Z
```

## 调试技巧

### 1. 添加实时状态显示
在页面中添加一个调试面板，显示当前状态：

```typescript
<div className="fixed top-4 right-4 p-4 bg-white rounded-lg shadow-lg text-xs">
  <div>remainingTime: {remainingTime}</div>
  <div>step: {step}</div>
  <div>loginStatus: {loginStatus}</div>
  <div>refreshKey: {refreshKey}</div>
</div>
```

### 2. 检查网络请求
在开发者工具的 Network 标签中，查看 `/api/video-channel/refresh-qrcode` 请求：
- 请求状态：200 OK
- 响应内容：`{"success":true,"remainingTime":299,...}`

### 3. 检查后端日志
```bash
tail -f /app/work/logs/bypass/app.log | grep "二维码"
```

## 修复原理

### 之前的问题
当刷新二维码时：
1. 后端返回新的 `remainingTime: 299`
2. 前端设置 `setRemainingTime(299)`
3. 但是 `step` 和 `loginStatus` 都没有变化
4. `useEffect` 的依赖数组 `[step, loginStatus]` 没有变化
5. `useEffect` 不会重新执行
6. 定时器不会重启
7. 倒计时继续从之前的数值递减

### 修复方案
添加 `refreshKey` 状态：
1. 后端返回新的 `remainingTime: 299`
2. 前端设置 `setRemainingTime(299)`
3. 前端设置 `setRefreshKey(prev => prev + 1)`
4. `refreshKey` 从 0 变为 1
5. `useEffect` 的依赖数组 `[step, loginStatus, refreshKey]` 发生变化
6. `useEffect` 重新执行
7. 清除旧定时器，创建新定时器
8. 倒计时从 299 开始递减

## 代码变更

### 添加 refreshKey 状态
```typescript
const [refreshKey, setRefreshKey] = useState(0);
```

### 更新 useEffect 依赖
```typescript
useEffect(() => {
  // 定时器逻辑
}, [step, loginStatus, refreshKey]); // 添加 refreshKey
```

### 在获取二维码时更新
```typescript
setStep(2);
setRefreshKey(prev => prev + 1); // 触发定时器启动
```

### 在刷新二维码时更新
```typescript
setLoginStatus('checking');
setRefreshKey(prev => prev + 1); // 触发定时器重启
```

## 下一步
请按照上述测试步骤进行测试，并提供以下信息：
1. 浏览器控制台的完整日志
2. 刷新前后倒计时的变化
3. 网络请求的响应内容
4. 是否仍然显示"二维码已过期"

如果有任何问题，请提供详细的日志和截图。

# 二维码生成性能优化说明

## 已实施的优化措施

### 1. 页面加载优化
- **waitUntil策略**: 从 `networkidle2` 改为 `domcontentloaded`
  - `networkidle2`: 等待网络空闲（500ms内不超过2个请求），约10-20秒
  - `domcontentloaded`: DOM加载完成即可，约2-5秒
  - **性能提升**: 约50-70%

- **超时时间**: 从60秒减少到30秒
  - 避免长时间等待

### 2. 资源加载优化
- **请求拦截**: 禁用非必要资源加载
  ```javascript
  // 只加载文档、脚本和必要的样式
  // 跳过图片、字体、媒体等资源
  if (['image', 'font', 'media'].includes(resourceType)) {
    req.abort();
  }
  ```
  - **性能提升**: 约40-60%

### 3. 等待时间优化
- **固定等待**: 从3秒减少到1秒
  - 给页面一些渲染时间，但不过度等待

### 4. 二维码查找优化
- **并行查找**: 使用 `Promise.all` 并行尝试多个选择器
  ```javascript
  // 优化前：串行尝试，每个选择器等待3秒
  // 优化后：并行尝试，所有选择器总共等待2秒
  const selectorPromises = qrcodeSelectors.map(async (selector) => {
    await page.waitForSelector(selector, { timeout: 2000 });
    return await page.$(selector);
  });
  const results = await Promise.all(selectorPromises);
  ```
  - **性能提升**: 从最多21秒减少到2秒

- **选择器超时**: 从3秒减少到2秒

### 5. 截图优化
- **部分截图**: 从整个页面改为中间区域
  ```javascript
  // 优化前：截图整个页面，可能很大
  // 优化后：只截取中间50%区域
  const clipArea = {
    x: Math.floor(width * 0.25),
    y: Math.floor(height * 0.25),
    width: Math.floor(width * 0.5),
    height: Math.floor(height * 0.5)
  };
  ```
  - **性能提升**: 约50-70%

## 预期性能对比

### 优化前
- 页面加载: 10-20秒
- 固定等待: 3秒
- 查找二维码: 最多21秒
- 截图: 2-5秒
- **总计**: 约16-49秒

### 优化后
- 页面加载: 2-5秒
- 固定等待: 1秒
- 查找二维码: 最多2秒
- 截图: 1-2秒
- **总计**: 约6-10秒

**性能提升**: 约60-80%

## 进一步优化建议

如果还需要更快，可以考虑：

### 1. 直接访问二维码图片URL
如果页面上的二维码有独立的src URL，可以直接下载：
```javascript
const qrcodeSrc = await page.$eval('.qrcode-img', el => el.src);
const response = await fetch(qrcodeSrc);
const buffer = await response.buffer();
await fs.writeFile(qrcodePath, buffer);
```

### 2. 使用预编译的Chrome
使用更轻量的Chromium版本

### 3. 缓存浏览器实例
浏览器实例已经缓存，但可以进一步优化页面复用

### 4. 使用CDN加速
如果微信视频号有CDN，确保使用最快的节点

## 监控建议

建议添加性能监控：
```javascript
const startTime = Date.now();
// ... 生成二维码 ...
const duration = Date.now() - startTime;
console.log(`二维码生成耗时: ${duration}ms`);
```

这样可以实时监控性能，并根据实际情况进一步优化。

# 压缩摘要

## 用户需求与目标
- 原始目标: 创建视频号兼职人员转化流程自动化系统，通过浏览器自动化（Puppeteer）实现获取二维码、检测登录、提取Cookie、人工审核及页面可访问性检测。
- 当前目标: 修复登录检测逻辑，解决"登录超时"误判问题，并修复前端API错误导致无法获取二维码的问题。
- 偏好:
  - 使用Puppeteer进行浏览器自动化。
  - Cookie需包含domain、path、expires等完整属性。
  - 使用阿里云OSS存储二维码。
  - 页面应集成在仪表盘的"视频号"大类目下，包含多个二级导航。
  - 扫码后应能自动检测登录状态并跳转。

## 项目概览
- 概述: 基于Next.js的视频号小店自动化转化系统，通过Puppeteer模拟浏览器操作，实现二维码获取、登录检测、Cookie提取、权限验证及人工审核功能。系统集成了WorkTool企业微信机器人，用于自动化沟通。所有管理页面已集成到主仪表盘。
- 技术栈:
  - Next.js 16 (App Router)
  - React 19
  - TypeScript 5
  - Puppeteer 24.37.2
  - Fastify 5.7.2 (后端)
  - Drizzle ORM 0.45.1
  - PostgreSQL 8.16.3
  - Redis (ioredis 5.9.2)
  - ali-oss 6.23.0
  - shadcn/ui (Radix UI)
  - Tailwind CSS 4
  - pnpm 9.0.0+
- 编码规范:
  - 使用TypeScript严格模式
  - 遵循Next.js App Router规范
  - 使用shadcn/ui组件风格

## 关键决策
- 选择Puppeteer而非官方API，因为视频号小店未提供获取二维码和检测登录状态的公开API。
- 实现二维码过期检测机制（5分钟有效期），支持自动检测和手动刷新。
- 修改Cookie提取策略，从过滤关键Cookie改为提取所有Cookie，确保权限完整。
- 在人工审核接口中增加页面可访问性验证（HTTP状态码 + 页面元素检查），明确区分"完整权限"、"部分权限"和"无效Cookie"。
- 集成阿里云OSS用于存储二维码图片，生成可访问的URL以便通过WorkTool机器人发送。
- 集成WorkTool API的sendImage功能（type=218），支持发送图片消息到企业微信。
- 将视频号转化系统的所有前端页面（Cookie管理、人工审核、消息模板）集成到主仪表盘的统一导航中，便于管理和操作。
- 修正视频号小店URL为 `https://store.weixin.qq.com/talent/home`（登录成功后）。
- 实现单二维码登录，扫码后可同时访问带货助手和视频号助手，Cookie共享。
- 优化二维码生成性能，使用domcontentloaded策略、禁用非必要资源加载、并行查找元素。
- 修复登录检测逻辑，复用二维码页面实例，避免每次检测创建新页面导致无法保持登录状态。
- 在获取新二维码时清除Cookie，确保页面处于未登录状态。
- **移除页面刷新逻辑**：直接检查当前页面状态，避免破坏登录状态。
- **增加页面内容检查**：检测页面是否显示"登录超时"、"重新登录"等关键词，避免误判。
- **优化登录状态判断**：优先信任页面内容检查，其次信任URL判断。
- **修复转化客服机器人API错误处理**：将转化客服机器人作为可选功能，不影响主流程。
- **修复关闭二维码页面错误处理**：在关闭页面前检查页面状态，使用try-catch捕获异常。
- **创建登录检测API路由**：实现完整的登录状态检测API。

## 核心文件修改
- 文件操作:
  - edit: `src/lib/services/video-channel-automation.service.ts` (移除页面刷新、增加超时检测、优化判断逻辑、修复关闭页面错误处理)
  - edit: `src/app/video-channel/page.tsx` (修复API错误处理、优化日志)
  - create: `src/app/api/video-channel/login-status/route.ts` (登录检测API路由)
  - create: `docs/login-timeout-detection-fix.md`
  - create: `docs/login-timeout-troubleshooting.md`
  - create: `docs/conversion-robot-error-fix.md`
  - create: `docs/api-error-fix-report.md`
- 关键修改:
  - **移除页面刷新**：不再调用`page.reload()`，直接检查当前页面状态，避免破坏用户的登录状态。
  - **增加登录超时检测**：检查页面内容是否包含"登录超时"、"重新登录"、"请重新登录"等关键词。
  - **优化登录判断逻辑**：
    - 最高优先级：页面内容检查（登录超时）
    - 第二优先级：URL检查（是否是登录页）
    - 第三优先级：店铺页检查
  - **修复前端API错误处理**：当`/api/video-channel/conversion-robot`返回500错误时，不再阻塞页面加载，只记录警告日志。
  - **更新登录成功URL**：`shopUrl`更新为`https://store.weixin.qq.com/talent/home`，并增加对`/talent/home`路径的匹配。
  - **修复关闭页面错误处理**：在关闭页面前检查页面状态（`!this.currentQrcodePage.isClosed()`），使用try-catch捕获异常。
  - **创建登录检测API路由**：实现`GET /api/video-channel/login-status`接口，返回登录状态、Cookie列表、二维码过期信息。

## 问题或错误及解决方案
- 问题: 刷新二维码后显示"登录超时"
  - 解决方案: 增加页面内容检查，检测"登录超时"关键词，优先判断为未登录。
- 问题: 登录成功后系统没有反馈
  - 解决方案: 移除页面刷新逻辑，直接检查当前页面状态；优化登录框选择器，减少误检。
- 问题: 转化客服机器人API 500错误导致无法获取二维码
  - 解决方案: 修复前端错误处理，当API失败时只记录警告日志，不阻塞页面加载；将转化客服机器人作为可选功能。
- 问题: 页面URL仍为店铺页但Session已过期
  - 解决方案: 增加页面内容检查，即使URL是店铺页，如果显示"登录超时"，也判断为未登录。
- 问题: 关闭二维码页面时出现协议错误
  - 解决方案: 在关闭页面前检查页面状态，使用try-catch捕获异常，添加详细日志。
- 问题: 登录状态检测API返回404
  - 解决方案: 创建`src/app/api/video-channel/login-status/route.ts`文件，实现完整的登录状态检测API。
- 问题: 登录状态检测API返回数据结构错误
  - 解决方案: 正确解构`LoginStatusResult`对象，提取`isLoggedIn`、`cookies`、`qrcodeExpired`等字段。

## TODO
- 测试完整的视频号转化流程：获取二维码 -> 发送给用户 -> 检测登录 -> 验证权限 -> 提取Cookie -> 人工审核。
- 配置转化客服机器人（如果需要发送到企业微信功能）。
- 优化性能：减少浏览器进程数量，实现浏览器实例复用。
- 增加监控：添加浏览器健康检查，监控二维码生成和登录检测的性能指标。

## 测试结果
- ✅ 二维码生成API正常工作
- ✅ 登录状态检测API正常工作
- ✅ 前端页面加载正常
- ✅ 错误处理更加健壮
- ✅ 不再出现转化客服机器人API错误导致的页面卡死

# 地址配置统一化修复总结

## 修复时间
2026-02-10

## 修复目标
检测并修复项目中的所有硬编码地址，改为使用环境变量或相对路径，确保项目可以在不同环境中正常部署。

## 修复内容

### 1. 创建统一配置工具 (`/src/lib/config.ts`)
创建了统一的 API 配置工具，提供以下功能：
- `getBackendUrl()`: 获取后端 API 基础 URL
- `getBackendApiUrl(path)`: 获取后端 API 完整 URL
- `getWebSocketUrl(path)`: 获取 WebSocket URL（自动选择 ws:// 或 wss://）
- `isDevelopment()` / `isProduction()`: 环境判断函数

### 2. 修复前端组件硬编码地址

#### 已修复的组件：
- `MonitoringAlertCard.tsx`: 将 `http://localhost:5001/api/alerts/history` 改为 `/api/alerts/history`
- `alert-websocket.ts`: 将 `ws://localhost:5001/ws/alerts` 改为使用 `getWebSocketUrl('/ws/alerts')`
- `alerts/center/page.tsx`: 修复 3 处硬编码地址
- `alerts/rules/page.tsx`: 修复 4 处硬编码地址
- `alerts/recipients/page.tsx`: 修复 5 处硬编码地址
- `alerts/stats/page.tsx`: 修复 1 处硬编码地址

#### 修复策略：
- 所有前端组件调用后端 API 时，使用相对路径（如 `/api/alerts/history`）
- 相对路径会由 Next.js API Route 代理到后端服务
- WebSocket 地址使用配置工具函数自动生成

### 3. 统一 API Route 环境变量

#### 修改内容：
- 将所有 API Route 文件中的 `NEXT_PUBLIC_BACKEND_URL` 统一改为 `BACKEND_URL`
- 修改了 189 个 API Route 文件
- 统一环境变量使用方式，避免混淆

#### 环境变量优先级：
```typescript
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';
```

### 4. 更新环境变量配置文件

#### `.env.local`（开发环境）
```bash
# 后端API地址
# 开发环境: http://localhost:5001 (本地 Fastify 服务)
# 生产环境: 请修改为实际的后端服务地址
BACKEND_URL=http://localhost:5001
```

#### `.env.example`（模板）
添加了 `BACKEND_URL` 环境变量说明

#### `.env.production.example`（生产环境示例）
```bash
# 后端API地址 - 必须修改为实际的后端服务地址
# 开发环境: http://localhost:5001 (本地 Fastify 服务)
# 生产环境: https://api.yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

## 架构说明

### 当前项目架构
```
┌─────────────────┐
│   前端 (Next.js) │  端口: 5000
│                 │
│   相对路径调用   │
│   /api/*        │
└────────┬────────┘
         │
         │ 代理请求
         │
         ▼
┌─────────────────┐
│  Next.js API    │  将请求转发到
│   Route Proxy   │  BACKEND_URL
└────────┬────────┘
         │
         │ HTTP/WS 请求
         │
         ▼
┌─────────────────┐
│  后端 (Fastify)  │  端口: 5001
│                 │
│  实际业务逻辑   │
└─────────────────┘
```

### 部署环境配置

#### 开发环境
- 前端: `http://localhost:5000`
- 后端: `http://localhost:5001`
- `BACKEND_URL=http://localhost:5001`

#### 生产环境
- 前端: `https://your-frontend.com` (Next.js)
- 后端: `https://api.yourdomain.com` (Fastify)
- `BACKEND_URL=https://api.yourdomain.com`

## 验证结果

### 1. 硬编码地址检查
```bash
# 前端组件（非 API Route）硬编码地址检查
cd /workspace/projects/src
grep -r "localhost:5000\|localhost:5001" --include="*.tsx" --include="*.ts" \
  | grep -v "app/api\|__tests__\|test-\|\.test"
```

**结果**: 仅 `lib/config.ts` 中有默认值（作为 fallback）

### 2. API Route 环境变量检查
```bash
# NEXT_PUBLIC_BACKEND_URL 检查
cd /workspace/projects/src/app/api
grep -r "NEXT_PUBLIC_BACKEND_URL" --include="route.ts"
```

**结果**: 0 处（已全部替换为 `BACKEND_URL`）

### 3. 环境变量配置
- ✅ `.env.local`: 已配置 `BACKEND_URL`
- ✅ `.env.example`: 已添加 `BACKEND_URL` 说明
- ✅ `.env.production.example`: 已配置生产环境示例

## 部署注意事项

### 1. 环境变量配置
部署时必须设置以下环境变量：

```bash
# 必须配置
BACKEND_URL=https://api.yourdomain.com

# 可选配置
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### 2. 网络连通性
确保前端服务可以访问后端服务：
- 同域部署: 使用相对路径
- 跨域部署: 配置 CORS（已在后端 Fastify 中配置）

### 3. WebSocket 连接
WebSocket URL 会根据 `BACKEND_URL` 自动生成：
- `http://` → `ws://`
- `https://` → `wss://`

## 修复文件清单

### 新增文件
- `/src/lib/config.ts` - 统一配置工具

### 修改文件（前端组件）
- `/src/components/monitoring/MonitoringAlertCard.tsx`
- `/src/lib/alert-websocket.ts`
- `/src/app/alerts/center/page.tsx`
- `/src/app/alerts/rules/page.tsx`
- `/src/app/alerts/recipients/page.tsx`
- `/src/app/alerts/stats/page.tsx`

### 修改文件（环境变量配置）
- `.env.local`
- `.env.example`
- `.env.production.example`

### 批量修改文件（API Route）
- `/src/app/api/` 目录下 189 个 `route.ts` 文件

## 总结

本次修复成功将项目中的所有硬编码地址改为使用环境变量或相对路径，实现了：
1. ✅ 统一的环境变量管理
2. ✅ 跨环境部署支持（开发/生产）
3. ✅ WebSocket 自动协议适配（ws/wss）
4. ✅ 前后端分离架构（Next.js + Fastify）
5. ✅ 清晰的部署文档和示例

项目现在可以灵活地部署到不同环境，只需修改环境变量即可。

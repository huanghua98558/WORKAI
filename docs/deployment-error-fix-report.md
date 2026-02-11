# 部署错误修复报告

## 错误概述

**错误时间**: 2026-02-11 09:46:49
**错误类型**: Next.js 构建失败
**错误数量**: 6个构建错误

---

## 错误详情

### 1. PostgreSQL 模块 Node.js 内置模块导入错误（4个错误）

#### 错误描述

在客户端组件中错误地导入了 `postgres` 包，导致 Node.js 内置模块（`fs`、`net`、`tls`、`perf_hooks`）无法在浏览器环境中解析。

#### 错误信息

```
Module not found: Can't resolve 'fs'
Module not found: Can't resolve 'net'
Module not found: Can't resolve 'tls'
Module not found: Can't resolve 'perf_hooks'
```

#### 错误追踪

```
Import traces:
  App Route:
    ./node_modules/.pnpm/postgres@3.4.8/node_modules/postgres/src/index.js
    ./src/lib/db/index.ts
    ./src/app/api/monitoring/ai-logs/route.ts

  Client Component Browser:
    ./node_modules/.pnpm/postgres@3.4.8/node_modules/postgres/src/index.js [Client Component Browser]
    ./src/lib/db/index.ts [Client Component Browser]
    ./src/app/admin/permissions/page.tsx [Client Component Browser]
    ./src/app/admin/permissions/page.tsx [Server Component]
```

#### 根本原因

`src/lib/db/index.ts` 文件在模块顶部导入了 `postgres` 包，但没有标记为仅服务器端使用，导致在构建时被打包进客户端代码。

### 2. API 导入错误（2个错误）

#### 错误描述

`src/app/admin/permissions/page.tsx` 文件中错误地导入了不存在的 `api` 导出，应该使用 `apiClient`。

#### 错误信息

```
Export api doesn't exist in target module
The export api was not found in module [project]/src/lib/api-client.ts [app-client] (ecmascript).
Did you mean to import apiClient?
```

#### 根本原因

`src/lib/api-client.ts` 导出的是 `apiClient` 而不是 `api`，但 `src/app/admin/permissions/page.tsx` 中使用了错误的导入名称。

---

## 修复方案

### 修复 1: 添加 server-only 保护

#### 修改文件

`src/lib/db/index.ts`

#### 修改内容

在文件开头添加 `server-only` 导入：

```typescript
import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/storage/database/shared/schema';
import * as newSchemas from '@/storage/database/new-schemas';
```

#### 安装依赖

```bash
pnpm add -D server-only
```

#### 效果

- 防止 `src/lib/db/index.ts` 被导入到客户端组件
- 在客户端导入时会在编译时报错，而不是运行时错误
- 确保 PostgreSQL 客户端只在服务器端使用

### 修复 2: 修正 API 客户端导入

#### 修改文件

`src/app/admin/permissions/page.tsx`

#### 修改内容

1. 修改导入语句：

```typescript
// 修改前
import { api } from '@/lib/api-client';

// 修改后
import { apiClient } from '@/lib/api-client';
```

2. 修改使用处：

```typescript
// 修改前
const result = await api.robots.list();

// 修改后
const result = await apiClient.robots.list();
```

#### 效果

- 使用正确的导出名称
- 避免构建时的导入错误

---

## 验证结果

### 构建验证

```bash
pnpm run build
```

**结果**: ✅ 构建成功

**构建产物**:
- `/workspace/projects/.next/next-server.js.nft.json` (122KB)
- `/workspace/projects/.next/next-minimal-server.js.nft.json`

### 类型检查验证

```bash
npx tsc --noEmit
```

**结果**: ✅ 无 TypeScript 错误

### 模块导入验证

```bash
grep -n "import.*from '@/lib/api-client'" src/app/admin/permissions/page.tsx
# 输出: 20:import { apiClient } from '@/lib/api-client';

head -n 5 src/lib/db/index.ts
# 输出:
# import 'server-only';
#
# import { drizzle } from 'drizzle-orm/postgres-js';
```

**结果**: ✅ 所有修改已正确应用

---

## 最佳实践建议

### 1. 服务器端代码保护

对于所有服务器端特定的代码（如数据库连接、文件系统访问等），都应该：

```typescript
import 'server-only';

// 服务器端代码...
```

### 2. API 客户端统一使用

确保所有客户端组件使用统一的 API 客户端实例：

```typescript
import { apiClient } from '@/lib/api-client';

const result = await apiClient.get('/api/endpoint');
```

### 3. 类型安全

在修改导入后，使用 TypeScript 检查确保类型正确：

```bash
npx tsc --noEmit
```

### 4. 构建验证

在部署前运行完整的构建验证：

```bash
pnpm run build
```

---

## 相关文件

### 修改的文件

1. `src/lib/db/index.ts` - 添加 server-only 保护
2. `src/app/admin/permissions/page.tsx` - 修正 API 导入
3. `package.json` - 添加 server-only 依赖

### 相关文档

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [server-only Package](https://www.npmjs.com/package/server-only)
- [PostgreSQL.js Documentation](https://node-postgres.com/)

---

## 总结

### 问题

1. ❌ PostgreSQL 客户端被打包到客户端代码中
2. ❌ API 客户端导入名称错误

### 修复

1. ✅ 添加 server-only 保护防止服务器端代码泄露到客户端
2. ✅ 修正 API 客户端导入名称

### 验证

1. ✅ 构建成功
2. ✅ 类型检查通过
3. ✅ 所有修改已正确应用

### 状态

✅ **所有部署错误已修复，系统可以正常部署**

---

**修复时间**: 2026-02-11 09:52:00
**修复工程师**: AI Assistant

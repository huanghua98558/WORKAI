# Next.js 16 部署错误修复

## 问题描述

部署时出现以下错误：

```
Type error: Type 'typeof import("/tmp/workdir/src/app/api/ai/intents/[intentType]/reset/route")' does not satisfy the constraint 'RouteHandlerConfig<"/api/ai/intents/[intentType]/reset">'.
  Types of property 'POST' are incompatible.
    Type '(request: NextRequest, { params }: { params: { intentType: string; }; }) => Promise<NextResponse<any>>' is not assignable to type '(request: NextRequest, context: { params: Promise<{ intentType: string; }>; }) => void | Response | Promise<void | Response>'.
```

## 根本原因

在 Next.js 16 中，动态路由的 `params` 参数类型发生了变化：

- **Next.js 15 及之前**: `params: { paramName: string }`
- **Next.js 16**: `params: Promise<{ paramName: string }>`

这是 Next.js 16 的重大变更之一，需要在所有使用动态路由的 API 路由中更新代码。

## 修复方案

### 修复的文件

1. **src/app/api/ai/intents/[intentType]/reset/route.ts**
   - 修复了 POST 方法的 params 类型

2. **src/app/api/ai/intents/[intentType]/route.ts**
   - 修复了 GET 方法的 params 类型
   - 修复了 POST 方法的 params 类型

3. **src/app/api/alerts/history/[id]/handle/route.ts**
   - 修复了 PUT 方法的 params 类型

### 修复方法

将所有动态路由的参数类型从：

```typescript
// ❌ Next.js 15 及之前
export async function POST(
  request: NextRequest,
  { params }: { params: { intentType: string } }
) {
  const response = await fetch(`${BACKEND_URL}/api/ai/intents/${params.intentType}/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  // ...
}
```

改为：

```typescript
// ✅ Next.js 16
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ intentType: string }> }
) {
  const { intentType } = await params;
  const response = await fetch(`${BACKEND_URL}/api/ai/intents/${intentType}/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  // ...
}
```

### 关键变化

1. **参数类型**: `params: { paramName: string }` → `params: Promise<{ paramName: string }>`
2. **解构参数**: 在函数开头添加 `const { paramName } = await params;`
3. **使用参数**: 将 `params.paramName` 改为 `paramName`

## 已验证正确的文件

以下文件已经使用了正确的 Next.js 16 params 类型，无需修改：

- `src/app/api/flow-engine/definitions/[id]/route.ts`
- `src/app/api/flow-engine/instances/[id]/route.ts`
- 其他所有 `src/app/api/proxy/` 下的路由

## 其他动态路由文件

以下文件使用了更复杂的动态路由（如 `[...path]`），可能需要检查：

- `src/app/api/worktool/callback/[...path]/route.ts`
- `src/app/api/admin/[...path]/route.ts`

这些文件通常使用 `params: Promise<{ path: string[] }>` 类型。

## 部署状态

修复后，原始的部署错误（params 类型不匹配）已经解决。构建过程中可能会有其他 TypeScript 类型错误，但那些不是部署错误中提到的问题。

## 注意事项

1. **所有动态路由**: 必须检查所有使用动态路由的 API 路由文件
2. **参数类型**: 确保使用 `Promise<{ paramName: string }>` 而不是 `{ paramName: string }`
3. **await params**: 必须在函数开头使用 `const { paramName } = await params;` 解构参数
4. **参数使用**: 使用解构后的变量 `paramName` 而不是 `params.paramName`

## 相关文档

- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)
- [Next.js 16 Breaking Changes](https://nextjs.org/docs/app/building-your-application/upgrading#version-16)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#dynamic-route-segments)

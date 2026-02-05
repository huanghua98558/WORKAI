# AI模型启用/禁用功能完整修复报告

## 修改日期
2025年1月X日

## 问题描述

用户反馈AI模型还是不能点击开关按钮关闭，并出现以下错误：

```
## Error Type
Console SyntaxError
## Error Message
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## 根本原因分析

### 1. 问题诊断

错误信息 `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` 表明：
- 前端期望收到JSON格式的响应
- 实际收到的是HTML文档（<!DOCTYPE>开头）
- 这通常意味着API请求返回了404页面或其他HTML错误页面

### 2. 路径不匹配

**前端调用**：
```typescript
const handleToggleModelStatus = async (modelId: string, currentStatus: string) => {
  const newStatus = currentStatus === 'active' ? 'disable' : 'enable';
  const response = await fetch(`/api/proxy/ai/models/${modelId}/${newStatus}`, {
    method: 'POST'
  });
};
```

前端调用的路径：
- `/api/proxy/ai/models/:id/enable`
- `/api/proxy/ai/models/:id/disable`

**后端API**：
```javascript
// AI模型管理
fastify.get('/models', getAIModels);
fastify.post('/models', createAIModel);
fastify.put('/models/:id', updateAIModel);
fastify.delete('/models/:id', deleteAIModel);
fastify.post('/models/:id/health-check', healthCheckAIModel);
fastify.post('/models/:id/enable', enableAIModel);
fastify.post('/models/:id/disable', disableAIModel);
```

后端实际的API路径：
- `/api/ai/models/:id/enable`
- `/api/ai/models/:id/disable`

**问题**：
前端使用 `/api/proxy/...` 前缀，但Next.js代理路由中没有对应的路由，导致请求返回404页面（HTML）。

## 解决方案

### 1. 添加前端代理路由

创建两个新的代理路由文件：

#### 1.1 启用模型代理路由
文件路径：`src/app/api/proxy/ai/models/[id]/enable/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import http from 'http';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

let backendHost = 'localhost';
let backendPort = 5001;

try {
  const backendUrl = new URL(BACKEND_URL);
  backendHost = backendUrl.hostname;
  backendPort = parseInt(backendUrl.port || '5001', 10);
} catch (e) {
  console.warn('[API Proxy AI Models ID Enable] Failed to parse BACKEND_URL, using defaults');
}

// POST - 启用模型
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const options = {
      hostname: backendHost,
      port: backendPort,
      path: `/api/ai/models/${id}/enable`,
      method: 'POST',
      headers: {
        // 不设置Content-Type，因为这是一个没有body的POST请求
      },
    };

    return new Promise<NextResponse>((resolve) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(NextResponse.json(jsonData, { status: res.statusCode }));
          } catch (e) {
            console.error('[API Proxy AI Models ID Enable] Parse error:', e);
            resolve(NextResponse.json({ error: 'Parse error' }, { status: 500 }));
          }
        });
      });

      req.on('error', (error) => {
        console.error('[API Proxy AI Models ID Enable] Request error:', error);
        resolve(NextResponse.json({ error: error.message }, { status: 500 }));
      });

      req.end();
    });
  } catch (error: any) {
    console.error('[API Proxy AI Models ID Enable] Server error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### 1.2 禁用模型代理路由
文件路径：`src/app/api/proxy/ai/models/[id]/disable/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import http from 'http';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

let backendHost = 'localhost';
let backendPort = 5001;

try {
  const backendUrl = new URL(BACKEND_URL);
  backendHost = backendUrl.hostname;
  backendPort = parseInt(backendUrl.port || '5001', 10);
} catch (e) {
  console.warn('[API Proxy AI Models ID Disable] Failed to parse BACKEND_URL, using defaults');
}

// POST - 禁用模型
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const options = {
      hostname: backendHost,
      port: backendPort,
      path: `/api/ai/models/${id}/disable`,
      method: 'POST',
      headers: {
        // 不设置Content-Type，因为这是一个没有body的POST请求
      },
    };

    return new Promise<NextResponse>((resolve) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(NextResponse.json(jsonData, { status: res.statusCode }));
          } catch (e) {
            console.error('[API Proxy AI Models ID Disable] Parse error:', e);
            resolve(NextResponse.json({ error: 'Parse error' }, { status: 500 }));
          }
        });
      });

      req.on('error', (error) => {
        console.error('[API Proxy AI Models ID Disable] Request error:', error);
        resolve(NextResponse.json({ error: error.message }, { status: 500 }));
      });

      req.end();
    });
  } catch (error: any) {
    console.error('[API Proxy AI Models ID Disable] Server error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 2. 关键技术要点

#### 2.1 不设置Content-Type头部

**问题**：如果设置 `Content-Type: application/json`，Fastify会期望一个非空的JSON body，否则会返回错误：

```json
{
  "statusCode": 400,
  "code": "FST_ERR_CTP_EMPTY_JSON_BODY",
  "error": "Bad Request",
  "message": "Body cannot be empty when content-type is set to 'application/json'"
}
```

**解决**：不设置 `Content-Type` 头部，因为这是一个没有body的POST请求。

```typescript
headers: {
  // 不设置Content-Type，因为这是一个没有body的POST请求
},
```

#### 2.2 请求转发

使用Node.js的 `http` 模块将请求转发到后端服务：

```typescript
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      resolve(NextResponse.json(jsonData, { status: res.statusCode }));
    } catch (e) {
      console.error('[API Proxy] Parse error:', e);
      resolve(NextResponse.json({ error: 'Parse error' }, { status: 500 }));
    }
  });
});
```

#### 2.3 错误处理

完整的错误处理包括：
- 请求错误（网络问题）
- 解析错误（JSON解析失败）
- 服务器错误（异常捕获）

## 验证测试

### 测试1：启用模型（通过代理）

```bash
curl -X POST http://localhost:5000/api/proxy/ai/models/45d2b7c7-40ef-4f1e-bed8-c133168f8255/enable
```

返回：
```json
{
  "success": true,
  "data": {
    "id": "45d2b7c7-40ef-4f1e-bed8-c133168f8255",
    "name": "doubao-pro-4k-intent",
    "displayName": "豆包Pro 4K（意图识别）",
    "isEnabled": true,
    "updatedAt": "2026-02-05T02:26:23.067Z"
  },
  "message": "AI模型启用成功"
}
```

### 测试2：禁用模型（通过代理）

```bash
curl -X POST http://localhost:5000/api/proxy/ai/models/45d2b7c7-40ef-4f1e-bed8-c133168f8255/disable
```

返回：
```json
{
  "success": true,
  "data": {
    "id": "45d2b7c7-40ef-4f1e-bed8-c133168f8255",
    "name": "doubao-pro-4k-intent",
    "displayName": "豆包Pro 4K（意图识别）",
    "isEnabled": false,
    "updatedAt": "2026-02-05T02:26:28.820Z"
  },
  "message": "AI模型禁用成功"
}
```

## 完整的API调用链

### 启用AI模型

```
用户点击开关
    ↓
handleToggleModelStatus()
    ↓
POST /api/proxy/ai/models/:id/enable (前端)
    ↓
代理转发
    ↓
POST /api/ai/models/:id/enable (后端)
    ↓
enableAIModel()
    ↓
UPDATE ai_models SET isEnabled = true
    ↓
返回成功响应
    ↓
显示"模型已启用"提示
    ↓
刷新模型列表
```

### 禁用AI模型

```
用户点击开关
    ↓
handleToggleModelStatus()
    ↓
POST /api/proxy/ai/models/:id/disable (前端)
    ↓
代理转发
    ↓
POST /api/ai/models/:id/disable (后端)
    ↓
disableAIModel()
    ↓
UPDATE ai_models SET isEnabled = false
    ↓
返回成功响应
    ↓
显示"模型已禁用"提示
    ↓
刷新模型列表
```

## 修改文件

- `src/app/api/proxy/ai/models/[id]/enable/route.ts` - 新增
- `src/app/api/proxy/ai/models/[id]/disable/route.ts` - 新增
- `server/routes/ai-module.api.js`
  - 第217-279行：添加 `enableAIModel` 和 `disableAIModel` 函数
  - 第1128-1129行：注册启用和禁用路由

## 常见问题排查

### 1. 错误：Unexpected token '<', "<!DOCTYPE "... is not valid JSON

**原因**：API请求返回了HTML（404页面），而不是JSON。

**解决**：
- 检查前端调用路径是否正确
- 检查代理路由是否存在
- 检查后端API是否正常工作

### 2. 错误：Body cannot be empty when content-type is set to 'application/json'

**原因**：设置了 `Content-Type: application/json`，但没有发送body。

**解决**：移除 `Content-Type` 头部。

### 3. 错误：Failed query: ETIMEDOUT

**原因**：数据库查询超时。

**解决**：
- 检查数据库连接是否正常
- 检查数据库是否响应
- 重试操作

## 后续优化建议

1. **添加请求重试机制**：当数据库查询超时时，自动重试
2. **添加加载状态**：在启用/禁用时显示加载动画
3. **添加批量操作**：支持批量启用/禁用多个模型
4. **添加权限控制**：限制只有管理员可以启用/禁用模型
5. **添加操作日志**：记录启用/禁用操作的详细日志

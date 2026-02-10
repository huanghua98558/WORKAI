/**
 * SSE 消息推送 API Route
 *
 * 代理前端 SSE 请求到后端 Fastify 服务
 * 使用流式响应 (Streaming Response) 实现 Server-Sent Events
 */

import { NextRequest } from 'next/server';

// 后端服务地址
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  // 获取查询参数
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');
  const robotId = searchParams.get('robotId');

  console.log('[SSE API] 收到 SSE 连接请求', { sessionId, robotId });

  // 构建后端 URL
  const backendUrl = new URL(`${BACKEND_URL}/api/sse/messages`);
  if (sessionId) backendUrl.searchParams.append('sessionId', sessionId);
  if (robotId) backendUrl.searchParams.append('robotId', robotId);

  try {
    // 创建后端 SSE 连接
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    if (!response.ok) {
      console.error('[SSE API] 后端 SSE 连接失败', {
        status: response.status,
        statusText: response.statusText
      });
      return new Response('SSE connection failed', { status: response.status });
    }

    // 创建流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      return new Response('No response body', { status: 500 });
    }

    // 创建可读流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log('[SSE API] SSE 连接已关闭');
              controller.close();
              break;
            }

            // 将数据块转发给客户端
            controller.enqueue(value);
          }
        } catch (error) {
          console.error('[SSE API] 流式传输错误:', error);
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },

      cancel() {
        console.log('[SSE API] 客户端取消连接');
        reader.releaseLock();
      }
    });

    // 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
    });

  } catch (error) {
    console.error('[SSE API] 创建 SSE 连接失败:', error);
    return new Response('Failed to connect to SSE server', { status: 500 });
  }
}

// OPTIONS 请求处理（CORS 预检）
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

import { NextRequest } from 'next/server';

/**
 * 消息实时流（SSE）- 代理到后端
 *
 * 此路由将前端的SSE请求代理到后端真实的SSE API
 * 后端使用PostgreSQL LISTEN/NOTIFY机制实现实时推送
 *
 * 参数：
 * - sessionId: 会话ID（可选，如果不提供则监听全局消息）
 * - robotId: 机器人ID（可选）
 *
 * 使用示例：
 * ```typescript
 * const eventSource = new EventSource('/api/messages/stream?sessionId=xxx');
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('收到消息:', data);
 * };
 * ```
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');
  const robotId = searchParams.get('robotId');

  // 构建后端URL
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
  const params = new URLSearchParams();
  if (sessionId) params.append('sessionId', sessionId);
  if (robotId) params.append('robotId', robotId);

  const url = `${backendUrl}/api/sse/messages?${params.toString()}`;

  try {
    // 代理到后端SSE API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    // 如果后端返回错误，直接返回错误响应
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, {
        status: response.status,
        statusText: response.statusText,
      });
    }

    // 创建转换流
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              break;
            }

            // 直接转发数据
            controller.enqueue(value);
          }
        } catch (error) {
          console.error('[SSE Proxy] 转发数据失败:', error);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('[SSE Proxy] 请求失败:', error);
    return new Response(
      JSON.stringify({
        type: 'error',
        message: 'SSE连接失败',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

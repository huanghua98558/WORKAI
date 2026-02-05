import { NextRequest } from 'next/server';

/**
 * 消息实时流（SSE）
 * 提供实时的消息推送
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');
  const robotId = searchParams.get('robotId');

  // 设置SSE响应头
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 发送连接成功消息
      const sendData = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      sendData({
        type: 'connected',
        message: 'Connected to message stream',
        timestamp: new Date().toISOString(),
      });

      // TODO: 实现真正的SSE推送
      // 这里需要使用WebSocket或Server-Sent Events
      // 可以使用Redis Pub/Sub或其他消息队列系统
      
      // 示例：模拟实时推送
      let counter = 0;
      const interval = setInterval(() => {
        counter++;
        sendData({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          counter,
        });

        // 10秒后关闭连接（仅用于测试）
        if (counter >= 10) {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      // 客户端断开连接时清理
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

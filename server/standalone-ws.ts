#!/usr/bin/env tsx
/**
 * WebSocket 独立服务器
 * 运行在独立端口，与 Next.js 服务并行
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), 'server/.env') });

import { initWebSocketServer, getWebSocketStatus, sendToRobot } from './websocket';

// WebSocket 服务器端口（默认 5001）
const WS_PORT = parseInt(process.env.WS_PORT || '5001');
const WS_PATH = process.env.WS_PATH || '/ws';

console.log('='.repeat(60));
console.log('🚀 WORKAI WebSocket 服务器');
console.log('='.repeat(60));
console.log(`端口: ${WS_PORT}`);
console.log(`路径: ${WS_PATH}`);
console.log(`CORS: *`);
console.log('='.repeat(60));

// 解析请求体
async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// 创建 HTTP 服务器
const httpServer = createServer(async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 健康检查端点
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'WORKAI WebSocket Server',
        ...getWebSocketStatus(),
      })
    );
    return;
  }

  // 状态端点
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getWebSocketStatus()));
    return;
  }

  // 发送消息端点
  if (req.url === '/send' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { robotId, roomName, content, type = 'SEND_MESSAGE' } = body;

      if (!robotId || !roomName || !content) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '缺少必要参数' }));
        return;
      }

      const sent = sendToRobot(robotId, 'execute_command', {
        type,
        data: {
          titleList: [roomName],
          receivedContent: content,
        },
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: sent,
          message: sent ? '消息已发送' : '机器人未连接',
          robotId,
        })
      );
      return;
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '服务器错误' }));
      return;
    }
  }

  // 默认响应
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WORKAI WebSocket Server is running. Connect via WebSocket.');
});

// 初始化 WebSocket 服务器
initWebSocketServer(httpServer, {
  path: WS_PATH,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
});

// 启动服务器
httpServer.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`\n✅ WebSocket 服务器已启动`);
  console.log(`📡 WebSocket URL: ws://localhost:${WS_PORT}${WS_PATH}`);
  console.log(`🏥 健康检查: http://localhost:${WS_PORT}/health`);
  console.log(`📊 状态查询: http://localhost:${WS_PORT}/status`);
  console.log('\n等待 worktool 连接...\n');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('\n🛑 收到 SIGTERM 信号，正在关闭...');
  httpServer.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 收到 SIGINT 信号，正在关闭...');
  httpServer.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

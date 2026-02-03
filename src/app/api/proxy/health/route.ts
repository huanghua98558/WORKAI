import { NextRequest, NextResponse } from 'next/server';
import http from 'http';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// 从 BACKEND_URL 解析主机和端口
let backendHost = 'localhost';
let backendPort = 5001;

try {
  const backendUrl = new URL(BACKEND_URL);
  backendHost = backendUrl.hostname;
  backendPort = parseInt(backendUrl.port || '5001', 10);
} catch (e) {
  console.warn('[API Proxy Health] Failed to parse BACKEND_URL, using defaults');
}

export async function GET(request: NextRequest) {
  console.log('[API Proxy Health] Request received');
  console.log('[API Proxy Health] Backend config:', {
    BACKEND_URL: BACKEND_URL,
    parsedHost: backendHost,
    parsedPort: backendPort,
    fullUrl: `${BACKEND_URL}/health`
  });

  try {
    const options = {
      hostname: backendHost,
      port: backendPort,
      path: '/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    console.log('[API Proxy Health] Creating HTTP request with options:', options);

    return new Promise<NextResponse>((resolve) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(
              NextResponse.json(jsonData, {
                status: res.statusCode,
              })
            );
          } catch (e) {
            resolve(
              NextResponse.json(
                { code: -1, message: '解析响应失败' },
                { status: res.statusCode || 500 }
              )
            );
          }
        });
      });

      req.on('error', (error) => {
        console.error('[API Proxy] Backend connection error:', {
          BACKEND_URL: BACKEND_URL,
          host: backendHost,
          port: backendPort,
          error: error.message,
          errorStack: error.stack
        });
        resolve(
          NextResponse.json(
            { 
              code: -1, 
              message: `无法连接到后端服务: ${error.message}`,
              debug: {
                backendUrl: BACKEND_URL,
                host: backendHost,
                port: backendPort,
                timestamp: new Date().toISOString()
              }
            },
            { status: 500 }
          )
        );
      });

      req.setTimeout(5000, () => {
        req.destroy();
        console.error('[API Proxy] Backend connection timeout');
        resolve(
          NextResponse.json(
            { code: -1, message: '后端服务连接超时' },
            { status: 504 }
          )
        );
      });

      req.end();
    });
  } catch (error: any) {
    console.error('[API Proxy] Unexpected error:', error);
    return NextResponse.json(
      { code: -1, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

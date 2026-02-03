import { NextRequest, NextResponse } from 'next/server';
import http from 'http';

const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '5001';

export async function GET(request: NextRequest) {
  try {
    const options = {
      hostname: BACKEND_HOST,
      port: parseInt(BACKEND_PORT, 10),
      path: '/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

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
          host: BACKEND_HOST,
          port: BACKEND_PORT,
          error: error.message
        });
        resolve(
          NextResponse.json(
            { code: -1, message: `无法连接到后端服务: ${error.message}` },
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

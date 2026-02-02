import { NextRequest, NextResponse } from 'next/server';
import http from 'http';

export async function GET(request: NextRequest) {
  try {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    return new Promise((resolve) => {
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
        resolve(
          NextResponse.json(
            { code: -1, message: error.message },
            { status: 500 }
          )
        );
      });

      req.end();
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: -1, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

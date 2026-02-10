import { NextRequest, NextResponse } from 'next/server';
import http from 'http';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

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

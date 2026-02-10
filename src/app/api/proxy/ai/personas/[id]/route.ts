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
  console.warn('[API Proxy AI Personas ID] Failed to parse BACKEND_URL, using defaults');
}

// PUT - 更新角色
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const options = {
      hostname: backendHost,
      port: backendPort,
      path: `/api/ai/personas/${id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
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
            console.error('[API Proxy AI Personas ID PUT] Parse error:', e);
            resolve(NextResponse.json({ error: 'Parse error' }, { status: 500 }));
          }
        });
      });

      req.on('error', (error) => {
        console.error('[API Proxy AI Personas ID PUT] Request error:', error);
        resolve(NextResponse.json({ error: error.message }, { status: 500 }));
      });

      req.write(JSON.stringify(body));
      req.end();
    });
  } catch (error: any) {
    console.error('[API Proxy AI Personas ID PUT] Server error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - 删除角色
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const options = {
      hostname: backendHost,
      port: backendPort,
      path: `/api/ai/personas/${id}`,
      method: 'DELETE',
      headers: {
        // DELETE请求不需要Content-Type，避免后端报错
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
            console.error('[API Proxy AI Personas ID DELETE] Parse error:', e);
            resolve(NextResponse.json({ error: 'Parse error' }, { status: 500 }));
          }
        });
      });

      req.on('error', (error) => {
        console.error('[API Proxy AI Personas ID DELETE] Request error:', error);
        resolve(NextResponse.json({ error: error.message }, { status: 500 }));
      });

      req.end();
    });
  } catch (error: any) {
    console.error('[API Proxy AI Personas ID DELETE] Server error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

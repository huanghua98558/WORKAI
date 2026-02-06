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
  console.warn('[API Proxy AI Logs] Failed to parse BACKEND_URL, using defaults');
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '50';
    const status = url.searchParams.get('status');
    const sessionId = url.searchParams.get('sessionId');

    const path = `/api/monitoring/ai-logs`;
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    if (status) queryParams.append('status', status);
    if (sessionId) queryParams.append('sessionId', sessionId);

    const options = {
      hostname: backendHost,
      port: backendPort,
      path: `${path}?${queryParams.toString()}`,
      method: 'GET',
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
            resolve(NextResponse.json({ error: 'Parse error' }, { status: 500 }));
          }
        });
      });

      req.on('error', (error) => {
        resolve(NextResponse.json({ error: error.message }, { status: 500 }));
      });

      req.end();
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

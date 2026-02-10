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
  console.warn('[API Proxy AI Templates] Failed to parse BACKEND_URL, using defaults');
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const options = {
      hostname: backendHost,
      port: backendPort,
      path: `/api/proxy/ai/templates${searchParams.toString() ? '?' + searchParams.toString() : ''}`,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const options = {
      hostname: backendHost,
      port: backendPort,
      path: '/api/proxy/ai/templates',
      method: 'POST',
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

      req.write(JSON.stringify(body));
      req.end();
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';
    
    const url = new URL(`${BACKEND_URL}/api/monitoring/ai-logs`);
    url.searchParams.append('limit', limit);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Monitoring AI logs proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to fetch monitoring AI logs' },
      { status: 500 }
    );
  }
}

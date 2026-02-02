import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET() {
  try {
    const url = new URL('/health', BACKEND_URL);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Health check proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Backend not available' },
      { status: 503 }
    );
  }
}

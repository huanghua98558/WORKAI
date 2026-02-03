import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ processingId: string }> }
) {
  try {
    const { processingId } = await params;
    
    const response = await fetch(`${BACKEND_URL}/api/monitoring/executions/${processingId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Monitoring execution detail proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to fetch execution detail' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// 构建带认证的请求头
function buildAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    headers['authorization'] = authHeader;
  }

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers['cookie'] = cookieHeader;
  }

  return headers;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const url = new URL(`/api/admin/robots/${id}`, BACKEND_URL);

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: buildAuthHeaders(request),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Update robot proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to update robot' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(`/api/admin/robots/${id}`, BACKEND_URL);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: buildAuthHeaders(request),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Delete robot proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to delete robot' },
      { status: 500 }
    );
  }
}

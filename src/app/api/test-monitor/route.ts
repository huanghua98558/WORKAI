import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    const response = await fetch(`${backendUrl}/api/admin/monitor/summary`);
    
    const text = await response.text();
    const data = JSON.parse(text);
    
    // 记录日志
    console.log('[Test API] Response status:', response.status);
    console.log('[Test API] Response text:', text);
    console.log('[Test API] Parsed data:', JSON.stringify(data, null, 2));
    
    return NextResponse.json({
      success: true,
      data: data,
      debug: {
        backendStatus: response.status,
        backendData: data,
        textLength: text.length,
        textPreview: text.substring(0, 200)
      }
    });
  } catch (error) {
    console.error('[Test API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

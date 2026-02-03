import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { robotId, operationType, groupName, newGroupName, selectList, removeList, groupAnnouncement, groupRemark, showMessageHistory, groupTemplate } = body;

    // 验证必要参数
    if (!robotId) {
      return NextResponse.json(
        { code: -1, message: '缺少必要参数：robotId' },
        { status: 400 }
      );
    }

    if (!groupName) {
      return NextResponse.json(
        { code: -1, message: '缺少必要参数：群名称' },
        { status: 400 }
      );
    }

    console.log('[group-operation proxy] 转发请求到后端:', {
      robotId,
      operationType,
      groupName,
      selectList: selectList?.length || 0,
      removeList: removeList?.length || 0
    });

    // 调用后端 API
    const url = new URL('/api/admin/debug/group-operation', BACKEND_URL);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId, operationType, groupName, newGroupName, selectList, removeList, groupAnnouncement, groupRemark, showMessageHistory, groupTemplate })
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Group operation proxy error:', error);
    return NextResponse.json(
      { code: -1, message: 'Failed to perform group operation' },
      { status: 500 }
    );
  }
}

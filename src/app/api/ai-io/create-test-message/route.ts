import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * POST - 创建测试消息（模拟实时消息推送）
 */
export async function POST(request: NextRequest) {
  try {
    const { count = 1 } = await request.json();

    // 生成指定数量的测试消息
    const messages = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const isUser = i % 2 === 0;
      const id = 'test_live_' + Date.now() + '_' + i;
      
      const message = {
        id: id,
        type: isUser ? 'user' : 'bot',
        sessionId: 'session_live_' + Date.now(),
        messageId: 'msg_live_' + Date.now() + '_' + i,
        userId: '实时用户' + (i + 1),
        groupId: '实时测试群',
        userName: '实时用户' + (i + 1),
        groupName: '实时测试群',
        robotId: 'test-robot-001',
        robotName: '测试机器人',
        content: isUser 
          ? `这是实时测试消息 #${i + 1}，验证逐条显示效果`
          : `您好！这是第 ${i + 1} 条AI回复，验证流式动画`,
        intent: 'chat',
        confidence: 90,
        timestamp: new Date(now.getTime() + i * 500).toISOString(),
        createdAt: new Date(now.getTime() + i * 500).toISOString(),
      };

      messages.push(message);
    }

    return NextResponse.json({
      success: true,
      data: messages,
      message: `已创建 ${count} 条实时测试消息`
    }, { status: 200 });
  } catch (error: any) {
    console.error('创建实时测试消息失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

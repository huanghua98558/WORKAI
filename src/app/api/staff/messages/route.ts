import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:9000';

/**
 * 记录工作人员消息（联动信息中心检测）
 * POST /api/staff/messages
 */
export async function POST(request: NextRequest) {
  try {
    const messageData = await request.json();

    // 记录工作人员消息
    const staffResponse = await fetch(`${BACKEND_URL}/api/staff/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    if (!staffResponse.ok) {
      return NextResponse.json(
        { error: '记录工作人员消息失败' },
        { status: staffResponse.status }
      );
    }

    const staffResult = await staffResponse.json();

    // 联动：自动创建信息检测记录
    if (messageData.content && messageData.messageId) {
      const detectionResponse = await fetch(`${BACKEND_URL}/api/info-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: messageData.messageId,
          sessionId: messageData.sessionId,
          content: messageData.content,
          isStaffMessage: true,
          staffUserId: messageData.staffUserId,
          riskLevel: analyzeRiskLevel(messageData.content),
          sentiment: analyzeSentiment(messageData.content),
          satisfactionLevel: analyzeSatisfaction(messageData.content),
          urgencyLevel: analyzeUrgency(messageData.content),
        }),
      });

      if (detectionResponse.ok) {
        const detectionResult = await detectionResponse.json();
        return NextResponse.json({
          ...staffResult,
          detectionResult,
          linked: true,
        });
      }
    }

    return NextResponse.json({
      ...staffResult,
      linked: false,
      reason: '信息检测联动失败'
    });

  } catch (error) {
    console.error('[API] 记录工作人员消息失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取工作人员消息列表
 * GET /api/staff/messages
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const staffUserId = searchParams.get('staffUserId');
    const limit = searchParams.get('limit') || '50';

    const params = new URLSearchParams();
    if (sessionId) params.append('sessionId', sessionId);
    if (staffUserId) params.append('staffUserId', staffUserId);
    params.append('limit', limit);

    const response = await fetch(`${BACKEND_URL}/api/staff/messages?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: '获取工作人员消息失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] 获取工作人员消息失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 辅助函数：分析风险等级
function analyzeRiskLevel(content: string): string {
  if (!content) return 'low';

  const riskKeywords = {
    critical: ['投诉', '威胁', '起诉', '举报', '曝光'],
    high: ['差评', '愤怒', '不满意', '要求退款', '赔偿'],
    medium: ['问题', '疑问', '咨询', '故障', '异常'],
    low: ['谢谢', '满意', '好的', '了解']
  };

  for (const keyword of riskKeywords.critical) {
    if (content.includes(keyword)) return 'critical';
  }

  for (const keyword of riskKeywords.high) {
    if (content.includes(keyword)) return 'high';
  }

  for (const keyword of riskKeywords.medium) {
    if (content.includes(keyword)) return 'medium';
  }

  return 'low';
}

// 辅助函数：分析情感倾向
function analyzeSentiment(content: string): string {
  if (!content) return 'neutral';

  const positiveKeywords = ['满意', '谢谢', '好的', '棒', '优秀', '专业', '帮助'];
  const negativeKeywords = ['不满', '差', '糟糕', '慢', '不行', '差评', '愤怒'];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const keyword of positiveKeywords) {
    if (content.includes(keyword)) positiveCount++;
  }

  for (const keyword of negativeKeywords) {
    if (content.includes(keyword)) negativeCount++;
  }

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

// 辅助函数：分析满意度
function analyzeSatisfaction(content: string): string {
  if (!content) return 'unknown';

  const satisfactionKeywords = {
    high: ['非常满意', '很满意', '满意', '优秀', '专业', '谢谢'],
    medium: ['还行', '可以', '接受', '了解'],
    low: ['不满意', '差评', '糟糕', '慢', '不行']
  };

  for (const keyword of satisfactionKeywords.high) {
    if (content.includes(keyword)) return 'high';
  }

  for (const keyword of satisfactionKeywords.medium) {
    if (content.includes(keyword)) return 'medium';
  }

  for (const keyword of satisfactionKeywords.low) {
    if (content.includes(keyword)) return 'low';
  }

  return 'unknown';
}

// 辅助函数：分析紧急程度
function analyzeUrgency(content: string): string {
  if (!content) return 'low';

  const urgencyKeywords = {
    critical: ['紧急', '马上', '立刻', '急', '急需'],
    high: ['尽快', '尽快处理', '麻烦', '急需'],
    medium: ['方便', '有空', '麻烦'],
    low: ['有空', '不急', '明天']
  };

  for (const keyword of urgencyKeywords.critical) {
    if (content.includes(keyword)) return 'critical';
  }

  for (const keyword of urgencyKeywords.high) {
    if (content.includes(keyword)) return 'high';
  }

  for (const keyword of urgencyKeywords.medium) {
    if (content.includes(keyword)) return 'medium';
  }

  return 'low';
}

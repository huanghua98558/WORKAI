import { NextRequest, NextResponse } from 'next/server';
import { messageService } from '@/lib/services/message-service';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

/**
 * 意图识别接口
 * POST /api/messages/[id]/intent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message ID is required',
        },
        { status: 400 }
      );
    }

    // 1. 获取消息
    const messageResult = await messageService.getMessageById(id);

    if (!messageResult.success || !messageResult.message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message not found',
        },
        { status: 404 }
      );
    }

    const message = messageResult.message;

    // 2. 构建Prompt
    const systemPrompt = `你是一个专业的客服意图识别专家。你的任务是识别用户消息的意图，并返回结构化的JSON结果。

可识别的意图类型：
1. refund - 退款请求：用户要求退款、退货、取消订单等
2. order_query - 订单查询：用户查询订单状态、物流信息、订单详情等
3. product_inquiry - 产品咨询：用户询问产品信息、价格、功能、规格等
4. technical_issue - 技术问题：用户遇到技术故障、系统错误、使用问题等
5. complaint - 投诉建议：用户表达不满、投诉、建议等
6. account_issue - 账户问题：用户询问账户登录、注册、密码、权限等
7. payment_issue - 支付问题：用户询问支付方式、支付失败、退款到账等
8. general_query - 一般咨询：用户的其他一般性问题
9. greeting - 问候：用户打招呼、感谢、道别等
10. other - 其他：无法明确分类的其他意图

请返回以下JSON格式：
{
  "intent": "意图ID",
  "intentName": "意图名称",
  "confidence": 置信度(0-1之间的小数),
  "entities": {
    "order_id": "订单号（如果有）",
    "product_id": "产品ID（如果有）",
    "category": "分类（如果有）"
  },
  "reasoning": "识别理由"
}`;

    // 3. 调用AI识别意图
    const config = new Config();
    const client = new LLMClient(config);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: message.content },
    ];

    const response = await client.invoke(messages, {
      temperature: 0.3, // 使用低温度以获得更确定的结果
    });

    // 4. 解析AI返回的JSON
    let intentData;
    try {
      intentData = JSON.parse(response.content);
    } catch (error) {
      // 如果解析失败，返回默认值
      intentData = {
        intent: 'other',
        intentName: '其他',
        confidence: 0.5,
        entities: {},
        reasoning: 'AI响应解析失败',
      };
    }

    // 5. 更新消息的意图字段
    await messageService.updateMessage(id, {
      intentRef: intentData.intent,
      intentConfidence: String(intentData.confidence),
    });

    // 6. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        messageId: id,
        intent: intentData.intent,
        intentName: intentData.intentName,
        confidence: intentData.confidence,
        entities: intentData.entities || {},
        reasoning: intentData.reasoning,
        model: 'doubao-seed-1-8-251228',
        recognizedAt: new Date().toISOString(),
      },
      message: '意图识别成功',
    });
  } catch (error) {
    console.error('Error in POST /api/messages/[id]/intent:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

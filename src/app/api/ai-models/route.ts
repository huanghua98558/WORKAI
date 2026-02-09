import { NextRequest, NextResponse } from 'next/server';
import { aiModels } from '@/database/schema';
import { getDb } from '@/database';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 可选：按类型过滤（intent_recognition, service_reply, general, etc.）
    const isEnabled = searchParams.get('enabled'); // 可选：是否只返回已启用的模型

    const db = await getDb();

    // 构建查询条件
    const conditions = [];

    if (isEnabled === 'true') {
      conditions.push(eq(aiModels.isEnabled, true));
    }

    if (type) {
      conditions.push(eq(aiModels.type, type));
    }

    // 查询模型
    let query = db
      .select({
        id: aiModels.id,
        name: aiModels.name,
        displayName: aiModels.displayName,
        providerId: aiModels.providerId,
        type: aiModels.type,
        capabilities: aiModels.capabilities,
        isEnabled: aiModels.isEnabled,
        createdAt: aiModels.createdAt,
        updatedAt: aiModels.updatedAt,
      })
      .from(aiModels);

    // 应用过滤条件
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const models = await query.orderBy(desc(aiModels.createdAt)).limit(100);

    return NextResponse.json({
      success: true,
      data: models,
      count: models.length,
    });
  } catch (error) {
    console.error('获取 AI 模型列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取 AI 模型列表失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 机器人 API Key 管理 API
 * 生成、重新生成、查看 API Key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { robots } from '@/storage/database/new-schemas/robots';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// API Key 前缀和长度
const API_KEY_PREFIX = 'rk_';
const API_KEY_LENGTH = 32;

/**
 * 生成 API Key
 */
function generateApiKey(): string {
  const buffer = crypto.randomBytes(API_KEY_LENGTH);
  const key = buffer.toString('base64url').slice(0, API_KEY_LENGTH);
  return `${API_KEY_PREFIX}${key}`;
}

/**
 * 哈希 API Key
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * GET - 获取机器人 API Key 状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const robot = await db
      .select({
        id: robots.id,
        robotId: robots.robotId,
        name: robots.name,
        apiKeyGeneratedAt: robots.apiKeyGeneratedAt,
        deviceBoundAt: robots.deviceBoundAt,
        lastWsConnectionAt: robots.lastWsConnectionAt,
        wsConnectionCount: robots.wsConnectionCount,
        hasApiKey: robots.apiKeyHash,
      })
      .from(robots)
      .where(eq(robots.id, id))
      .limit(1);

    if (!robot || robot.length === 0) {
      return NextResponse.json(
        { success: false, error: '机器人不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...robot[0],
        hasApiKey: !!robot[0].hasApiKey,
        apiKeyHash: undefined, // 不返回哈希值
      },
    });
  } catch (error) {
    console.error('[API] 获取 API Key 状态失败:', error);
    return NextResponse.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}

/**
 * POST - 生成或重新生成 API Key
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    // 检查机器人是否存在
    const existingRobot = await db
      .select({ id: robots.id, robotId: robots.robotId, name: robots.name })
      .from(robots)
      .where(eq(robots.id, id))
      .limit(1);

    if (!existingRobot || existingRobot.length === 0) {
      return NextResponse.json(
        { success: false, error: '机器人不存在' },
        { status: 404 }
      );
    }

    // 生成新的 API Key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const now = new Date();

    // 更新数据库
    await db
      .update(robots)
      .set({
        apiKeyHash,
        apiKeyGeneratedAt: now,
        updatedAt: now,
      })
      .where(eq(robots.id, id));

    console.log('[API] API Key 已生成', {
      robotId: existingRobot[0].robotId,
      robotName: existingRobot[0].name,
    });

    // 返回明文 API Key（这是唯一一次能看到明文的机会）
    return NextResponse.json({
      success: true,
      data: {
        apiKey,
        robotId: existingRobot[0].robotId,
        robotName: existingRobot[0].name,
        generatedAt: now.toISOString(),
        warning: '请妥善保管 API Key，系统不会再次显示明文 Key',
      },
    });
  } catch (error) {
    console.error('[API] 生成 API Key 失败:', error);
    return NextResponse.json(
      { success: false, error: '生成失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - 删除 API Key（使失效）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    // 更新数据库，清除 API Key
    await db
      .update(robots)
      .set({
        apiKeyHash: null,
        apiKeyGeneratedAt: null,
        deviceToken: null,
        deviceBoundAt: null,
        updatedAt: new Date(),
      })
      .where(eq(robots.id, id));

    return NextResponse.json({
      success: true,
      message: 'API Key 已失效',
    });
  } catch (error) {
    console.error('[API] 删除 API Key 失败:', error);
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}

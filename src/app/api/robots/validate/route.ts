/**
 * 机器人凭据验证 API
 * 供 WebSocket 服务器调用
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { robots } from '@/storage/database/new-schemas/robots';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * 哈希 API Key
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * POST - 验证机器人凭据
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { robotId, apiKey, deviceToken } = body;

    // 验证必填字段
    if (!robotId || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数',
          code: 'MISSING_PARAMS',
        },
        { status: 400 }
      );
    }

    // 验证 API Key 格式
    if (!apiKey.startsWith('rk_') || apiKey.length !== 35) {
      return NextResponse.json(
        {
          success: false,
          error: 'API Key 格式无效',
          code: 'INVALID_FORMAT',
        },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 查询机器人
    const robotResult = await db
      .select({
        id: robots.id,
        robotId: robots.robotId,
        name: robots.name,
        apiKeyHash: robots.apiKeyHash,
        deviceToken: robots.deviceToken,
        isActive: robots.isActive,
        isValid: robots.isValid,
        expiresAt: robots.expiresAt,
      })
      .from(robots)
      .where(eq(robots.robotId, robotId))
      .limit(1);

    if (!robotResult || robotResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '机器人不存在',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const robot = robotResult[0];

    // 检查是否激活
    if (!robot.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: '机器人已停用',
          code: 'INACTIVE',
        },
        { status: 403 }
      );
    }

    // 检查是否有效
    if (!robot.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: '机器人已失效',
          code: 'INVALID',
        },
        { status: 403 }
      );
    }

    // 检查是否过期
    if (robot.expiresAt && new Date() > robot.expiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: '机器人已过期',
          code: 'EXPIRED',
        },
        { status: 403 }
      );
    }

    // 验证 API Key
    const apiKeyHash = hashApiKey(apiKey);
    if (!robot.apiKeyHash || apiKeyHash !== robot.apiKeyHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'API Key 无效',
          code: 'INVALID_KEY',
        },
        { status: 401 }
      );
    }

    // 检查设备绑定
    if (robot.deviceToken && deviceToken !== robot.deviceToken) {
      return NextResponse.json(
        {
          success: false,
          error: '设备不匹配',
          code: 'DEVICE_MISMATCH',
        },
        { status: 403 }
      );
    }

    // 验证成功，更新最后连接时间
    await db
      .update(robots)
      .set({
        lastWsConnectionAt: new Date(),
        wsConnectionCount: (await db
          .select({ count: robots.wsConnectionCount })
          .from(robots)
          .where(eq(robots.id, robot.id))
          .limit(1))[0]?.count || 0 + 1,
      })
      .where(eq(robots.id, robot.id));

    return NextResponse.json({
      success: true,
      data: {
        id: robot.id,
        robotId: robot.robotId,
        name: robot.name,
        needsDeviceBinding: !robot.deviceToken,
      },
    });
  } catch (error) {
    console.error('[API] 验证机器人凭据失败:', error);
    return NextResponse.json(
      { success: false, error: '验证失败' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
const logger = require('../../../../server/services/system-logger.service');

/**
 * GET - 获取系统日志
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level');
    const module = searchParams.get('module');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const days = parseInt(searchParams.get('days') || '7');

    // 时间范围过滤
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - days);

    const logs = await logger.getDatabaseLogs({
      level,
      module,
      limit,
      offset,
      startTime: startTime.toISOString()
    });

    // 获取统计信息
    const stats = await logger.getStats(days);

    return NextResponse.json({
      success: true,
      data: logs,
      stats,
      pagination: {
        limit,
        offset,
        total: logs.length
      }
    });
  } catch (error: any) {
    console.error('获取系统日志失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * DELETE - 清理旧日志
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    const deletedCount = await logger.cleanup(days);

    return NextResponse.json({
      success: true,
      deletedCount
    });
  } catch (error: any) {
    console.error('清理日志失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

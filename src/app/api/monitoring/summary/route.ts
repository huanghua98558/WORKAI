/**
 * 监控接口 - 今日摘要
 * 路径: /api/monitoring/summary
 */

import { NextRequest, NextResponse } from 'next/server';
const monitor = require('../../../../../server/services/monitor.service');

export async function GET(request: NextRequest) {
  try {
    // 获取今日监控摘要
    const summary = await monitor.getTodaySummary();

    // 格式化响应数据
    const response = {
      code: 0,
      message: 'success',
      data: {
        // 日期
        date: summary.date,

        // 执行统计
        executions: {
          total: summary.system?.callback_received || 0,
          success: summary.system?.callback_processed || 0,
          error: summary.system?.callback_error || 0,
          processing: 0, // 当前处理中（需要从其他地方获取）
          successRate: summary.summary?.successRate || '0.00'
        },

        // AI统计
        ai: {
          total: summary.ai?.intentRecognition?.total || 0,
          success: summary.ai?.intentRecognition?.success || 0,
          error: summary.ai?.intentRecognition?.failure || 0,
          successRate: summary.ai?.intentRecognition?.successRate || '0.00'
        },

        // 会话统计
        sessions: {
          active: 0, // 需要从数据库获取
          total: 0   // 需要从数据库获取
        },

        // AI错误
        aiErrors: summary.system?.ai_errors || 0,

        // 总回调数
        totalCallbacks: summary.summary?.totalCallbacks || 0,

        // AI成功率
        aiSuccessRate: summary.summary?.aiSuccessRate || '0.00',

        // 详细系统指标
        systemMetrics: {
          callbackReceived: summary.system?.callback_received || 0,
          callbackProcessed: summary.system?.callback_processed || 0,
          callbackError: summary.system?.callback_error || 0,
          aiRequests: summary.system?.ai_requests || 0,
          aiErrors: summary.system?.ai_errors || 0
        },

        // 时间戳
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[监控摘要] 错误:', error);
    return NextResponse.json({
      code: -1,
      message: (error as Error).message || '获取监控摘要失败',
      data: null
    }, { status: 500 });
  }
}

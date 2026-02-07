import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/server/database/db';

// 模拟系统健康度数据
function generateSystemHealth() {
  return {
    overall: 85,
    components: {
      ai: 88,
      collaboration: 82,
      monitoring: 90,
      alerts: 78,
      database: 86,
      api: 84,
    },
    updatedAt: new Date().toISOString(),
  };
}

// 模拟性能指标和瓶颈
function generatePerformanceMetrics() {
  return {
    bottlenecks: [
      {
        module: 'API Response Time',
        issue: '高峰期响应时间超过 500ms',
        severity: 'medium' as const,
        impact: 15,
        recommendation: '考虑增加 API 服务器数量或优化数据库查询',
      },
      {
        module: 'Database Connection Pool',
        issue: '连接池使用率超过 80%',
        severity: 'warning' as const,
        impact: 10,
        recommendation: '增加数据库连接池大小或优化连接复用',
      },
    ],
    metrics: {
      avgResponseTime: 342,
      throughput: 1250,
      errorRate: 0.12,
      successRate: 99.88,
    },
    trends: {
      requests: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: 1000 + Math.floor(Math.random() * 500),
      })),
      responseTime: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: 300 + Math.floor(Math.random() * 100),
      })),
      errorRate: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: Math.random() * 0.5,
      })),
    },
  };
}

// 模拟告警统计
function generateAlertStats() {
  const levels = ['critical', 'warning', 'info'] as const;
  const messages = [
    'API 响应时间超过阈值',
    '数据库连接池使用率高',
    'AI 服务响应慢',
    '系统负载过高',
    '内存使用率过高',
    '磁盘空间不足',
  ];

  return {
    total: 23,
    critical: 3,
    warning: 12,
    info: 8,
    recent: Array.from({ length: 5 }, (_, i) => ({
      id: `alert-${i}`,
      level: levels[Math.floor(Math.random() * levels.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      time: new Date(Date.now() - i * 3600000).toISOString(),
      status: i % 3 === 0 ? 'acknowledged' : 'active',
    })),
  };
}

// 模拟 AI 模块统计
function generateAIStats() {
  return {
    totalRequests: 45678,
    successRate: 0.991,
    avgResponseTime: 1250,
    modelUsage: [
      { model: 'gpt-4', count: 23456 },
      { model: 'gpt-3.5-turbo', count: 18789 },
      { model: 'claude-3', count: 3433 },
    ],
  };
}

// 模拟协同分析统计
function generateCollaborationStats() {
  return {
    totalDecisions: 1567,
    aiReplyRate: 0.68,
    staffReplyRate: 0.82,
    collaborationRate: 0.75,
    avgStaffResponseTime: 45,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';

    // 模拟数据加载
    const systemHealth = generateSystemHealth();
    const performance = generatePerformanceMetrics();
    const alerts = generateAlertStats();
    const ai = generateAIStats();
    const collaboration = generateCollaborationStats();

    return NextResponse.json({
      success: true,
      data: {
        systemHealth,
        performance,
        alerts,
        ai,
        collaboration,
        timeRange,
      },
    });
  } catch (error) {
    console.error('Failed to fetch comprehensive analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch comprehensive analytics',
      },
      { status: 500 }
    );
  }
}

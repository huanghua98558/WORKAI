import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/server/database/db';

// 模拟限制配置数据（实际应从数据库读取）
const MOCK_LIMIT_CONFIGS = [
  {
    id: '1',
    name: 'API 调用速率限制',
    type: 'api_rate_limit' as const,
    description: '每分钟 API 调用次数限制',
    maxValue: 1000,
    currentValue: 750,
    unit: '次/分钟',
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: '并发会话限制',
    type: 'concurrent_sessions' as const,
    description: '同时活跃的会话数量限制',
    maxValue: 10000,
    currentValue: 7200,
    unit: '个',
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: '每日消息配额',
    type: 'daily_message_quota' as const,
    description: '每日发送消息总数限制',
    maxValue: 1000000,
    currentValue: 680000,
    unit: '条',
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'AI 请求限制',
    type: 'ai_requests_per_day' as const,
    description: '每日 AI 模型调用次数限制',
    maxValue: 50000,
    currentValue: 32000,
    unit: '次/天',
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: '存储配额',
    type: 'storage_quota' as const,
    description: '系统总存储空间限制',
    maxValue: 1000,
    currentValue: 850,
    unit: 'GB',
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    name: '数据库连接数',
    type: 'database_connections' as const,
    description: '数据库最大连接数限制',
    maxValue: 500,
    currentValue: 92,
    unit: '个',
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
];

// 计算统计数据
function calculateStats(configs: any[]) {
  const enabled = configs.filter(c => c.enabled);
  const critical = enabled.filter(c => (c.currentValue / c.maxValue) >= 0.9).length;
  const warning = enabled.filter(c => {
    const ratio = c.currentValue / c.maxValue;
    return ratio >= 0.75 && ratio < 0.9;
  }).length;
  const normal = enabled.length - critical - warning;

  const utilizations = enabled.map(c => (c.currentValue / c.maxValue) * 100);
  const avgUtilization = utilizations.length > 0
    ? utilizations.reduce((a, b) => a + b, 0) / utilizations.length
    : 0;
  const maxUtilization = utilizations.length > 0 ? Math.max(...utilizations) : 0;

  return {
    totalLimits: configs.length,
    enabledLimits: enabled.length,
    critical,
    warning,
    normal,
    avgUtilization,
    maxUtilization,
  };
}

// 生成预警信息
function generateAlerts(configs: any[]): any[] {
  const alerts: any[] = [];
  configs.forEach((config, index) => {
    const utilization = config.currentValue / config.maxValue;
    let severity: 'critical' | 'warning' | 'normal' = 'normal';
    let threshold = 0;

    if (utilization >= 0.9) {
      severity = 'critical';
      threshold = 90;
    } else if (utilization >= 0.75) {
      severity = 'warning';
      threshold = 75;
    }

    if (severity !== 'normal') {
      alerts.push({
        id: `alert-${index}`,
        limitId: config.id,
        limitName: config.name,
        severity,
        message: `${config.name} 使用率已达到 ${(utilization * 100).toFixed(1)}%，请注意检查并优化`,
        currentValue: config.currentValue,
        maxValue: config.maxValue,
        threshold,
        triggeredAt: new Date().toISOString(),
        acknowledged: false,
      });
    }
  });

  return alerts;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';

    // 模拟一些动态变化的数据
    const configs = MOCK_LIMIT_CONFIGS.map(config => ({
      ...config,
      currentValue: Math.min(
        config.maxValue,
        Math.max(
          0,
          config.currentValue + Math.floor(Math.random() * 100) - 50
        )
      ),
      updatedAt: new Date().toISOString(),
    }));

    const stats = calculateStats(configs);
    const alerts = generateAlerts(configs);

    return NextResponse.json({
      success: true,
      data: {
        configs,
        stats,
        alerts,
        timeRange,
      },
    });
  } catch (error) {
    console.error('Failed to fetch constraint analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch constraint analytics',
      },
      { status: 500 }
    );
  }
}

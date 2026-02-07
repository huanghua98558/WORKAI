'use client';

import { Card, CardContent } from '@/components/ui/card';

interface TrendChartProps {
  title: string;
  data: Array<{ time: string; value: number }>;
  unit?: string;
  color?: string;
  height?: number;
}

export function TrendChart({
  title,
  data,
  unit = '',
  color = '#3b82f6',
  height = 200,
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{title}</h4>
            {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          </div>
          <div style={{ height: `${height}px` }} className="relative">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              {/* 面积填充 */}
              <polygon
                points={areaPoints}
                fill={`${color}20`}
                stroke="none"
              />
              {/* 趋势线 */}
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* 数据点 */}
              {data.map((d, i) => {
                const x = (i / (data.length - 1)) * 100;
                const y = 100 - ((d.value - minValue) / range) * 100;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="1"
                    fill={color}
                  />
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{data[0]?.time}</span>
            <span>{data[data.length - 1]?.time}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MiniBarChartProps {
  title: string;
  data: Array<{ label: string; value: number }>;
  maxValue?: number;
  color?: string;
}

export function MiniBarChart({
  title,
  data,
  maxValue,
  color = '#3b82f6',
}: MiniBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  const max = maxValue || Math.max(...data.map(d => d.value));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">{title}</h4>
          <div className="space-y-2">
            {data.map((item, index) => {
              const percentage = (item.value / max) * 100;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

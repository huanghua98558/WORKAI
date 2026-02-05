/**
 * 风险处理节点组件
 * 在流程引擎中用于处理风险消息
 */

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Bell, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RiskHandlerNode({ data, selected }: NodeProps) {
  const [riskMode, setRiskMode] = useState(data.config?.riskMode || 'auto_notify');
  const [enableStaffDetection, setEnableStaffDetection] = useState(
    data.config?.enableStaffDetection ?? true
  );
  const [monitoringDuration, setMonitoringDuration] = useState(
    data.config?.monitoringDuration || 300
  );

  const handleConfigChange = (key: string, value: any) => {
    if (data.onConfigChange) {
      data.onConfigChange(key, value);
    }
  };

  return (
    <Card
      className={`min-w-[320px] border-2 transition-all ${
        selected ? 'border-red-500 shadow-lg' : 'border-red-200'
      }`}
    >
      {/* 节点头部 */}
      <div className="bg-red-500 text-white px-4 py-2 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-semibold">风险处理节点</span>
      </div>

      {/* 节点内容 */}
      <div className="p-4 space-y-4">
        {/* 风险模式选择 */}
        <div>
          <Label className="text-sm font-medium">处理模式</Label>
          <Select
            value={riskMode}
            onValueChange={(value) => {
              setRiskMode(value);
              handleConfigChange('riskMode', value);
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto_notify">
                <div className="flex flex-col">
                  <span className="font-medium">AI安抚 + 通知人工</span>
                  <span className="text-xs text-muted-foreground">
                    AI先处理，人工可选择介入
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="human">
                <div className="flex flex-col">
                  <span className="font-medium">人工接管</span>
                  <span className="text-xs text-muted-foreground">
                    立即转人工处理
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="auto">
                <div className="flex flex-col">
                  <span className="font-medium">仅AI处理</span>
                  <span className="text-xs text-muted-foreground">
                    AI自动处理，不通知人工
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="ignore">
                <div className="flex flex-col">
                  <span className="font-medium">忽略</span>
                  <span className="text-xs text-muted-foreground">
                    不处理风险消息
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 工作人员检测开关 */}
        {riskMode === 'auto_notify' && (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">工作人员检测</Label>
                <p className="text-xs text-muted-foreground">
                  自动检测工作人员是否已处理
                </p>
              </div>
              <Switch
                checked={enableStaffDetection}
                onCheckedChange={(checked) => {
                  setEnableStaffDetection(checked);
                  handleConfigChange('enableStaffDetection', checked);
                }}
              />
            </div>

            {/* 监听时长 */}
            {enableStaffDetection && (
              <div>
                <Label className="text-sm font-medium">监听时长（秒）</Label>
                <Input
                  type="number"
                  value={monitoringDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setMonitoringDuration(value);
                    handleConfigChange('monitoringDuration', value);
                  }}
                  className="mt-1"
                  min={60}
                  max={600}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  检测工作人员处理的时长，默认5分钟
                </p>
              </div>
            )}

            {/* 说明信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-blue-900 font-medium">工作流程</p>
                  <p className="text-xs text-blue-700 mt-1">
                    AI安抚用户 → 通知人工 → 监听群内消息 → 检测工作人员处理
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 状态标签 */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {riskMode === 'auto_notify' && '智能处理'}
            {riskMode === 'human' && '人工接管'}
            {riskMode === 'auto' && 'AI处理'}
            {riskMode === 'ignore' && '忽略'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            风险节点
          </Badge>
        </div>
      </div>

      {/* 连接点 */}
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </Card>
  );
}

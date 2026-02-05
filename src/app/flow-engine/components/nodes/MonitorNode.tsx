/**
 * 监控节点组件
 * 在流程引擎中用于实时监听群内消息
 */

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Eye, Clock, UserCheck, Smile, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MonitorNode({ data, selected }: NodeProps) {
  const [duration, setDuration] = useState(data.config?.duration || 300);
  const [detectStaff, setDetectStaff] = useState(data.config?.detectStaff ?? true);
  const [detectUserSatisfaction, setDetectUserSatisfaction] = useState(data.config?.detectUserSatisfaction ?? true);
  const [detectEscalation, setDetectEscalation] = useState(data.config?.detectEscalation ?? true);

  const handleConfigChange = (key: string, value: any) => {
    if (data.onConfigChange) {
      data.onConfigChange(key, value);
    }
  };

  return (
    <Card
      className={`min-w-[320px] border-2 transition-all ${
        selected ? 'border-cyan-500 shadow-lg' : 'border-cyan-200'
      }`}
    >
      {/* 节点头部 */}
      <div className="bg-cyan-500 text-white px-4 py-2 flex items-center gap-2">
        <Eye className="h-5 w-5" />
        <span className="font-semibold">监控节点</span>
      </div>

      {/* 节点内容 */}
      <div className="p-4 space-y-4">
        {/* 监听时长 */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            监听时长（秒）
          </Label>
          <Input
            type="number"
            value={duration}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setDuration(value);
              handleConfigChange('duration', value);
            }}
            className="mt-1"
            min={60}
            max={1800}
          />
          <p className="text-xs text-muted-foreground mt-1">
            监控群内消息的时长，最长30分钟
          </p>
        </div>

        {/* 检测项 */}
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">检测项</Label>

          {/* 工作人员检测 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-cyan-600" />
              <span className="text-sm">工作人员检测</span>
            </div>
            <Switch
              checked={detectStaff}
              onCheckedChange={(checked) => {
                setDetectStaff(checked);
                handleConfigChange('detectStaff', checked);
              }}
            />
          </div>

          {/* 用户满意度检测 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smile className="h-4 w-4 text-cyan-600" />
              <span className="text-sm">用户满意度检测</span>
            </div>
            <Switch
              checked={detectUserSatisfaction}
              onCheckedChange={(checked) => {
                setDetectUserSatisfaction(checked);
                handleConfigChange('detectUserSatisfaction', checked);
              }}
            />
          </div>

          {/* 升级信号检测 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-cyan-600" />
              <span className="text-sm">升级信号检测</span>
            </div>
            <Switch
              checked={detectEscalation}
              onCheckedChange={(checked) => {
                setDetectEscalation(checked);
                handleConfigChange('detectEscalation', checked);
              }}
            />
          </div>
        </div>

        {/* 检测逻辑说明 */}
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
          <p className="text-xs text-cyan-900 font-medium mb-2">检测逻辑</p>
          <ul className="text-xs text-cyan-700 space-y-1">
            <li>• 工作人员：检测其他人工是否已回复</li>
            <li>• 满意度：检测用户是否表示满意</li>
            <li>• 升级信号：检测是否需要升级处理</li>
          </ul>
        </div>

        {/* 状态标签 */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            异步监控
          </Badge>
          <Badge variant="outline" className="text-xs">
            {Math.floor(duration / 60)}分钟监听
          </Badge>
        </div>
      </div>

      {/* 连接点 */}
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </Card>
  );
}

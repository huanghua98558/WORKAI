'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import type { BusinessRole } from './robot-business-role-manager';

interface BusinessRoleFormProps {
  robots?: any[];
  initialData?: BusinessRole | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function BusinessRoleForm({ robots = [], initialData, onSave, onCancel }: BusinessRoleFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    aiBehavior: 'semi_auto' as 'full_auto' | 'semi_auto' | 'record_only',
    staffEnabled: true,
    staffTypeFilter: [] as string[],
    keywords: [] as string[],
    defaultTaskPriority: 'normal' as 'low' | 'normal' | 'high',
    enableTaskCreation: true, // 默认启用任务创建
    robotId: '',
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [loading, setLoading] = useState(false);

  // 调试日志：组件渲染时输出
  console.log('[BusinessRoleForm] 组件渲染:', {
    robotsCount: robots.length,
    initialData: initialData ? { name: initialData.name, robotId: initialData.robotId, robotRobotId: initialData.robotRobotId } : '无',
    currentRobotId: formData.robotId,
    robots: robots.map(r => ({ name: r.name, id: r.id })),
  });

  // 初始化表单数据（只在 initialData 变化时执行，不依赖 robots）
  useEffect(() => {
    console.log('[BusinessRoleForm] useEffect initialData 触发:', {
      initialData: initialData ? initialData.name : '无',
      robotsCount: robots.length,
    });

    if (initialData) {
      // 使用 robotId 或 robotRobotId 作为 robotId（兼容不同数据源）
      const rawRobotId = initialData.robotId || initialData.robotRobotId || '';
      const finalRobotId = String(rawRobotId); // 确保是字符串类型

      console.log('[BusinessRoleForm] 初始化编辑模式:', {
        rawRobotId,
        finalRobotId,
        robotsCount: robots.length,
        hasMatch: robots.some(r => String(r.id) === String(finalRobotId)),
      });

      setFormData({
        name: initialData.name,
        code: initialData.code,
        description: initialData.description || '',
        aiBehavior: initialData.aiBehavior,
        staffEnabled: initialData.staffEnabled,
        staffTypeFilter: initialData.staffTypeFilter || [],
        keywords: initialData.keywords || [],
        defaultTaskPriority: initialData.defaultTaskPriority || 'normal',
        enableTaskCreation: initialData.enableTaskCreation ?? true,
        robotId: finalRobotId,
      });
    } else {
      // 重置表单数据（新增模式）
      console.log('[BusinessRoleForm] 初始化新增模式');
      setFormData({
        name: '',
        code: '',
        description: '',
        aiBehavior: 'semi_auto',
        staffEnabled: true,
        staffTypeFilter: [],
        keywords: [],
        defaultTaskPriority: 'normal',
        enableTaskCreation: true,
        robotId: '',
      });
    }
  }, [initialData]); // 只依赖 initialData，不依赖 robots

  // 添加关键词
  const handleAddKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  // 移除关键词
  const handleRemoveKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter(k => k !== keyword),
    });
  };

  // 工作人员类型切换
  const handleStaffTypeToggle = (staffType: string) => {
    const newFilter = formData.staffTypeFilter.includes(staffType)
      ? formData.staffTypeFilter.filter(t => t !== staffType)
      : [...formData.staffTypeFilter, staffType];
    setFormData({ ...formData, staffTypeFilter: newFilter });
  };

      // 保存表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = '/api/robots/business-roles';
      const method = initialData ? 'PUT' : 'POST';
      const body = {
        ...formData,
        ...(initialData?.id && { id: initialData.id }),
        robotId: formData.robotId || null, // 空字符串转换为 null
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(initialData ? '业务角色更新成功' : '业务角色创建成功');
        onSave();
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存业务角色失败:', error);
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本信息 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">基本信息</h3>
        
        <div className="space-y-2">
          <Label htmlFor="name">业务角色名称 *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例如：社群运营"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">业务角色编码 *</Label>
          <Select
            value={formData.code}
            onValueChange={(value) => setFormData({ ...formData, code: value })}
            disabled={!!initialData} // 编辑时不允许修改编码
          >
            <SelectTrigger>
              <SelectValue placeholder="选择业务角色编码" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="community_ops">community_ops - 社群运营</SelectItem>
              <SelectItem value="conversion_staff">conversion_staff - 转化客服</SelectItem>
              <SelectItem value="after_sales">after_sales - 售后客服</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">描述</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="描述该业务角色的职责和特点"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="robot">绑定机器人（可选）</Label>
          <Select
            value={String(formData.robotId || 'none')}
            onValueChange={(value) => {
              console.log('[BusinessRoleForm] 选择机器人:', value);
              setFormData({ ...formData, robotId: value === 'none' ? '' : String(value) });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择要绑定的机器人" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">不绑定（通用角色）</SelectItem>
              {robots.map((robot) => {
                const robotId = String(robot.id);
                const isSelected = robotId === String(formData.robotId);
                console.log(`[BusinessRoleForm] 渲染机器人选项: ${robot.name}, id=${robotId}, isSelected=${isSelected}`);
                return (
                  <SelectItem key={robotId} value={robotId}>
                    {robot.name || robot.nickname || '未命名机器人'} ({robotId.slice(0, 8)}...)
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {formData.robotId && (
            <p className="text-xs text-muted-foreground">
              当前已选择：{robots.find(r => String(r.id) === String(formData.robotId))?.name || '未找到匹配的机器人'}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            绑定后，该业务角色将仅用于指定的机器人。不绑定则所有机器人都可使用。
          </p>
        </div>
      </div>

      {/* 行为规则 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">行为规则</h3>

        <div className="space-y-2">
          <Label htmlFor="aiBehavior">AI 行为模式 *</Label>
          <Select
            value={formData.aiBehavior}
            onValueChange={(value: any) => setFormData({ ...formData, aiBehavior: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_auto">
                <div>
                  <div className="font-medium">全自动</div>
                  <div className="text-xs text-muted-foreground">AI 总是回复，完全禁止人工介入</div>
                </div>
              </SelectItem>
              <SelectItem value="semi_auto">
                <div>
                  <div className="font-medium">半自动</div>
                  <div className="text-xs text-muted-foreground">用户消息 AI 回复，工作人员消息不回复</div>
                </div>
              </SelectItem>
              <SelectItem value="record_only">
                <div>
                  <div className="font-medium">仅记录</div>
                  <div className="text-xs text-muted-foreground">AI 不回复，只记录消息</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>识别工作人员</Label>
            <p className="text-xs text-muted-foreground">
              是否识别工作人员并记录其消息
            </p>
          </div>
          <Switch
            checked={formData.staffEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, staffEnabled: checked })}
          />
        </div>

        {formData.staffEnabled && (
          <div className="space-y-2">
            <Label>工作人员类型过滤</Label>
            <p className="text-xs text-muted-foreground">
              只识别以下类型的工作人员（未选择则识别所有）
            </p>
            <div className="flex flex-wrap gap-3">
              {['community_ops', 'after_sales', 'conversion_staff'].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={formData.staffTypeFilter.includes(type)}
                    onCheckedChange={() => handleStaffTypeToggle(type)}
                  />
                  <Label htmlFor={type} className="cursor-pointer">
                    {type === 'community_ops' && '社群运维'}
                    {type === 'after_sales' && '售后人员'}
                    {type === 'conversion_staff' && '转化客服'}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 关键词配置 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">关键词配置</h3>

        <div className="space-y-2">
          <Label>触发关键词</Label>
          <p className="text-xs text-muted-foreground">
            消息中包含这些关键词时触发特定行为（如创建售后任务）
          </p>
          <div className="flex gap-2">
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
              placeholder="输入关键词后按回车添加"
            />
            <Button type="button" onClick={handleAddKeyword} variant="outline">
              添加
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {formData.keywords.map((keyword) => (
              <div
                key={keyword}
                className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(keyword)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 任务配置 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">任务配置</h3>

        <div className="flex items-center justify-between">
          <div>
            <Label>启用任务创建</Label>
            <p className="text-xs text-muted-foreground">
              当工作人员 @用户 + 包含关键词时自动创建售后任务，用于配合人工处理
            </p>
          </div>
          <Switch
            checked={formData.enableTaskCreation}
            onCheckedChange={(checked) => setFormData({ ...formData, enableTaskCreation: checked })}
          />
        </div>

        {formData.enableTaskCreation && (
          <div className="space-y-2">
            <Label htmlFor="priority">默认任务优先级</Label>
            <Select
              value={formData.defaultTaskPriority}
              onValueChange={(value: any) => setFormData({ ...formData, defaultTaskPriority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">低优先级</SelectItem>
                <SelectItem value="normal">普通优先级</SelectItem>
                <SelectItem value="high">高优先级</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : initialData ? '更新' : '创建'}
        </Button>
      </div>
    </form>
  );
}

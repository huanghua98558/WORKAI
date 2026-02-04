'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Play, Pause, AlertTriangle } from 'lucide-react';

interface AlertRule {
  id: string;
  ruleName: string;
  description?: string;
  intentType: string;
  alertLevel: 'info' | 'warning' | 'critical';
  threshold: number;
  cooldownPeriod: number;
  isEnabled: boolean;
  messageTemplate: string;
  createdAt: string;
  updatedAt: string;
}

export default function AlertRulesPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 表单状态
  const [formData, setFormData] = useState({
    ruleName: '',
    description: '',
    intentType: 'spam',
    alertLevel: 'warning' as 'info' | 'warning' | 'critical',
    threshold: 5,
    cooldownPeriod: 300,
    messageTemplate: '',
    isEnabled: true
  });

  // 监控类型选项
  const intentTypes = [
    { value: 'spam', label: '垃圾信息', icon: '🔒' },
    { value: 'risk', label: '风险内容', icon: '⚠️' },
    { value: 'admin', label: '管理指令', icon: '🔧' },
    { value: 'keyword', label: '关键词', icon: '🔑' }
  ];

  // 加载规则列表
  const loadRules = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/alerts/rules');
      const data = await response.json();
      if (data.success) {
        setRules(data.data || []);
      }
    } catch (error) {
      console.error('加载规则失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  // 打开新建对话框
  const handleCreate = () => {
    setEditingRule(null);
    setFormData({
      ruleName: '',
      description: '',
      intentType: 'spam',
      alertLevel: 'warning',
      threshold: 5,
      cooldownPeriod: 300,
      messageTemplate: '',
      isEnabled: true
    });
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setFormData({
      ruleName: rule.ruleName,
      description: rule.description || '',
      intentType: rule.intentType,
      alertLevel: rule.alertLevel,
      threshold: rule.threshold,
      cooldownPeriod: rule.cooldownPeriod,
      messageTemplate: rule.messageTemplate,
      isEnabled: rule.isEnabled
    });
    setIsDialogOpen(true);
  };

  // 删除规则
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个规则吗？')) return;

    try {
      const response = await fetch(`http://localhost:5001/api/alerts/rules/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadRules();
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 切换规则启用状态
  const handleToggleEnable = async (rule: AlertRule) => {
    try {
      const response = await fetch(`http://localhost:5001/api/alerts/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, isEnabled: !rule.isEnabled })
      });

      if (response.ok) {
        loadRules();
      }
    } catch (error) {
      console.error('切换失败:', error);
      alert('操作失败');
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.ruleName || !formData.intentType) {
      alert('请填写必填字段');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsDialogOpen(false);
        loadRules();
      } else {
        const error = await response.json();
        alert(error.message || '操作失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      alert('操作失败');
    }
  };

  // 获取告警级别样式
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-white">Warning</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">告警规则管理</h1>
          <p className="text-gray-600">配置监控规则和告警阈值</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          创建规则
        </Button>
      </div>

      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">暂无规则</p>
              <p className="text-sm text-gray-400">点击上方按钮创建第一个告警规则</p>
            </CardContent>
          </Card>
        ) : (
          rules.map(rule => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {rule.ruleName}
                      {getLevelBadge(rule.alertLevel)}
                      {rule.isEnabled ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">已启用</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600">已停用</Badge>
                      )}
                    </CardTitle>
                    {rule.description && (
                      <CardDescription className="mt-1">{rule.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleEnable(rule)}
                    >
                      {rule.isEnabled ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(rule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">监控类型</div>
                    <div className="font-medium">
                      {intentTypes.find(t => t.value === rule.intentType)?.label || rule.intentType}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">阈值</div>
                    <div className="font-medium">{rule.threshold}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">冷却时间</div>
                    <div className="font-medium">{rule.cooldownPeriod} 秒</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">消息模板</div>
                    <div className="font-medium text-sm truncate">
                      {rule.messageTemplate || '使用默认模板'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-4">
                  创建于 {new Date(rule.createdAt).toLocaleString('zh-CN')}
                  {rule.updatedAt !== rule.createdAt && (
                    <> · 更新于 {new Date(rule.updatedAt).toLocaleString('zh-CN')}</>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 编辑/新建对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? '编辑规则' : '创建规则'}</DialogTitle>
            <DialogDescription>
              {editingRule ? '修改告警规则配置' : '创建新的告警规则'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 规则名称 */}
            <div>
              <Label htmlFor="ruleName">规则名称 *</Label>
              <Input
                id="ruleName"
                value={formData.ruleName}
                onChange={e => setFormData({ ...formData, ruleName: e.target.value })}
                placeholder="例如：垃圾信息告警"
              />
            </div>

            {/* 规则描述 */}
            <div>
              <Label htmlFor="description">规则描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="描述这个规则的作用"
                rows={2}
              />
            </div>

            {/* 监控类型 */}
            <div>
              <Label htmlFor="intentType">监控类型 *</Label>
              <Select
                value={formData.intentType}
                onValueChange={value => setFormData({ ...formData, intentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 告警级别 */}
            <div>
              <Label htmlFor="alertLevel">告警级别</Label>
              <Select
                value={formData.alertLevel}
                onValueChange={(value: any) => setFormData({ ...formData, alertLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info - 信息</SelectItem>
                  <SelectItem value="warning">Warning - 警告</SelectItem>
                  <SelectItem value="critical">Critical - 紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 阈值 */}
            <div>
              <Label htmlFor="threshold">阈值 *</Label>
              <Input
                id="threshold"
                type="number"
                value={formData.threshold}
                onChange={e => setFormData({ ...formData, threshold: parseInt(e.target.value) || 0 })}
                placeholder="触发告警的阈值"
              />
            </div>

            {/* 冷却时间 */}
            <div>
              <Label htmlFor="cooldownPeriod">冷却时间（秒）</Label>
              <Input
                id="cooldownPeriod"
                type="number"
                value={formData.cooldownPeriod}
                onChange={e => setFormData({ ...formData, cooldownPeriod: parseInt(e.target.value) || 0 })}
                placeholder="去重冷却时间"
              />
            </div>

            {/* 消息模板 */}
            <div>
              <Label htmlFor="messageTemplate">消息模板</Label>
              <Textarea
                id="messageTemplate"
                value={formData.messageTemplate}
                onChange={e => setFormData({ ...formData, messageTemplate: e.target.value })}
                placeholder="例如：检测到 {intentType}，次数：{count}"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                可用变量：{`{intentType}`, `{count}`, `{threshold}`, `{message}`}
              </p>
            </div>

            {/* 启用状态 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">启用规则</div>
                <div className="text-sm text-gray-500">是否立即生效</div>
              </div>
              <Switch
                checked={formData.isEnabled}
                onCheckedChange={checked => setFormData({ ...formData, isEnabled: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingRule ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

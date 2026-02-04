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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, Play, Pause, AlertTriangle, Settings, RefreshCw, Bell } from 'lucide-react';
import { NotificationSettingsDialog } from './NotificationSettingsDialog';

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
  keywords?: string; // 新增：关键词字段
  createdAt: string;
  updatedAt: string;
}

interface AlertRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AlertRulesDialog({ open, onOpenChange }: AlertRulesDialogProps) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [selectedRuleForNotification, setSelectedRuleForNotification] = useState<AlertRule | null>(null);
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
    keywords: '', // 新增：关键词字段
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
    setIsLoading(true);
    try {
      const response = await fetch('/api/alerts/rules', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRules(data.data || []);
        }
      } else {
        console.warn('获取规则列表失败，状态码:', response.status);
        setRules([]);
      }
    } catch (error) {
      console.warn('加载规则失败:', error);
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadRules();
    }
  }, [open]);

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
      keywords: '',
      isEnabled: true
    });
    setIsFormDialogOpen(true);
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
      keywords: rule.keywords || '',
      isEnabled: rule.isEnabled
    });
    setIsFormDialogOpen(true);
  };

  // 删除规则
  const handleDelete = async (ruleId: string) => {
    if (!confirm('确定要删除这条告警规则吗？')) return;

    try {
      const response = await fetch(`/api/alerts/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadRules();
      }
    } catch (error) {
      console.error('删除规则失败:', error);
    }
  };

  // 打开通知设置对话框
  const handleNotificationSettings = (rule: AlertRule) => {
    setSelectedRuleForNotification(rule);
    setIsNotificationDialogOpen(true);
  };

  // 切换规则启用状态
  const handleToggle = async (rule: AlertRule) => {
    try {
      const response = await fetch(`/api/alerts/rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...rule,
          isEnabled: !rule.isEnabled
        })
      });

      if (response.ok) {
        loadRules();
      }
    } catch (error) {
      console.error('更新规则失败:', error);
    }
  };

  // 保存规则（新建或更新）
  const handleSave = async () => {
    try {
      const url = editingRule
        ? `/api/alerts/rules/${editingRule.id}`
        : '/api/alerts/rules';

      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsFormDialogOpen(false);
        loadRules();
      }
    } catch (error) {
      console.error('保存规则失败:', error);
    }
  };

  // 获取告警级别显示
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">紧急</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-white">警告</Badge>;
      case 'info':
        return <Badge variant="secondary">信息</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  // 获取监控类型显示
  const getIntentTypeDisplay = (type: string) => {
    const found = intentTypes.find(t => t.value === type);
    return found ? `${found.icon} ${found.label}` : type;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              告警规则设置
            </DialogTitle>
            <DialogDescription>
              配置系统的告警触发条件和通知方式
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-4 border-b">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{rules.length} 条规则</Badge>
              {rules.filter(r => r.isEnabled).length > 0 && (
                <Badge className="bg-green-500">{rules.filter(r => r.isEnabled).length} 已启用</Badge>
              )}
            </div>
            <Button size="sm" onClick={loadRules} disabled={isLoading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  加载中...
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无告警规则</p>
                  <p className="text-sm mt-2">点击"新建规则"开始配置</p>
                </div>
              ) : (
                rules.map((rule) => (
                  <Card key={rule.id} className={!rule.isEnabled ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-base">{rule.ruleName}</CardTitle>
                            {getLevelBadge(rule.alertLevel)}
                            {!rule.isEnabled && <Badge variant="outline">已禁用</Badge>}
                          </div>
                          {rule.description && (
                            <CardDescription className="text-xs">
                              {rule.description}
                            </CardDescription>
                          )}
                        </div>
                        <Switch
                          checked={rule.isEnabled}
                          onCheckedChange={() => handleToggle(rule)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">监控类型:</span>
                          <span className="font-medium">{getIntentTypeDisplay(rule.intentType)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">触发阈值:</span>
                          <span className="font-medium">{rule.threshold} 次</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">冷却时间:</span>
                          <span className="font-medium">{rule.cooldownPeriod} 秒</span>
                        </div>
                        {rule.messageTemplate && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-muted-foreground text-xs mb-1">消息模板:</p>
                            <p className="text-xs">{rule.messageTemplate}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(rule)}>
                          <Edit className="h-4 w-4 mr-1" />
                          编辑
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleNotificationSettings(rule)}>
                          <Bell className="h-4 w-4 mr-1" />
                          通知设置
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(rule.id)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              新建规则
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 表单对话框 */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? '编辑告警规则' : '新建告警规则'}</DialogTitle>
            <DialogDescription>
              配置告警规则的触发条件和通知内容
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ruleName">规则名称 *</Label>
              <Input
                id="ruleName"
                value={formData.ruleName}
                onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
                placeholder="例如：垃圾信息告警"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="描述这个规则的作用"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="intentType">监控类型 *</Label>
                <Select
                  value={formData.intentType}
                  onValueChange={(value) => setFormData({ ...formData, intentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {intentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alertLevel">告警级别 *</Label>
                <Select
                  value={formData.alertLevel}
                  onValueChange={(value: 'info' | 'warning' | 'critical') => setFormData({ ...formData, alertLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">信息</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                    <SelectItem value="critical">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="threshold">触发阈值 *</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) })}
                  min={1}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cooldownPeriod">冷却时间（秒） *</Label>
                <Input
                  id="cooldownPeriod"
                  type="number"
                  value={formData.cooldownPeriod}
                  onChange={(e) => setFormData({ ...formData, cooldownPeriod: parseInt(e.target.value) })}
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="messageTemplate">消息模板</Label>
              <Textarea
                id="messageTemplate"
                value={formData.messageTemplate}
                onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
                placeholder="告警消息内容，可以使用 {count}、{type} 等变量"
                rows={3}
              />
            </div>

            {formData.intentType === 'keyword' && (
              <div className="space-y-2">
                <Label htmlFor="keywords">关键词 * <span className="text-xs text-gray-500">(多个关键词用逗号分隔)</span></Label>
                <Textarea
                  id="keywords"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="输入需要监控的关键词，如：订单,支付,退款"
                  rows={2}
                />
                <p className="text-xs text-gray-500">
                  💡 提示：当消息中包含这些关键词时，将触发告警。多个关键词请用逗号（中英文）分隔。
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="isEnabled"
                checked={formData.isEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
              />
              <Label htmlFor="isEnabled">启用此规则</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingRule ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 通知设置对话框 */}
      {selectedRuleForNotification && (
        <NotificationSettingsDialog
          open={isNotificationDialogOpen}
          onOpenChange={(open) => {
            setIsNotificationDialogOpen(open);
            if (!open) {
              setSelectedRuleForNotification(null);
            }
          }}
          alertRuleId={selectedRuleForNotification.id}
          alertRuleName={selectedRuleForNotification.ruleName}
        />
      )}
    </>
  );
}

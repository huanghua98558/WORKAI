'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Bot } from 'lucide-react';

interface Robot {
  id: string;
  name: string;
  description: string;
}

interface AlertRecipient {
  id: string;
  userId: string;
  recipientName: string;
  robotIds: string[];
  levelFilters: {
    critical: boolean;
    warning: boolean;
    info: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AlertRecipientsPage() {
  const [recipients, setRecipients] = useState<AlertRecipient[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<AlertRecipient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 表单状态
  const [formData, setFormData] = useState({
    userId: '',
    recipientName: '',
    robotIds: [] as string[],
    levelFilters: {
      critical: true,
      warning: true,
      info: false
    }
  });

  // 加载接收者列表
  const loadRecipients = async () => {
    try {
      const response = await fetch('/api/alerts/recipients');
      const data = await response.json();
      if (data.success) {
        setRecipients(data.data || []);
      }
    } catch (error) {
      console.error('加载接收者失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载机器人列表
  const loadRobots = async () => {
    try {
      const response = await fetch('/api/robots');
      const data = await response.json();
      if (data.success) {
        setRobots(data.data || []);
      }
    } catch (error) {
      console.error('加载机器人列表失败:', error);
    }
  };

  useEffect(() => {
    loadRecipients();
    loadRobots();
  }, []);

  // 打开新建对话框
  const handleCreate = () => {
    setEditingRecipient(null);
    setFormData({
      userId: '',
      recipientName: '',
      robotIds: [],
      levelFilters: { critical: true, warning: true, info: false }
    });
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (recipient: AlertRecipient) => {
    setEditingRecipient(recipient);
    setFormData({
      userId: recipient.userId,
      recipientName: recipient.recipientName,
      robotIds: recipient.robotIds,
      levelFilters: { ...recipient.levelFilters }
    });
    setIsDialogOpen(true);
  };

  // 删除接收者
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个接收者吗？')) return;

    try {
      const response = await fetch(`/api/alerts/recipients/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadRecipients();
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const url = editingRecipient
        ? `/api/alerts/recipients/${editingRecipient.id}`
        : '/api/alerts/recipients';

      const response = await fetch(url, {
        method: editingRecipient ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsDialogOpen(false);
        loadRecipients();
      } else {
        const error = await response.json();
        alert(error.message || '操作失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      alert('操作失败');
    }
  };

  // 切换机器人选择
  const toggleRobot = (robotId: string) => {
    setFormData(prev => ({
      ...prev,
      robotIds: prev.robotIds.includes(robotId)
        ? prev.robotIds.filter(id => id !== robotId)
        : [...prev.robotIds, robotId]
    }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">告警接收者管理</h1>
          <p className="text-gray-600">管理接收告警通知的用户和机器人</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          添加接收者
        </Button>
      </div>

      <div className="grid gap-4">
        {recipients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">暂无接收者</p>
              <p className="text-sm text-gray-400">点击上方按钮添加第一个接收者</p>
            </CardContent>
          </Card>
        ) : (
          recipients.map(recipient => (
            <Card key={recipient.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {recipient.recipientName}
                      {!recipient.isActive && (
                        <Badge variant="secondary">已停用</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>用户 ID: {recipient.userId}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(recipient)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(recipient.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 机器人列表 */}
                  <div>
                    <div className="text-sm font-medium mb-2">关联机器人</div>
                    <div className="flex flex-wrap gap-2">
                      {recipient.robotIds.length === 0 ? (
                        <span className="text-sm text-gray-500">未关联机器人</span>
                      ) : (
                        recipient.robotIds.map(robotId => {
                          const robot = robots.find(r => r.id === robotId);
                          return robot ? (
                            <Badge key={robotId} variant="outline">
                              <Bot className="h-3 w-3 mr-1" />
                              {robot.name}
                            </Badge>
                          ) : (
                            <Badge key={robotId} variant="outline">
                              {robotId}
                            </Badge>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* 告警级别过滤 */}
                  <div>
                    <div className="text-sm font-medium mb-2">告警级别过滤</div>
                    <div className="flex gap-2">
                      {recipient.levelFilters.critical && (
                        <Badge variant="destructive">Critical</Badge>
                      )}
                      {recipient.levelFilters.warning && (
                        <Badge className="bg-yellow-500 text-white">Warning</Badge>
                      )}
                      {recipient.levelFilters.info && (
                        <Badge variant="secondary">Info</Badge>
                      )}
                      {!recipient.levelFilters.critical && !recipient.levelFilters.warning && !recipient.levelFilters.info && (
                        <span className="text-sm text-gray-500">未启用任何级别</span>
                      )}
                    </div>
                  </div>

                  {/* 时间信息 */}
                  <div className="text-xs text-gray-500">
                    创建于 {new Date(recipient.createdAt).toLocaleString('zh-CN')}
                    {recipient.updatedAt !== recipient.createdAt && (
                      <> · 更新于 {new Date(recipient.updatedAt).toLocaleString('zh-CN')}</>
                    )}
                  </div>
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
            <DialogTitle>{editingRecipient ? '编辑接收者' : '添加接收者'}</DialogTitle>
            <DialogDescription>
              {editingRecipient ? '修改接收者配置' : '创建新的告警接收者'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 用户 ID */}
            <div>
              <Label htmlFor="userId">用户 ID *</Label>
              <Input
                id="userId"
                value={formData.userId}
                onChange={e => setFormData({ ...formData, userId: e.target.value })}
                placeholder="输入用户 ID"
              />
            </div>

            {/* 接收者名称 */}
            <div>
              <Label htmlFor="recipientName">接收者名称 *</Label>
              <Input
                id="recipientName"
                value={formData.recipientName}
                onChange={e => setFormData({ ...formData, recipientName: e.target.value })}
                placeholder="例如：运维团队、DBA"
              />
            </div>

            {/* 关联机器人 */}
            <div>
              <Label>关联机器人</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {robots.length === 0 ? (
                  <p className="text-sm text-gray-500">暂无机器人</p>
                ) : (
                  robots.map(robot => (
                    <div key={robot.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        <span className="text-sm">{robot.name}</span>
                      </div>
                      <Switch
                        checked={formData.robotIds.includes(robot.id)}
                        onCheckedChange={() => toggleRobot(robot.id)}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 告警级别过滤 */}
            <div>
              <Label>告警级别过滤</Label>
              <div className="mt-2 space-y-2">
                {['critical', 'warning', 'info'].map(level => (
                  <div key={level} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{level}</span>
                    <Switch
                      checked={formData.levelFilters[level as keyof typeof formData.levelFilters]}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          levelFilters: {
                            ...formData.levelFilters,
                            [level]: checked
                          }
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingRecipient ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

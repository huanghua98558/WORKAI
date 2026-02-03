'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Database, 
  Search, 
  Plus, 
  Edit2, 
  X, 
  RefreshCw,
  FileText,
  BookOpen
} from 'lucide-react';

import ReportsPanel from '@/components/reports-panel';
import DocumentUpload from '@/components/document-upload';

interface QA {
  id: string;
  keyword: string;
  reply: string;
  receiverType: string;
  priority: number;
  isExactMatch: boolean;
  relatedKeywords?: string;
  groupName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  content?: string;
}

export default function KnowledgeBasePage() {
  const [qaList, setQaList] = useState<QA[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingQA, setEditingQA] = useState<QA | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newQA, setNewQA] = useState({
    keyword: '',
    reply: '',
    receiverType: 'all',
    priority: 5,
    isExactMatch: false,
    relatedKeywords: '',
    groupName: '',
    isActive: true
  });

  const loadQAList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/qa');
      if (res.ok) {
        const data = await res.json();
        setQaList(data.data || []);
      }
    } catch (error) {
      console.error('加载 QA 列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const res = await fetch('/api/admin/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('加载文档列表失败:', error);
    }
  };

  const handleAddQA = async () => {
    if (!newQA.keyword || !newQA.reply) {
      alert('❌ 请填写关键词和回复内容');
      return;
    }

    try {
      const res = await fetch('/api/admin/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQA)
      });
      if (res.ok) {
        alert('✅ QA 问答添加成功');
        setShowAddModal(false);
        setNewQA({
          keyword: '',
          reply: '',
          receiverType: 'all',
          priority: 5,
          isExactMatch: false,
          relatedKeywords: '',
          groupName: '',
          isActive: true
        });
        loadQAList();
      } else {
        alert('❌ 添加失败');
      }
    } catch (error) {
      alert('❌ 添加失败');
    }
  };

  const handleUpdateQA = async () => {
    if (!editingQA) return;
    try {
      const res = await fetch(`/api/admin/qa/${editingQA.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingQA)
      });
      if (res.ok) {
        alert('✅ QA 问答更新成功');
        setEditingQA(null);
        loadQAList();
      } else {
        alert('❌ 更新失败');
      }
    } catch (error) {
      alert('❌ 更新失败');
    }
  };

  const handleDeleteQA = async (id: string) => {
    if (!confirm('确定要删除这条 QA 问答吗？')) return;
    try {
      const res = await fetch(`/api/admin/qa/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('✅ QA 问答删除成功');
        loadQAList();
      } else {
        alert('❌ 删除失败');
      }
    } catch (error) {
      alert('❌ 删除失败');
    }
  };

  useEffect(() => {
    loadQAList();
    loadDocuments();
  }, []);

  const filteredQAList = qaList.filter(qa => 
    qa.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
    qa.reply.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-blue-500" />
          知识库管理
        </h1>
        <p className="text-muted-foreground mt-2">
          管理问答库、文档和报告
        </p>
      </div>

      <Tabs defaultValue="qa" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="qa" className="gap-2">
            <Database className="h-4 w-4" />
            问答库
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            文档库
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            报告中心
          </TabsTrigger>
        </TabsList>

        {/* 问答库 Tab */}
        <TabsContent value="qa" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">QA 问答库</h2>
              <p className="text-muted-foreground text-sm">
                管理系统问答知识库，支持精确匹配和模糊匹配
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              添加问答
            </Button>
          </div>

          {/* 搜索框 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Search className="h-4 w-4 mt-3 text-muted-foreground" />
                <Input
                  placeholder="搜索关键词或回复内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* QA 列表 */}
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : filteredQAList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无 QA 问答
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredQAList.map((qa) => (
                    <div key={qa.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={qa.isExactMatch ? 'default' : 'secondary'}>
                              {qa.isExactMatch ? '精确匹配' : '模糊匹配'}
                            </Badge>
                            <Badge variant="outline">
                              优先级: {qa.priority}
                            </Badge>
                            {qa.groupName && (
                              <Badge variant="outline">
                                群: {qa.groupName}
                              </Badge>
                            )}
                            <Badge variant={qa.isActive ? 'default' : 'secondary'}>
                              {qa.isActive ? '启用' : '禁用'}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">关键词:</span>
                            <span className="font-medium ml-2">{qa.keyword}</span>
                          </div>
                          {qa.relatedKeywords && (
                            <div>
                              <span className="text-sm text-muted-foreground">关联关键词:</span>
                              <span className="ml-2">{qa.relatedKeywords}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-sm text-muted-foreground">回复:</span>
                            <p className="mt-1">{qa.reply}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingQA(qa)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQA(qa.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 文档库 Tab */}
        <TabsContent value="documents">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold">文档库</h2>
              <p className="text-muted-foreground text-sm">
                上传文档用于 AI 训练和知识库查询
              </p>
            </div>
            <Button onClick={loadDocuments} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
          </div>
          <DocumentUpload onDocumentsChange={setDocuments} />
        </TabsContent>

        {/* 报告中心 Tab */}
        <TabsContent value="reports">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold">报告中心</h2>
              <p className="text-muted-foreground text-sm">
                查看日终报告和导出数据
              </p>
            </div>
          </div>
          <ReportsPanel />
        </TabsContent>
      </Tabs>

      {/* 添加 QA 模态框 */}
      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>添加 QA 问答</DialogTitle>
              <DialogDescription>
                添加新的问答到知识库
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>关键词 *</Label>
                <Input
                  value={newQA.keyword}
                  onChange={(e) => setNewQA({ ...newQA, keyword: e.target.value })}
                  placeholder="输入关键词"
                />
              </div>
              <div>
                <Label>回复 *</Label>
                <Textarea
                  value={newQA.reply}
                  onChange={(e) => setNewQA({ ...newQA, reply: e.target.value })}
                  placeholder="输入回复内容"
                  rows={4}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>接收者类型</Label>
                  <Select 
                    value={newQA.receiverType} 
                    onValueChange={(value) => setNewQA({ ...newQA, receiverType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="person">个人</SelectItem>
                      <SelectItem value="group">群组</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>优先级 (1-10)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newQA.priority}
                    onChange={(e) => setNewQA({ ...newQA, priority: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>关联关键词 (可选，用逗号分隔)</Label>
                <Input
                  value={newQA.relatedKeywords}
                  onChange={(e) => setNewQA({ ...newQA, relatedKeywords: e.target.value })}
                  placeholder="输入关联关键词"
                />
              </div>
              <div>
                <Label>群名称 (可选)</Label>
                <Input
                  value={newQA.groupName}
                  onChange={(e) => setNewQA({ ...newQA, groupName: e.target.value })}
                  placeholder="输入群名称"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isExact"
                  checked={newQA.isExactMatch}
                  onChange={(e) => setNewQA({ ...newQA, isExactMatch: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isExact">精确匹配</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newQA.isActive}
                  onChange={(e) => setNewQA({ ...newQA, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive">启用</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button onClick={handleAddQA}>
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 编辑 QA 模态框 */}
      {editingQA && (
        <Dialog open={!!editingQA} onOpenChange={() => setEditingQA(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑 QA 问答</DialogTitle>
              <DialogDescription>
                编辑问答内容
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>关键词 *</Label>
                <Input
                  value={editingQA.keyword}
                  onChange={(e) => setEditingQA({ ...editingQA, keyword: e.target.value })}
                  placeholder="输入关键词"
                />
              </div>
              <div>
                <Label>回复 *</Label>
                <Textarea
                  value={editingQA.reply}
                  onChange={(e) => setEditingQA({ ...editingQA, reply: e.target.value })}
                  placeholder="输入回复内容"
                  rows={4}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>接收者类型</Label>
                  <Select 
                    value={editingQA.receiverType} 
                    onValueChange={(value) => setEditingQA({ ...editingQA, receiverType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="person">个人</SelectItem>
                      <SelectItem value="group">群组</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>优先级 (1-10)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={editingQA.priority}
                    onChange={(e) => setEditingQA({ ...editingQA, priority: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>关联关键词 (可选，用逗号分隔)</Label>
                <Input
                  value={editingQA.relatedKeywords || ''}
                  onChange={(e) => setEditingQA({ ...editingQA, relatedKeywords: e.target.value })}
                  placeholder="输入关联关键词"
                />
              </div>
              <div>
                <Label>群名称 (可选)</Label>
                <Input
                  value={editingQA.groupName || ''}
                  onChange={(e) => setEditingQA({ ...editingQA, groupName: e.target.value })}
                  placeholder="输入群名称"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isExactEdit"
                  checked={editingQA.isExactMatch}
                  onChange={(e) => setEditingQA({ ...editingQA, isExactMatch: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isExactEdit">精确匹配</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  checked={editingQA.isActive}
                  onChange={(e) => setEditingQA({ ...editingQA, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActiveEdit">启用</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingQA(null)}>
                取消
              </Button>
              <Button onClick={handleUpdateQA}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

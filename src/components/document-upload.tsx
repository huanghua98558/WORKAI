'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Check, 
  X,
  File,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Document {
  id: string;
  name: string;
  title?: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  content?: string;
  category?: string;
}

interface DocumentUploadProps {
  className?: string;
  onDocumentsChange?: (documents: Document[]) => void;
}

export default function DocumentUpload({ className, onDocumentsChange }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newDocument, setNewDocument] = useState({
    title: '',
    content: '',
    category: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await fetch('/api/admin/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('文件上传失败');
      }

      const data = await res.json();
      const newDocs = data.data || [];

      setDocuments(prev => [...prev, ...newDocs]);
      if (onDocumentsChange) {
        onDocumentsChange([...documents, ...newDocs]);
      }

      alert(`✅ 成功上传 ${newDocs.length} 个文件`);
    } catch (error: any) {
      setUploadError(error.message || '上传失败');
      alert('❌ 上传失败: ' + (error.message || '未知错误'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTextUpload = async () => {
    if (!newDocument.title || !newDocument.content) {
      alert('❌ 请填写标题和内容');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await fetch('/api/admin/documents/upload-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocument),
      });

      if (!res.ok) {
        throw new Error('文本上传失败');
      }

      const data = await res.json();
      const newDoc = data.data;

      setDocuments(prev => [...prev, newDoc]);
      if (onDocumentsChange) {
        onDocumentsChange([...documents, newDoc]);
      }

      alert('✅ 文档添加成功');
      setNewDocument({ title: '', content: '', category: '' });
    } catch (error: any) {
      setUploadError(error.message || '上传失败');
      alert('❌ 添加失败: ' + (error.message || '未知错误'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('确定要删除这个文档吗？')) return;

    try {
      const res = await fetch(`/api/admin/documents/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('删除失败');
      }

      setDocuments(prev => prev.filter(doc => doc.id !== id));
      if (onDocumentsChange) {
        onDocumentsChange(documents.filter(doc => doc.id !== id));
      }

      alert('✅ 文档删除成功');
    } catch (error: any) {
      alert('❌ 删除失败: ' + (error.message || '未知错误'));
    }
  };

  const downloadTemplate = () => {
    const template = `文档上传模板
================

标题: 请填写文档标题
内容: 请填写文档内容
分类: （可选）文档分类

说明：
1. 每个文档包含标题、内容和可选的分类
2. 标题和内容为必填项
3. 支持多种格式：TXT、PDF、Word、Markdown
4. 文档上传后可用于 AI 训练和知识库查询
`;
    const blob = new Blob([template], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '文档上传模板.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          文档库
        </CardTitle>
        <CardDescription>
          上传文档用于 AI 训练和知识库查询
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 上传方式选择 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 文件上传 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">文件上传</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                支持格式：TXT、PDF、Word、Markdown
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                最大文件大小：10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.pdf,.doc,.docx,.md"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isUploading ? '上传中...' : '选择文件'}
                </Button>
              </label>
            </div>
          </div>

          {/* 文本上传 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">文本上传</Label>
            <div className="space-y-2">
              <Input
                placeholder="文档标题"
                value={newDocument.title}
                onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                disabled={isUploading}
              />
              <Input
                placeholder="文档分类（可选）"
                value={newDocument.category}
                onChange={(e) => setNewDocument({ ...newDocument, category: e.target.value })}
                disabled={isUploading}
              />
              <Textarea
                placeholder="文档内容..."
                value={newDocument.content}
                onChange={(e) => setNewDocument({ ...newDocument, content: e.target.value })}
                disabled={isUploading}
                rows={4}
              />
              <Button
                onClick={handleTextUpload}
                disabled={isUploading || !newDocument.title || !newDocument.content}
                className="w-full"
              >
                {isUploading ? '添加中...' : '添加文档'}
              </Button>
            </div>
          </div>
        </div>

        {/* 模板下载 */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <File className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm flex-1">需要上传模板？</span>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            下载模板
          </Button>
        </div>

        {/* 错误提示 */}
        {uploadError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{uploadError}</span>
          </div>
        )}

        {/* 文档列表 */}
        {documents.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-medium">已上传文档 ({documents.length})</Label>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name || doc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(doc.size || doc.content?.length || 0)}
                        </span>
                        {doc.category && (
                          <Badge variant="outline" className="text-xs">
                            {doc.category}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {documents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无文档</p>
            <p className="text-sm">上传文档或直接添加文本内容</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

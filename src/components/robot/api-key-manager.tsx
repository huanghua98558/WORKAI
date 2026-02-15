'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Key,
  Copy,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ApiKeyManagerProps {
  robotId: string;
  robotName: string;
  onApiKeyGenerated?: (apiKey: string) => void;
}

interface ApiKeyStatus {
  hasApiKey: boolean;
  apiKeyGeneratedAt?: string;
  deviceBoundAt?: string;
  lastWsConnectionAt?: string;
  wsConnectionCount?: number;
}

/**
 * API Key 管理组件
 */
export default function ApiKeyManager({
  robotId,
  robotName,
  onApiKeyGenerated,
}: ApiKeyManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 获取 API Key 状态
  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/admin/robots/${robotId}/api-key`);
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('获取 API Key 状态失败:', error);
    }
  };

  // 生成 API Key
  const generateKey = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/robots/${robotId}/api-key`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setApiKey(data.data.apiKey);
        setShowKey(true);
        fetchStatus();
        onApiKeyGenerated?.(data.data.apiKey);
      } else {
        alert('生成失败: ' + data.error);
      }
    } catch (error) {
      console.error('生成 API Key 失败:', error);
      alert('生成失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除 API Key
  const deleteKey = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/robots/${robotId}/api-key`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setApiKey(null);
        setStatus(null);
        setConfirmDelete(false);
        fetchStatus();
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (error) {
      console.error('删除 API Key 失败:', error);
      alert('删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 复制 API Key
  const copyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 格式化时间
  const formatTime = (time?: string) => {
    if (!time) return '无';
    return new Date(time).toLocaleString('zh-CN');
  };

  // 打开对话框时获取状态
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchStatus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Key className="h-4 w-4 mr-2" />
          API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key 管理
          </DialogTitle>
          <DialogDescription>
            为机器人 <strong>{robotName}</strong> 管理 WebSocket 连接凭据
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 状态显示 */}
          {status && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span>
                  状态:{' '}
                  {status.hasApiKey ? (
                    <Badge variant="default" className="ml-1">
                      已配置
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-1">
                      未配置
                    </Badge>
                  )}
                </span>
              </div>
              {status.apiKeyGeneratedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>生成时间: {formatTime(status.apiKeyGeneratedAt)}</span>
                </div>
              )}
              {status.wsConnectionCount !== undefined && (
                <div className="flex items-center gap-2 col-span-2">
                  <span>连接次数: {status.wsConnectionCount}</span>
                  {status.lastWsConnectionAt && (
                    <span className="text-muted-foreground">
                      (最后: {formatTime(status.lastWsConnectionAt)})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* API Key 显示 */}
          {apiKey && (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle>API Key 已生成</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={copyKey}>
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ 请立即复制并妥善保管，此 Key 不会再次显示！
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 使用说明 */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
            <p className="font-medium">使用方法：</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>点击"生成 API Key"按钮</li>
              <li>复制并保存生成的 API Key</li>
              <li>
                在 worktool 连接时发送:
                <code className="bg-muted px-1 rounded ml-1">
                  {`{ "robotId": "...", "apiKey": "rk_..." }`}
                </code>
              </li>
            </ol>
          </div>

          {/* 删除确认 */}
          {confirmDelete && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>确认删除</AlertTitle>
              <AlertDescription>
                删除后，使用旧 API Key 的设备将无法连接。确定要删除吗？
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {status?.hasApiKey && !confirmDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </Button>
          )}
          {confirmDelete && (
            <>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={deleteKey} disabled={loading}>
                确认删除
              </Button>
            </>
          )}
          {!confirmDelete && (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                关闭
              </Button>
              <Button onClick={generateKey} disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                {status?.hasApiKey ? '重新生成' : '生成 API Key'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

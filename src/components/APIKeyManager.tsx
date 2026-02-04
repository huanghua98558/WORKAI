/**
 * API Key配置管理组件
 * 用于管理AI提供商的API Key配置
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Plus, Save, Eye, EyeOff, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Provider {
  id: string;
  name: string;
  displayName: string;
  apiKey: string | null;
  apiEndpoint: string | null;
  isEnabled: boolean;
  rateLimit: number;
}

export default function APIKeyManager() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/proxy/ai/providers');
      const data = await response.json();

      if (data.success) {
        setProviders(data.data);
      } else {
        toast.error('加载提供商失败');
      }
    } catch (error) {
      toast.error('加载提供商失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async () => {
    if (!selectedProvider) return;

    try {
      const response = await fetch(`/api/ai/providers/${selectedProvider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: selectedProvider.apiKey,
          apiEndpoint: selectedProvider.apiEndpoint
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('API Key保存成功');
        setShowDialog(false);
        setSelectedProvider(null);
        loadProviders();
      } else {
        toast.error(data.error || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const handleTestKey = async (providerId: string) => {
    setTesting(providerId);
    try {
      const response = await fetch(`/api/ai/providers/${providerId}/test`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('API Key测试成功');
      } else {
        toast.error(data.error || '测试失败');
      }
    } catch (error) {
      toast.error('测试失败');
    } finally {
      setTesting(null);
    }
  };

  const toggleShowKey = (providerId: string) => {
    setShowKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const maskApiKey = (key: string) => {
    if (!key) return '未配置';
    if (key.length <= 8) return '****';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Key className="h-6 w-6 text-primary" />
            API Key 管理
          </h2>
          <p className="text-muted-foreground mt-2">
            配置AI提供商的API Key以启用真实AI功能
          </p>
        </div>
        <Button onClick={loadProviders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </div>

      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          配置API Key后，AI功能将使用真实的模型调用。未配置时将使用模拟结果。
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>提供商列表</CardTitle>
          <CardDescription>
            管理所有AI提供商的API Key和配置
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">加载中...</div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{provider.displayName}</h3>
                        <Badge variant={provider.isEnabled ? 'default' : 'secondary'}>
                          {provider.isEnabled ? '启用' : '禁用'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {provider.name} - 速率限制: {provider.rateLimit}次/分钟
                      </p>
                      <p className="text-sm text-muted-foreground">
                        API Key: {showKeys[provider.id] ? provider.apiKey || '未配置' : maskApiKey(provider.apiKey || '')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleShowKey(provider.id)}
                    >
                      {showKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestKey(provider.id)}
                      disabled={testing === provider.id}
                    >
                      {testing === provider.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        '测试'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProvider(provider);
                        setShowDialog(true);
                      }}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      配置
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              配置 {selectedProvider?.displayName} API Key
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={selectedProvider?.apiKey || ''}
                onChange={(e) => setSelectedProvider({
                  ...selectedProvider!,
                  apiKey: e.target.value
                })}
                placeholder="输入API Key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                您的API Key将被加密存储，请妥善保管
              </p>
            </div>
            <div>
              <Label htmlFor="api-endpoint">API端点（可选）</Label>
              <Input
                id="api-endpoint"
                value={selectedProvider?.apiEndpoint || ''}
                onChange={(e) => setSelectedProvider({
                  ...selectedProvider!,
                  apiEndpoint: e.target.value
                })}
                placeholder="自定义API端点"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveKey}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

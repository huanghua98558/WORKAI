'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface AuditData {
  success: boolean;
  data?: {
    shopScreenshotPath?: string;
    shopScreenshotUrl?: string;
    shopAccessible?: boolean;
    shopStatusCode?: number;
    assistantScreenshotPath?: string;
    assistantScreenshotUrl?: string;
    assistantAccessible?: boolean;
    assistantStatusCode?: number;
    message?: string;
  };
  error?: string;
}

export default function VideoChannelAuditPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  const [loading, setLoading] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [audited, setAudited] = useState(false);

  // 执行人工审核
  const handleAudit = async () => {
    if (!userId) {
      toast.error('缺少用户ID');
      return;
    }

    setAuditing(true);
    try {
      const response = await fetch('/api/video-channel/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      const result: AuditData = await response.json();

      if (result.success && result.data) {
        setAuditData(result);
        setAudited(true);
        toast.success('审核完成');
      } else {
        toast.error('审核失败: ' + result.error);
      }
    } catch (error: any) {
      console.error('执行审核失败:', error);
      toast.error('审核失败: ' + error.message);
    } finally {
      setAuditing(false);
    }
  };

  // 保存审核结果
  const handleSave = async (result: 'compliant' | 'non_compliant' | 'needs_review') => {
    if (!userId) {
      toast.error('缺少用户ID');
      return;
    }

    try {
      const response = await fetch('/api/video-channel/audit/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          cookieId: auditData?.data?.shopScreenshotPath?.split('/').pop() || '',
          auditResult: result,
          auditNotes,
          auditedBy: 'admin'
        })
      });

      const saveResult = await response.json();

      if (saveResult.success) {
        toast.success('审核结果保存成功');
      } else {
        toast.error('保存失败: ' + saveResult.error);
      }
    } catch (error: any) {
      console.error('保存审核结果失败:', error);
      toast.error('保存失败: ' + error.message);
    }
  };

  // 如果URL中有userId，自动执行审核
  useEffect(() => {
    if (userId && !audited && !auditing) {
      handleAudit();
    }
  }, [userId]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">人工审核</h2>
          <p className="text-muted-foreground mt-2">
            审核视频号页面截图，检查是否符合规定
          </p>
        </div>
        {!audited && userId && (
          <Button onClick={handleAudit} disabled={auditing}>
            {auditing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            开始审核
          </Button>
        )}
      </div>

      {!userId ? (
        <Alert>
          <AlertDescription>
            请先从Cookie管理页面选择用户进行审核
          </AlertDescription>
        </Alert>
      ) : !audited ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">正在加载审核数据...</p>
            </div>
          </CardContent>
        </Card>
      ) : auditData?.data ? (
        <div className="space-y-6">
          {/* 权限检测结果 */}
          <Card>
            <CardHeader>
              <CardTitle>权限检测结果</CardTitle>
              <CardDescription>{auditData.data.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Badge className={auditData.data.shopAccessible ? 'bg-green-500' : 'bg-red-500'}>
                    {auditData.data.shopAccessible ? '可访问' : '不可访问'}
                  </Badge>
                  <span className="text-sm">视频号小店</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={auditData.data.assistantAccessible ? 'bg-green-500' : 'bg-red-500'}>
                    {auditData.data.assistantAccessible ? '可访问' : '不可访问'}
                  </Badge>
                  <span className="text-sm">视频号助手</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 截图展示 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 小店截图 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  视频号小店
                </CardTitle>
                <CardDescription>
                  HTTP状态码: {auditData.data.shopStatusCode}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditData.data.shopScreenshotUrl ? (
                  <img
                    src={auditData.data.shopScreenshotUrl}
                    alt="视频号小店截图"
                    className="w-full rounded-lg border"
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无截图
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 助手截图 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  视频号助手
                </CardTitle>
                <CardDescription>
                  HTTP状态码: {auditData.data.assistantStatusCode}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditData.data.assistantScreenshotUrl ? (
                  <img
                    src={auditData.data.assistantScreenshotUrl}
                    alt="视频号助手截图"
                    className="w-full rounded-lg border"
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无截图
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 审核结果 */}
          <Card>
            <CardHeader>
              <CardTitle>审核结果</CardTitle>
              <CardDescription>请根据截图审核视频号是否符合规定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="audit-notes">审核备注</Label>
                <Textarea
                  id="audit-notes"
                  placeholder="请输入审核备注..."
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave('compliant')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  合规
                </Button>
                <Button
                  onClick={() => handleSave('non_compliant')}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  不合规
                </Button>
                <Button
                  onClick={() => handleSave('needs_review')}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  需要复核
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

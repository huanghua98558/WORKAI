'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  MessageSquare,
  Terminal,
  QrCode,
  Power,
  PowerOff
} from 'lucide-react';

interface CallbackHistoryItem {
  id: number;
  robotId: string;
  type: string;
  messageId: string;
  errorCode: number;
  errorMsg: string;
  responseTime: number;
  extraData: Record<string, any> | null;
  createdAt: string;
}

interface CallbackHistoryData {
  list: CallbackHistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface CallbackHistoryPanelProps {
  robotId: string;
}

export function CallbackHistoryPanel({ robotId }: CallbackHistoryPanelProps) {
  const [history, setHistory] = useState<CallbackHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (typeFilter) {
        params.append('type', typeFilter);
      }

      if (startTime) {
        params.append('startTime', startTime);
      }

      if (endTime) {
        params.append('endTime', endTime);
      }

      const response = await fetch(`/api/admin/robots/${robotId}/callback-history?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取回调历史失败');
      }

      const data = await response.json();
      if (data.code !== 0) {
        throw new Error(data.message || '获取回调历史失败');
      }

      setHistory(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      console.error('获取回调历史失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [robotId, page, pageSize, typeFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchHistory();
  };

  const handleReset = () => {
    setTypeFilter('');
    setStartTime('');
    setEndTime('');
    setPage(1);
  };

  const getTypeIcon = (type: string) => {
    const iconMap = {
      '0': QrCode,      // 群二维码
      '1': Terminal,    // 指令结果
      '5': Power,       // 上线
      '6': PowerOff,    // 下线
      '11': MessageSquare // 消息
    };
    return iconMap[type as keyof typeof iconMap] || Clock;
  };

  const getTypeName = (type: string) => {
    const nameMap = {
      '0': '群二维码回调',
      '1': '指令结果回调',
      '5': '上线回调',
      '6': '下线回调',
      '11': '消息回调'
    };
    return nameMap[type as keyof typeof nameMap] || `类型${type}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>回调历史</CardTitle>
            <CardDescription>查看所有 WorkTool 回调记录</CardDescription>
          </div>
          <Button onClick={fetchHistory} variant="outline" size="icon">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4" variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 筛选器 */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>回调类型</Label>
            <Select value={typeFilter || 'all'} onValueChange={(value) => setTypeFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="11">消息回调</SelectItem>
                <SelectItem value="0">群二维码回调</SelectItem>
                <SelectItem value="1">指令结果回调</SelectItem>
                <SelectItem value="5">上线回调</SelectItem>
                <SelectItem value="6">下线回调</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>开始时间</Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <Label>结束时间</Label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={handleSearch} className="flex-1">
              搜索
            </Button>
            <Button onClick={handleReset} variant="outline">
              重置
            </Button>
          </div>
        </div>

        {/* 列表 */}
        {loading && !history ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : history && history.list.length > 0 ? (
          <>
            <div className="space-y-3">
              {history.list.map((item) => {
                const TypeIcon = getTypeIcon(item.type);
                return (
                  <Card key={item.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <TypeIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{getTypeName(item.type)}</span>
                              <Badge variant={item.errorCode === 0 ? 'default' : 'destructive'}>
                                {item.errorCode === 0 ? '成功' : '失败'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{formatDate(item.createdAt)}</span>
                              </div>
                              <div>
                                响应时间: {item.responseTime}ms
                              </div>
                            </div>
                          </div>

                          {item.errorCode !== 0 && item.errorMsg && (
                            <Alert variant="destructive">
                              <XCircle className="h-4 w-4" />
                              <AlertDescription>{item.errorMsg}</AlertDescription>
                            </Alert>
                          )}

                          {item.messageId && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">消息ID: </span>
                              <span className="font-mono">{item.messageId}</span>
                            </div>
                          )}

                          {item.extraData && Object.keys(item.extraData).length > 0 && (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">附加数据:</div>
                              <div className="text-sm bg-muted p-3 rounded-md overflow-x-auto">
                                <pre className="text-xs font-mono whitespace-pre-wrap">
                                  {JSON.stringify(item.extraData, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 分页 */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                共 {history.pagination.total} 条记录，
                第 {history.pagination.page} / {history.pagination.totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10条/页</SelectItem>
                    <SelectItem value="20">20条/页</SelectItem>
                    <SelectItem value="50">50条/页</SelectItem>
                    <SelectItem value="100">100条/页</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="icon"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= history.pagination.totalPages}
                  variant="outline"
                  size="icon"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <XCircle className="h-12 w-12 mb-2 opacity-50" />
            <p>暂无回调记录</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

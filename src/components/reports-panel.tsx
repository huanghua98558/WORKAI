'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  RefreshCw, 
  Download 
} from 'lucide-react';

interface ReportData {
  date: string;
  totalRecords?: number;
  byStatus?: {
    auto?: number;
    human?: number;
  };
  aiSummary?: string;
  byGroup?: Record<string, { count: number }>;
  byIntent?: Record<string, number>;
}

interface ReportsPanelProps {
  className?: string;
}

export default function ReportsPanel({ className }: ReportsPanelProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [selectedDate]);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data.data);
      }
    } catch (error) {
      console.error('加载报告数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    if (confirm(`确定要生成 ${selectedDate} 的日终报告吗？`)) {
      try {
        const res = await fetch('/api/admin/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: selectedDate })
        });
        if (res.ok) {
          alert('✅ 报告生成成功');
          loadReportData();
        } else {
          alert('❌ 报告生成失败');
        }
      } catch (error) {
        alert('❌ 报告生成失败');
      }
    }
  };

  const exportCSV = async () => {
    try {
      const res = await fetch(`/api/admin/reports/${selectedDate}/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `records_${selectedDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('❌ 导出失败');
      }
    } catch (error) {
      alert('❌ 导出失败');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-500" />
          报告中心
        </CardTitle>
        <CardDescription>
          查看日终报告和导出数据
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 日期选择 */}
        <div className="space-y-3">
          <label className="text-sm font-medium">选择报告日期</label>
          <div className="flex gap-2 items-center flex-wrap">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs"
            />
            <Button 
              onClick={loadReportData} 
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              查看
            </Button>
            <Button 
              onClick={generateReport} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              生成报告
            </Button>
            <Button 
              onClick={exportCSV} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              导出 CSV
            </Button>
          </div>
        </div>

        {/* 报告内容 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : reportData ? (
          <div className="space-y-4">
            {/* 概览 */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">报告概览</h4>
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="text-xs text-muted-foreground">日期</label>
                  <p className="text-lg font-bold">{reportData.date}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">总记录数</label>
                  <p className="text-lg font-bold">{reportData.totalRecords || 0}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">AI 自动回复</label>
                  <p className="text-lg font-bold text-blue-600">{reportData.byStatus?.auto || 0}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">人工接管</label>
                  <p className="text-lg font-bold text-orange-600">{reportData.byStatus?.human || 0}</p>
                </div>
              </div>

              {reportData.aiSummary && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <h5 className="font-medium text-sm mb-2">AI 总结</h5>
                  <p className="text-sm text-muted-foreground">{reportData.aiSummary}</p>
                </div>
              )}
            </div>

            {/* 群分布 */}
            {reportData.byGroup && Object.keys(reportData.byGroup).length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">群消息分布</h4>
                <div className="space-y-2">
                  {Object.entries(reportData.byGroup).map(([groupName, info]) => (
                    <div key={groupName} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded flex items-center justify-center text-white text-sm font-bold">
                          {groupName.charAt(0)}
                        </div>
                        <span className="text-sm">{groupName}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{info.count} 条</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 意图分布 */}
            {reportData.byIntent && Object.keys(reportData.byIntent).length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">意图分布</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(reportData.byIntent).map(([intent, count]) => (
                    <div key={intent} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm capitalize">{intent}</span>
                      <Badge variant="outline" className="text-xs">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>选择日期并点击"查看"加载数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

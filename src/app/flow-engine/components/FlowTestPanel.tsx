'use client';

/**
 * 流程测试面板
 * 显示流程测试结果
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, Play, ChevronRight } from 'lucide-react';

interface TestResult {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'running' | 'completed' | 'failed';
  duration: number;
  output?: any;
  timestamp: string;
}

interface FlowTestPanelProps {
  results: TestResult[];
  isRunning: boolean;
}

export default function FlowTestPanel({ results, isRunning }: FlowTestPanelProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <ChevronRight className="w-4 h-4 text-gray-400" />;
    }
  };

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  return (
    <Card className="p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">测试结果</h3>
        </div>
        {isRunning && (
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            测试中...
          </span>
        )}
      </div>

      <ScrollArea className="h-[400px] pr-4">
        {results.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <Play className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">点击"测试流程"按钮开始测试</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={result.nodeId}
                className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-900 text-sm truncate">
                        {index + 1}. {result.nodeName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {result.duration}ms
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mb-2">
                      类型: {result.nodeType} | 状态: {result.status}
                    </div>
                    {result.output && Object.keys(result.output).length > 0 && (
                      <div className="bg-slate-100 rounded p-2 mt-2">
                        <div className="text-xs text-slate-700 font-mono">
                          {JSON.stringify(result.output, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {results.length > 0 && !isRunning && (
              <div className="border-t border-slate-200 pt-3 mt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">总耗时</span>
                  <span className="font-medium text-slate-900">{totalDuration}ms</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-slate-600">执行步骤</span>
                  <span className="font-medium text-slate-900">{results.length}个</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}

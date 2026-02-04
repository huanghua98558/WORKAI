'use client';

/**
 * JSON编辑器组件
 * 允许用户直接编辑流程的JSON定义
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Code } from 'lucide-react';
import { FlowDefinition } from '../types';

interface FlowJsonEditorProps {
  flow: FlowDefinition;
  onChange: (flow: FlowDefinition) => void;
}

export default function FlowJsonEditor({ flow, onChange }: FlowJsonEditorProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // 当flow变化时，更新JSON内容
  useEffect(() => {
    setJsonContent(JSON.stringify(flow, null, 2));
  }, [flow]);

  // 处理JSON内容变化
  const handleJsonChange = (value: string) => {
    setJsonContent(value);

    try {
      const parsed = JSON.parse(value);
      setIsValid(true);
      setErrorMessage('');
      onChange(parsed);
    } catch (error) {
      setIsValid(false);
      setErrorMessage((error as Error).message);
    }
  };

  // 格式化JSON
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.error('格式化失败:', error);
    }
  };

  // 压缩JSON
  const handleMinify = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed));
    } catch (error) {
      console.error('压缩失败:', error);
    }
  };

  return (
    <Card className="p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">JSON编辑器</h3>
        </div>
        <div className="flex items-center gap-2">
          {isValid ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              有效
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <XCircle className="w-3 h-3" />
              无效
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleFormat}>
            格式化
          </Button>
          <Button variant="outline" size="sm" onClick={handleMinify}>
            压缩
          </Button>
        </div>
      </div>

      <div className="relative">
        <textarea
          value={jsonContent}
          onChange={(e) => handleJsonChange(e.target.value)}
          className={`
            w-full h-[600px] font-mono text-sm p-4 rounded-lg border-2 resize-none
            ${isValid ? 'border-slate-200 focus:border-blue-500' : 'border-red-500 focus:border-red-500'}
          `}
          placeholder="输入流程定义的JSON..."
        />
        {!isValid && errorMessage && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          💡 提示：JSON编辑器会实时同步到可视化编辑器。确保JSON格式正确，否则无法同步。
        </p>
      </div>
    </Card>
  );
}

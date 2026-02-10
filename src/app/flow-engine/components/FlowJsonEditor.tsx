'use client';

/**
 * JSON编辑器组件
 * 允许用户直接编辑流程的JSON定义
 * 支持实时验证、格式化、压缩、行号显示等功能
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  XCircle,
  Code,
  Download,
  Copy,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Zap,
  FileJson,
  AlertCircle
} from 'lucide-react';

interface FlowJsonEditorProps {
  flow: {
    id: string;
    name: string;
    description: string;
    triggerType: 'webhook' | 'manual' | 'scheduled';
    nodes: Node[];
    edges: Edge[];
    version?: string;
    flowConfig?: any;
  };
  onChange: (flow: any) => void;
}

export default function FlowJsonEditor({ flow, onChange }: FlowJsonEditorProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // 当flow变化时，更新JSON内容
  useEffect(() => {
    setJsonContent(JSON.stringify(flow, null, 2));
    setIsValid(true);
    setErrorMessage('');
    setErrorDetails(null);
  }, [flow]);

  // 同步滚动行号
  const handleScroll = useCallback(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // 处理JSON内容变化
  const handleJsonChange = (value: string) => {
    setJsonContent(value);

    try {
      const parsed = JSON.parse(value);
      setIsValid(true);
      setErrorMessage('');
      setErrorDetails(null);
      onChange(parsed);
    } catch (error: any) {
      setIsValid(false);
      const errorMsg = error.message || '未知错误';
      setErrorMessage(errorMsg);
      
      // 尝试解析错误位置
      const match = errorMsg.match(/position (\d+)/);
      if (match) {
        setErrorDetails({
          position: parseInt(match[1]),
          message: errorMsg
        });
      } else {
        setErrorDetails({
          message: errorMsg
        });
      }
    }
  };

  // 格式化JSON
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed, null, 2));
      setIsValid(true);
      setErrorMessage('');
      setErrorDetails(null);
      onChange(parsed);
    } catch (error) {
      console.error('格式化失败:', error);
    }
  };

  // 压缩JSON
  const handleMinify = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed));
      setIsValid(true);
      setErrorMessage('');
      setErrorDetails(null);
      onChange(parsed);
    } catch (error) {
      console.error('压缩失败:', error);
    }
  };

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 下载JSON文件
  const handleDownload = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flow.name || 'flow'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 生成行号
  const lineCount = jsonContent.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-sm bg-gradient-to-br from-slate-50 to-white border-slate-200">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 border-b bg-white px-4 py-2.5">
        <div className="flex items-center justify-between">
          {/* 左侧：标题和状态 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isValid ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
              }`}>
                {isValid ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-slate-900">JSON 编辑器</h3>
                  <FileJson className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className={`text-[10px] font-medium ${isValid ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isValid ? '格式正确' : '格式错误'}
                </div>
              </div>
            </div>
            
            {/* 统计信息 */}
            <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-slate-100 rounded-lg">
              <div className="flex items-center gap-1 text-[10px] text-slate-600">
                <Zap className="w-3 h-3" />
                <span>{jsonContent.length} 字符</span>
              </div>
              <div className="w-px h-3 bg-slate-300" />
              <div className="flex items-center gap-1 text-[10px] text-slate-600">
                <Code className="w-3 h-3" />
                <span>{lineCount} 行</span>
              </div>
            </div>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
              title={showLineNumbers ? '隐藏行号' : '显示行号'}
            >
              {showLineNumbers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleFormat}
              className="h-7 px-2 text-xs"
              title="格式化代码"
            >
              <Code className="w-3.5 h-3.5 mr-1" />
              格式化
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleMinify}
              className="h-7 px-2 text-xs"
              title="压缩代码"
            >
              <ChevronDown className="w-3.5 h-3.5 mr-1" />
              压缩
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs"
              title="复制到剪贴板"
            >
              <Copy className={`w-3.5 h-3.5 ${copied ? 'text-emerald-600' : ''}`} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-7 px-2 text-xs"
              title="下载JSON文件"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* 错误提示 */}
        {!isValid && errorMessage && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-red-800">JSON 解析错误</p>
                <p className="text-[10px] text-red-600 mt-0.5">{errorMessage}</p>
                {errorDetails?.position && (
                  <p className="text-[10px] text-red-500 mt-0.5">
                    错误位置: 第 {errorDetails.position} 个字符
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 flex min-h-0 overflow-hidden bg-slate-50">
        {showLineNumbers && (
          <div
            ref={lineNumbersRef}
            className="flex-shrink-0 w-10 bg-slate-100 text-slate-400 text-xs font-mono py-4 pr-2 text-right select-none overflow-hidden"
          >
            {lineNumbers}
          </div>
        )}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={jsonContent}
            onChange={(e) => handleJsonChange(e.target.value)}
            onScroll={handleScroll}
            className={`
              w-full h-full font-mono text-sm p-4 bg-transparent resize-none
              border-0 focus:ring-0 focus:outline-none
              ${!isValid ? 'text-red-900' : 'text-slate-700'}
            `}
            placeholder="输入流程定义的JSON..."
            spellCheck={false}
            style={{
              lineHeight: '1.6',
              tabSize: 2,
            }}
          />
        </div>
      </div>

      {/* 底部提示栏 */}
      <div className="flex-shrink-0 border-t bg-gradient-to-r from-blue-50 to-violet-50 px-4 py-2">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2 text-slate-600">
            <Zap className="w-3 h-3 text-violet-500" />
            <span>实时同步到可视化编辑器</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="hidden sm:inline">Tab: 2 空格</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Ctrl/Cmd + Enter: 格式化</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

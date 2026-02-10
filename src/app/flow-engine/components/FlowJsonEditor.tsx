'use client';

/**
 * JSON编辑器组件 - 增强版
 * 支持撤销/重做、快捷键、格式化等高级功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  Code,
  Undo,
  Redo,
  Search,
  Copy,
  Download,
  Upload,
  FileJson
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
  };
  onChange: (flow: any) => void;
}

export default function FlowJsonEditor({ flow, onChange }: FlowJsonEditorProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // 历史记录栈
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [maxHistorySize] = useState(50); // 最大历史记录数量

  // 搜索功能
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);

  // 当flow变化时，更新JSON内容（来自可视化编辑器）
  useEffect(() => {
    const newJson = JSON.stringify(flow, null, 2);
    if (jsonContent !== newJson) {
      setJsonContent(newJson);
      // 保存到历史记录
      saveToHistory(newJson);
    }
  }, [flow]); // 只依赖flow，避免循环

  // 初始化历史记录
  useEffect(() => {
    const initialJson = JSON.stringify(flow, null, 2);
    setHistory([initialJson]);
    setHistoryIndex(0);
    setJsonContent(initialJson);
  }, []); // 只在组件挂载时运行一次

  // 保存到历史记录
  const saveToHistory = useCallback((newContent: string) => {
    setHistory(prev => {
      // 如果当前不在历史记录末尾，则删除当前位置之后的所有记录
      const newHistory = prev.slice(0, historyIndex + 1);

      // 如果新内容与当前内容相同，则不保存
      if (newHistory.length > 0 && newHistory[newHistory.length - 1] === newContent) {
        return newHistory;
      }

      // 添加新记录
      newHistory.push(newContent);

      // 限制历史记录大小
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }

      return newHistory;
    });

    setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [historyIndex, maxHistorySize]);

  // 处理JSON内容变化
  const handleJsonChange = useCallback((value: string) => {
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
  }, [onChange]);

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const newContent = history[newIndex];
      setJsonContent(newContent);

      try {
        const parsed = JSON.parse(newContent);
        setIsValid(true);
        setErrorMessage('');
        onChange(parsed);
      } catch (error) {
        setIsValid(false);
        setErrorMessage((error as Error).message);
      }
    }
  }, [history, historyIndex, onChange]);

  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const newContent = history[newIndex];
      setJsonContent(newContent);

      try {
        const parsed = JSON.parse(newContent);
        setIsValid(true);
        setErrorMessage('');
        onChange(parsed);
      } catch (error) {
        setIsValid(false);
        setErrorMessage((error as Error).message);
      }
    }
  }, [history, historyIndex, onChange]);

  // 格式化JSON
  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonContent(formatted);
      saveToHistory(formatted);
    } catch (error) {
      console.error('格式化失败:', error);
    }
  }, [jsonContent, saveToHistory]);

  // 压缩JSON
  const handleMinify = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonContent);
      const minified = JSON.stringify(parsed);
      setJsonContent(minified);
      saveToHistory(minified);
    } catch (error) {
      console.error('压缩失败:', error);
    }
  }, [jsonContent, saveToHistory]);

  // 复制JSON
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(jsonContent).then(() => {
      // 可以添加toast提示
      console.log('JSON已复制到剪贴板');
    });
  }, [jsonContent]);

  // 下载JSON
  const handleDownload = useCallback(() => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-${flow.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [jsonContent, flow.id]);

  // 上传JSON
  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setJsonContent(content);
        saveToHistory(content);
        handleJsonChange(content);
      };
      reader.readAsText(file);
    }
  }, [handleJsonChange, saveToHistory]);

  // 搜索功能
  const handleSearch = useCallback(() => {
    if (!searchQuery) {
      setSearchMatches([]);
      setCurrentSearchIndex(-1);
      return;
    }

    const matches: number[] = [];
    let index = 0;
    while ((index = jsonContent.indexOf(searchQuery, index)) !== -1) {
      matches.push(index);
      index += searchQuery.length;
    }
    setSearchMatches(matches);
    setCurrentSearchIndex(matches.length > 0 ? 0 : -1);
  }, [searchQuery, jsonContent]);

  // 下一个搜索结果
  const handleNextSearch = useCallback(() => {
    if (searchMatches.length > 0) {
      setCurrentSearchIndex((prev) => (prev + 1) % searchMatches.length);
    }
  }, [searchMatches.length]);

  // 上一个搜索结果
  const handlePrevSearch = useCallback(() => {
    if (searchMatches.length > 0) {
      setCurrentSearchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
    }
  }, [searchMatches.length]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z: 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y: 重做
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + F: 搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        // 聚焦到搜索输入框
        const searchInput = document.getElementById('json-search-input');
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <Card className="p-4 bg-white shadow-sm h-full flex flex-col overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <FileJson className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">JSON编辑器</h3>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="json-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                } else if (e.key === 'F3') {
                  e.shiftKey ? handlePrevSearch() : handleNextSearch();
                }
              }}
              placeholder="搜索... (Ctrl+F)"
              className="w-full pl-10 pr-24 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchMatches.length > 0 && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {currentSearchIndex + 1} / {searchMatches.length}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch} disabled={!searchQuery}>
            搜索
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevSearch}
            disabled={searchMatches.length === 0}
            title="上一个 (Shift+F3)"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextSearch}
            disabled={searchMatches.length === 0}
            title="下一个 (F3)"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        {/* 状态和操作按钮 */}
        <div className="flex items-center gap-2 flex-shrink-0">
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

          <div className="h-6 w-px bg-slate-200" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="撤销 (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="重做 (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </Button>

          <div className="h-6 w-px bg-slate-200" />

          <Button variant="outline" size="sm" onClick={handleFormat}>
            格式化
          </Button>
          <Button variant="outline" size="sm" onClick={handleMinify}>
            压缩
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy} title="复制">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} title="下载">
            <Download className="w-4 h-4" />
          </Button>

          <input
            type="file"
            accept=".json"
            onChange={handleUpload}
            className="hidden"
            id="json-upload-input"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById('json-upload-input')?.click()}
            title="上传"
          >
            <Upload className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-hidden relative">
          <textarea
            value={jsonContent}
            onChange={(e) => handleJsonChange(e.target.value)}
            className={`
              w-full h-full font-mono text-sm p-4 rounded-lg border-2 resize-none
              ${isValid ? 'border-slate-200 focus:border-blue-500' : 'border-red-500 focus:border-red-500'}
            `}
            placeholder="输入流程定义的JSON..."
            spellCheck={false}
            style={{
              tabSize: 2,
              lineHeight: '1.6'
            }}
          />
        </div>

        {/* 错误提示 */}
        {!isValid && errorMessage && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 mb-1">JSON格式错误</p>
                <p className="text-xs text-red-600">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg flex-shrink-0">
        <div className="flex items-start gap-2">
          <Code className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-blue-700 space-y-1">
            <p>💡 提示：</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>JSON编辑器会实时同步到可视化编辑器</li>
              <li>使用 <kbd className="px-1.5 py-0.5 bg-blue-100 rounded text-xs">Ctrl+Z</kbd> 撤销，<kbd className="px-1.5 py-0.5 bg-blue-100 rounded text-xs">Ctrl+Shift+Z</kbd> 重做</li>
              <li>使用 <kbd className="px-1.5 py-0.5 bg-blue-100 rounded text-xs">Ctrl+F</kbd> 搜索，<kbd className="px-1.5 py-0.5 bg-blue-100 rounded text-xs">F3</kbd> 切换搜索结果</li>
              <li>确保JSON格式正确，否则无法同步</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}

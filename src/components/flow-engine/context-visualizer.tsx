'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface ContextField {
  key: string;
  value: any;
  type: string;
  level: number;
  parentKey?: string;
}

export default function ContextVisualizer({ context }: { context: any }) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isExpanded = (key: string) => expandedKeys.has(key);

  const renderField = (field: ContextField) => {
    const isObject = field.value !== null && typeof field.value === 'object';
    const isArray = Array.isArray(field.value);
    const isNull = field.value === null;

    const fullKey = field.parentKey ? `${field.parentKey}.${field.key}` : field.key;

    return (
      <div key={fullKey} className="select-none">
        <div 
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-accent rounded cursor-default"
          style={{ marginLeft: field.level * 16 }}
        >
          {(isObject && !isNull) && (
            <button
              onClick={() => toggleExpand(fullKey)}
              className="flex-shrink-0 hover:bg-accent-foreground/10 rounded p-0.5 transition-colors"
              aria-label={isExpanded(fullKey) ? '收起' : '展开'}
            >
              {isExpanded(fullKey) ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}
          {!(isObject && !isNull) && (
            <div className="w-6" />
          )}
          <span className="text-sm font-mono text-muted-foreground min-w-0 flex-1">
            {field.key}:
          </span>
          {isNull ? (
            <Badge variant="secondary" className="text-xs">null</Badge>
          ) : isObject ? (
            <Badge variant="secondary" className="text-xs">
              {isArray ? `Array[${field.value.length}]` : 'Object'}
            </Badge>
          ) : (
            <span className="text-sm text-slate-700 font-mono text-right truncate max-w-[200px]">
              {String(field.value)}
            </span>
          )}
        </div>
        {isObject && !isNull && isExpanded(fullKey) && (
          <div className="border-l border-slate-200 ml-4">
            {Object.entries(field.value).map(([k, v]) =>
              renderField({
                key: k,
                value: v,
                type: typeof v,
                level: field.level + 1,
                parentKey: fullKey
              })
            )}
          </div>
        )}
      </div>
    );
  };

  const parseContext = (obj: any, level = 0, parentKey = ''): ContextField[] => {
    const fields: ContextField[] = [];
    
    if (!obj || typeof obj !== 'object') {
      return fields;
    }
    
    for (const [key, value] of Object.entries(obj)) {
      fields.push({
        key,
        value,
        type: typeof value,
        level,
        parentKey: parentKey || undefined
      });
    }
    
    return fields;
  };

  const fields = parseContext(context);

  // 高亮关键字段
  const highlightKeyFields = (key: string) => {
    const importantFields = [
      'robotId', 'robotName', 'robot', 'sessionId', 'messageId',
      'userName', 'groupName', 'userId', 'groupId', 'message',
      'context', 'data', 'metadata'
    ];
    return importantFields.includes(key) ? 'font-semibold text-foreground' : '';
  };

  // 获取字段类型颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'text-blue-600';
      case 'number': return 'text-green-600';
      case 'boolean': return 'text-purple-600';
      default: return 'text-slate-700';
    }
  };

  // 获取快捷键提示
  const getShortcutHint = () => {
    return (
      <div className="text-xs text-muted-foreground mb-2 px-2">
        提示：点击字段名称可展开/收起对象
      </div>
    );
  };

  if (!context || Object.keys(context).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Context 数据</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            暂无 Context 数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Context 数据</CardTitle>
        <div className="text-xs text-muted-foreground">
          共 {fields.length} 个字段
        </div>
      </CardHeader>
      <CardContent>
        {getShortcutHint()}
        <ScrollArea className="h-[500px] rounded-md border">
          <div className="p-2">
            {fields.map(field => renderField(field))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

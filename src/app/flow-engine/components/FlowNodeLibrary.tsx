'use client';

/**
 * 节点库组件
 * 提供10种可拖拽的节点
 */

import React, { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NODE_TYPES, NODE_METADATA, NODE_CATEGORIES } from '../types';

interface FlowNodeLibraryProps {
  onNodeDragStart?: (nodeType: string, event: React.DragEvent) => void;
}

export default function FlowNodeLibrary({ onNodeDragStart }: FlowNodeLibraryProps) {
  const handleDragStart = useCallback((nodeType: string, event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';

    if (onNodeDragStart) {
      onNodeDragStart(nodeType, event);
    }
  }, [onNodeDragStart]);

  // 按分类分组节点
  const nodesByCategory = Object.entries(NODE_METADATA).reduce((acc, [type, meta]) => {
    if (!acc[meta.category]) {
      acc[meta.category] = [];
    }
    acc[meta.category].push({ type, ...meta });
    return acc;
  }, {} as Record<string, Array<{ type: string; name: string; description: string; icon: string; color: string; category: string }>>);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pr-2">
        <Card className="p-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">节点库</h2>

          {Object.entries(nodesByCategory).map(([category, nodes]) => (
            <div key={category} className="mb-4">
              <h3 className="text-sm font-medium text-slate-600 mb-2">
                {NODE_CATEGORIES[category as keyof typeof NODE_CATEGORIES]}
              </h3>
              <div className="space-y-2">
                {nodes.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => handleDragStart(node.type, e)}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-grab hover:bg-slate-100 hover:shadow-md transition-all"
                  >
                    <div className={`w-10 h-10 ${node.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                      {node.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {node.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {node.description}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {node.category}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 提示：拖拽节点到画布即可添加
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

'use client';

/**
 * 自定义节点组件
 * 显示节点的基本信息
 */

import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { X, Copy } from 'lucide-react';
import { NODE_METADATA } from '../types';
import type { Node } from 'reactflow';

interface CustomNodeProps extends NodeProps {
  onDelete?: (nodeId: string) => void;
  onCopy?: (node: Node) => void;
}

export default function CustomNode({
  data,
  selected,
  onDelete,
  onCopy
}: CustomNodeProps) {
  const [showActions, setShowActions] = useState(false);
  const [showCopy, setShowCopy] = useState(false);

  const metadata = NODE_METADATA[data.type as keyof typeof NODE_METADATA] || {
    color: 'bg-gray-500',
    icon: '⚙️',
  };

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(data.id);
    }
  }, [data.id, onDelete]);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCopy) {
      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: data.type,
        position: {
          x: (data.position?.x || 0) + 20,
          y: (data.position?.y || 0) + 20,
        },
        data: { ...data },
      };
      onCopy(newNode);
    }
  }, [data, onCopy]);

  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg shadow-lg border-2
        transition-all duration-200 group
        ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-white hover:border-blue-300'}
      `}
      style={{
        background: 'white',
        minWidth: '200px',
      }}
      onMouseEnter={() => {
        setShowActions(true);
        setShowCopy(true);
      }}
      onMouseLeave={() => {
        setShowActions(false);
        setShowCopy(false);
      }}
    >
      {/* 删除按钮 - 右上角 */}
      {selected && showActions && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 z-10"
          title="删除节点 (Delete)"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* 复制按钮 - 左下角 */}
      {selected && showCopy && (
        <button
          onClick={handleCopy}
          className="absolute -bottom-2 -left-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 z-10"
          title="复制节点"
        >
          <Copy className="w-3 h-3" />
        </button>
      )}

      {/* 输入连接点 */}
      {(metadata.hasInputs !== false) && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-blue-500 !border-blue-600 hover:!w-4 hover:!h-4 transition-all"
        />
      )}

      {/* 输出连接点 */}
      {(metadata.hasOutputs !== false) && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-500 !border-blue-600 hover:!w-4 hover:!h-4 transition-all"
        />
      )}

      {/* 节点内容 */}
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className={`w-10 h-10 ${metadata.color} rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0 shadow-md`}>
          {data.icon || metadata.icon}
        </div>

        {/* 文本内容 */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 text-sm truncate">
            {data.name}
          </div>
          {data.description && (
            <div className="text-xs text-slate-500 mt-1 truncate">
              {data.description}
            </div>
          )}
        </div>
      </div>

      {/* 节点类型标签 */}
      {data.type && (
        <div className="absolute -bottom-2 -right-2">
          <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-600 rounded-full border border-slate-200 shadow-sm">
            {data.type}
          </span>
        </div>
      )}
    </div>
  );
}

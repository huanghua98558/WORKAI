'use client';

/**
 * 自定义节点组件
 * 显示节点的基本信息
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NODE_METADATA } from '../types';

export default function CustomNode({ data, selected }: NodeProps) {
  const metadata = NODE_METADATA[data.type as keyof typeof NODE_METADATA] || {
    color: 'bg-gray-500',
    icon: '⚙️',
  };

  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg shadow-md border-2
        transition-all duration-200
        ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-white'}
      `}
      style={{
        background: 'white',
        minWidth: '200px',
      }}
    >
      {/* 输入连接点 */}
      {(metadata.hasInputs !== false) && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !border-gray-600"
        />
      )}

      {/* 输出连接点 */}
      {(metadata.hasOutputs !== false) && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-gray-400 !border-gray-600"
        />
      )}

      {/* 节点内容 */}
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className={`w-10 h-10 ${metadata.color} rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0`}>
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
        <div className="absolute -top-2 -right-2">
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
            {data.type}
          </span>
        </div>
      )}
    </div>
  );
}

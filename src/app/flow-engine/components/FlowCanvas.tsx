'use client';

/**
 * 流程画布组件
 * 基于React Flow实现可视化流程编辑
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NODE_METADATA, NODE_TYPES } from '../types';
import CustomNode from './CustomNode';
import { RiskHandlerNode, MonitorNode } from './nodes';
import { Trash2 } from 'lucide-react';

// 自定义节点类型
const nodeTypes = {
  custom: CustomNode,
  risk_handler: RiskHandlerNode,
  monitor: MonitorNode,
};

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeSelect: (node: Node | null) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<Node>) => void;
  selectedNodeId?: string | null;
  onDeleteNode?: (nodeId: string) => void;
  onCopyNode?: (node: Node) => void;
}

export default function FlowCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onNodeUpdate,
  selectedNodeId,
  onDeleteNode,
  onCopyNode,
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // 同步外部状态
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // 处理连线
  const onConnect = useCallback(
    (params: Connection) => {
      // 验证连接
      if (params.source === params.target) {
        return; // 不允许自连接
      }

      // 检查是否已存在相同的连接
      const exists = edges.some(
        (edge) => edge.source === params.source && edge.target === params.target
      );

      if (exists) {
        return; // 不允许重复连接
      }

      setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds));
    },
    [setEdges, edges]
  );

  // 删除连接
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
      setSelectedEdge(null);
      onEdgesChange(edges.filter((edge) => edge.id !== edgeId));
    },
    [setEdges, onEdgesChange, edges]
  );

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete 或 Backspace 删除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 如果有选中的节点，删除节点
        if (selectedNodeId && onDeleteNode) {
          onDeleteNode(selectedNodeId);
          e.preventDefault();
          return;
        }

        // 如果有选中的连接，删除连接
        if (selectedEdge) {
          handleDeleteEdge(selectedEdge.id);
          e.preventDefault();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdge, onDeleteNode, handleDeleteEdge]);

  // 处理节点拖拽（从节点库拖入）
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (!type || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const metadata = NODE_METADATA[type as keyof typeof NODE_METADATA];

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: 'custom',
        position,
        data: {
          type: type,
          name: metadata?.name || '新节点',
          description: metadata?.description || '',
          config: {},
          icon: metadata?.icon || '⚙️',
          color: metadata?.color || 'bg-gray-500',
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // 处理节点变化
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChangeInternal(changes);
      onNodesChange(nodes);
    },
    [nodes, onNodesChangeInternal, onNodesChange]
  );

  // 处理边变化
  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChangeInternal(changes);
      onEdgesChange(edges);
    },
    [edges, onEdgesChangeInternal, onEdgesChange]
  );

  // 处理节点点击
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node);
      setSelectedEdge(null); // 取消选中连接
    },
    [onNodeSelect]
  );

  // 处理连接点击
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge);
      onNodeSelect(null); // 取消选中节点
    },
    [onNodeSelect]
  );

  // 处理画布点击（取消选择）
  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
    setSelectedEdge(null);
  }, [onNodeSelect]);

  // 包装节点，添加删除和复制功能
  const wrappedNodes = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      position: node.position,
      onDelete: onDeleteNode,
      onCopy: onCopyNode,
    }
  }));

  return (
    <div ref={reactFlowWrapper} className="w-full h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <ReactFlow
        nodes={wrappedNodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        className="w-full h-full"
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const metadata = NODE_METADATA[node.data.type as keyof typeof NODE_METADATA];
            return metadata?.color || '#64748b';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        {/* 选中连接的删除按钮 */}
        {selectedEdge && (
          <Panel position="top-center" className="flex gap-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-2">
            <button
              onClick={() => handleDeleteEdge(selectedEdge.id)}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center gap-2 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              删除连接
            </button>
            <button
              onClick={() => setSelectedEdge(null)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md flex items-center gap-2 transition-colors text-sm"
            >
              取消
            </button>
          </Panel>
        )}

        {/* 底部统计信息 */}
        <Panel position="bottom-left" className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
          <div className="text-xs text-slate-600">
            节点: {nodes.length} | 连线: {edges.length}
            {selectedNodeId && ` | 选中: ${selectedNodeId}`}
            {selectedEdge && ` | 选中连接: ${selectedEdge.id}`}
          </div>
        </Panel>

        {/* 快捷键提示 */}
        <Panel position="bottom-right" className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
          <div className="text-xs text-slate-500">
            Delete 删除 | 拖拽连接 | 点击连接选中
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

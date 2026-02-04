'use client';

/**
 * 流程画布组件
 * 基于React Flow实现可视化流程编辑
 */

import React, { useCallback, useRef, useEffect } from 'react';
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

// 自定义节点类型
const nodeTypes = {
  custom: CustomNode,
};

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeSelect: (node: Node | null) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<Node>) => void;
  selectedNodeId?: string;
}

export default function FlowCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onNodeUpdate,
  selectedNodeId,
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

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
      setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds));
    },
    [setEdges]
  );

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
    },
    [onNodeSelect]
  );

  // 处理画布点击（取消选择）
  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full bg-white rounded-lg shadow-sm border border-slate-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
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
        <Panel position="top-right" className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
          <div className="text-xs text-slate-600">
            节点: {nodes.length} | 连线: {edges.length}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

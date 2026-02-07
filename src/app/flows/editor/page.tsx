'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import FlowList from '@/components/flows/flow-list';
import FlowCanvas from '@/components/flows/flow-canvas';
import NodeConfigPanel from '@/components/flows/node-config-panel';
import VersionPanel from '@/components/flows/version-panel';
import TestPanel from '@/components/flows/test-panel';
import MonitorPanel from '@/components/flows/monitor-panel';
import { Save, Play, History, Activity } from 'lucide-react';

export default function FlowEditorPage() {
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b p-4 flex items-center justify-between bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">流程编辑器</h1>
          {selectedFlowId && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Save className="mr-2 h-4 w-4" />
                保存
              </Button>
              <Button size="sm" variant="outline">
                <Play className="mr-2 h-4 w-4" />
                测试
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：流程列表和版本管理 */}
        <div className="w-64 border-r flex flex-col">
          <Card className="flex-1 rounded-none border-0">
            <Tabs defaultValue="flows" className="h-full flex flex-col">
              <div className="p-2 border-b">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="flows">流程列表</TabsTrigger>
                  <TabsTrigger value="versions">版本历史</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="flows" className="flex-1 p-2 overflow-auto">
                <FlowList
                  selectedFlowId={selectedFlowId}
                  onSelectFlow={setSelectedFlowId}
                />
              </TabsContent>
              <TabsContent value="versions" className="flex-1 p-2 overflow-auto">
                <VersionPanel flowId={selectedFlowId} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* 中间：可视化编辑器 */}
        <div className="flex-1 flex flex-col">
          {selectedFlowId ? (
            <FlowCanvas
              flowId={selectedFlowId}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              请选择或创建一个流程
            </div>
          )}
        </div>

        {/* 右侧：配置面板 */}
        <div className="w-80 border-l flex flex-col">
          <Card className="flex-1 rounded-none border-0">
            <Tabs defaultValue="config" className="h-full flex flex-col">
              <div className="p-2 border-b">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="config">配置</TabsTrigger>
                  <TabsTrigger value="test">
                    <Play className="h-3 w-3 mr-1" />
                    测试
                  </TabsTrigger>
                  <TabsTrigger value="monitor">
                    <Activity className="h-3 w-3 mr-1" />
                    监控
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="config" className="flex-1 p-2 overflow-auto">
                {selectedNodeId ? (
                  <NodeConfigPanel
                    flowId={selectedFlowId}
                    nodeId={selectedNodeId}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    选择一个节点以配置
                  </div>
                )}
              </TabsContent>
              <TabsContent value="test" className="flex-1 p-2 overflow-auto">
                <TestPanel flowId={selectedFlowId} />
              </TabsContent>
              <TabsContent value="monitor" className="flex-1 p-2 overflow-auto">
                <MonitorPanel flowId={selectedFlowId} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}

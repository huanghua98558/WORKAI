'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VersionManagement from '@/components/flow-engine/version-management';
import TestPanel from '@/components/flow-engine/test-panel';
import ExecutionMonitor from '@/components/flow-engine/execution-monitor';
import ContextDebugPanel from '@/components/flow-engine/context-debug-panel';
import ContextVisualizer from '@/components/flow-engine/context-visualizer';

export default function FlowEnginePage() {
  const sampleContext = {
    robotId: 'robot-1',
    robotName: '机器人 1',
    robot: {
      robotId: 'robot-1',
      robotName: '机器人 1',
      userId: 'user-1',
      groupId: 'group-1'
    },
    sessionId: 'session-123',
    messageId: 'message-456',
    userName: '测试用户',
    groupName: '测试群组',
    userId: 'user-1',
    groupId: 'group-1',
    message: {
      content: '测试消息内容',
      messageType: 'text'
    },
    timestamp: new Date().toISOString()
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">流程引擎管理</h1>
        <p className="text-muted-foreground mt-2">
          管理流程版本、测试流程执行、监控流程运行状态、查看 Context 数据
        </p>
      </div>

      <Tabs defaultValue="monitor" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="monitor">执行监控</TabsTrigger>
          <TabsTrigger value="test">测试面板</TabsTrigger>
          <TabsTrigger value="version">版本管理</TabsTrigger>
          <TabsTrigger value="context-visualizer">Context 可视化</TabsTrigger>
          <TabsTrigger value="context-debug">Context 调试</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="mt-6">
          <ExecutionMonitor />
        </TabsContent>

        <TabsContent value="test" className="mt-6">
          <TestPanel />
        </TabsContent>

        <TabsContent value="version" className="mt-6">
          <VersionManagement />
        </TabsContent>

        <TabsContent value="context-visualizer" className="mt-6">
          <ContextVisualizer context={sampleContext} />
        </TabsContent>

        <TabsContent value="context-debug" className="mt-6">
          <ContextDebugPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VersionManagement from '@/components/flow-engine/version-management';
import TestPanel from '@/components/flow-engine/test-panel';
import ExecutionMonitor from '@/components/flow-engine/execution-monitor';
import ContextDebugPanel from '@/components/flow-engine/context-debug-panel';

export default function FlowEnginePage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">流程引擎管理</h1>
        <p className="text-muted-foreground mt-2">
          管理流程版本、测试流程执行、监控流程运行状态、调试 Context 数据
        </p>
      </div>

      <Tabs defaultValue="monitor" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="monitor">执行监控</TabsTrigger>
          <TabsTrigger value="test">测试面板</TabsTrigger>
          <TabsTrigger value="version">版本管理</TabsTrigger>
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

        <TabsContent value="context-debug" className="mt-6">
          <ContextDebugPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

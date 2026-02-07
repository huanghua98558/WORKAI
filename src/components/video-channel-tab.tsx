'use client';

import { useState, lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cookie, FileText, MessageSquare, CheckCircle } from 'lucide-react';

// 懒加载子组件
const VideoChannelCookies = lazy(() => import('@/app/video-channel/cookies/page'));
const VideoChannelAudit = lazy(() => import('@/app/video-channel/audit/page'));
const VideoChannelTemplates = lazy(() => import('@/app/video-channel/templates/page'));
const VideoChannelConversion = lazy(() => import('@/app/video-channel/page'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}

export default function VideoChannelTab() {
  const [activeSubTab, setActiveSubTab] = useState('conversion');

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold">视频号转化系统</h1>
        <p className="text-muted-foreground mt-2">
          管理视频号小店兼职转化流程，包括用户管理、二维码发送、登录检测、Cookie提取和人工审核
        </p>
      </div>

      {/* 子功能导航 */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full max-w-[800px] grid-cols-4 h-14 bg-white/90 backdrop-blur-md border-2 border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-2xl p-1.5 mb-6">
          <TabsTrigger
            value="conversion"
            className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300"
          >
            <CheckCircle className="h-5 w-5" />
            转化流程
          </TabsTrigger>
          <TabsTrigger
            value="cookies"
            className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300"
          >
            <Cookie className="h-5 w-5" />
            Cookie管理
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300"
          >
            <CheckCircle className="h-5 w-5" />
            人工审核
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300"
          >
            <MessageSquare className="h-5 w-5" />
            消息模板
          </TabsTrigger>
        </TabsList>

        {/* 子功能内容 */}
        <TabsContent value="conversion" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <VideoChannelConversion />
          </Suspense>
        </TabsContent>

        <TabsContent value="cookies" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <VideoChannelCookies />
          </Suspense>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <VideoChannelAudit />
          </Suspense>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <VideoChannelTemplates />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

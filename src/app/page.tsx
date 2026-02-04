'use client';

import { useAuth } from '@/contexts/auth-context';
import ProtectedRoute from '@/components/protected-route';
import { Shield, Bot, Users, Activity, Settings, LogOut, User } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 顶部导航栏 */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">WorkTool AI 中枢系统</h1>
              <p className="text-sm text-slate-400">企业微信社群智能运营平台</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg">
              <User className="w-4 h-4 text-slate-400" />
              <div className="text-sm">
                <p className="font-medium">{user?.username}</p>
                <p className="text-xs text-slate-400">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>登出</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 机器人管理卡片 */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold">机器人管理</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">管理企业微信机器人，配置回调和参数</p>
            <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              进入管理
            </button>
          </div>

          {/* 会话管理卡片 */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold">会话管理</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">查看和管理用户会话，处理人工接管</p>
            <button className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
              查看会话
            </button>
          </div>

          {/* 监控告警卡片 */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-500" />
              </div>
              <h2 className="text-lg font-semibold">监控告警</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">监控系统状态，配置告警规则</p>
            <button className="w-full py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors">
              查看监控
            </button>
          </div>

          {/* 系统设置卡片 */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-500" />
              </div>
              <h2 className="text-lg font-semibold">系统设置</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">配置系统参数，管理用户权限</p>
            <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
              进入设置
            </button>
          </div>
        </div>

        {/* 欢迎提示 */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-2">欢迎使用 WorkTool AI 中枢系统</h3>
          <p className="text-slate-200">
            这是一个企业微信社群智能运营平台，提供机器人管理、会话管理、监控告警等功能。
            原主页正在修复中，暂时使用此简化版本。
          </p>
        </div>
      </main>
    </div>
  );
}

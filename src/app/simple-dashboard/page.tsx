'use client';

import { useAuth } from '@/contexts/auth-context';

export default function SimpleDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">WorkTool AI 中枢系统</h1>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">欢迎回来！</h2>
          <div className="space-y-2">
            <p><strong>用户名：</strong>{user?.username}</p>
            <p><strong>邮箱：</strong>{user?.email}</p>
            <p><strong>角色：</strong>{user?.role}</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">系统功能</h2>
          <ul className="space-y-2 text-slate-300">
            <li>• 机器人管理</li>
            <li>• 会话管理</li>
            <li>• 监控告警</li>
            <li>• 实时消息</li>
            <li>• 用户管理</li>
            <li>• 系统设置</li>
          </ul>
        </div>

        <button
          onClick={logout}
          className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          登出
        </button>
      </div>
    </div>
  );
}

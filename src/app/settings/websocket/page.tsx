import { Metadata } from 'next';
import WebSocketStatusPanel from '@/components/websocket-status-panel';

export const metadata: Metadata = {
  title: 'WebSocket 状态 - WORKAI',
  description: 'WebSocket 连接状态监控和管理',
};

export default function WebSocketPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">WebSocket 状态</h1>
        <p className="text-muted-foreground mt-1">
          管理 WebSocket 连接，查看在线机器人和消息日志
        </p>
      </div>

      <WebSocketStatusPanel showMessageSender={true} />

      {/* 使用说明 */}
      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">使用说明</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>WebSocket URL:</strong>{' '}
            <code className="bg-muted px-1 rounded">
              {process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5002'}
              {process.env.NEXT_PUBLIC_WS_PATH || '/ws'}
            </code>
          </p>
          <p>
            <strong>worktool 配置:</strong> 在 worktool 项目的 <code className="bg-muted px-1 rounded">Constant.kt</code> 中设置：
          </p>
          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`private const val DEFAULT_HOST = "ws://your-server-ip:5002"
// WebSocket 路径默认为 /ws`}
          </pre>
          <p>
            <strong>事件类型:</strong>
          </p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li><code>register</code> - 注册机器人</li>
            <li><code>message</code> - 发送消息到服务器</li>
            <li><code>command</code> - 接收服务器命令</li>
            <li><code>execute_command</code> - 执行发送消息命令</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

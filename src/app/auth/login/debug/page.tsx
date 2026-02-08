'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DebugLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[DebugLogin] ${message}`);
  };

  const handleButtonClick = () => {
    addLog('按钮被点击');
    handleSubmit(new Event('submit') as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addLog('表单提交开始');

    if (!username || !password) {
      addLog('错误: 用户名或密码为空');
      return;
    }

    setLoading(true);
    addLog('开始登录...');

    try {
      addLog('发送请求到 /api/auth/login');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, rememberMe: false }),
      });

      addLog(`收到响应: ${response.status} ${response.statusText}`);
      const result = await response.json();
      addLog(`响应数据: ${JSON.stringify(result, null, 2)}`);

      if (result.code === 0) {
        addLog('登录成功，保存数据');
        localStorage.setItem('access_token', result.data.accessToken);
        localStorage.setItem('refresh_token', result.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(result.data.user));

        addLog('跳转到首页');
        router.push('/');
      } else {
        addLog(`登录失败: ${result.message}`);
      }
    } catch (err) {
      addLog(`捕获错误: ${err}`);
    } finally {
      addLog('登录流程结束');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>调试登录页面</h1>

      <div style={{ marginBottom: '30px' }}>
        <h2>登录表单</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名"
            disabled={loading}
            style={{ padding: '10px' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            disabled={loading}
            style={{ padding: '10px' }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div style={{ marginTop: '10px' }}>
          <button
            onClick={handleButtonClick}
            disabled={loading}
            style={{ padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            测试按钮点击
          </button>
        </div>
      </div>

      <div>
        <h2>调试日志</h2>
        <div style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px', maxHeight: '300px', overflow: 'auto' }}>
          {logs.length === 0 ? <div>暂无日志</div> : logs.map((log, index) => (
            <div key={index} style={{ fontFamily: 'monospace', fontSize: '12px', marginBottom: '5px' }}>
              {log}
            </div>
          ))}
        </div>
        <button
          onClick={() => setLogs([])}
          style={{ marginTop: '10px', padding: '5px' }}
        >
          清空日志
        </button>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        测试账号: admin / admin123
      </div>
    </div>
  );
}

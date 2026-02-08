'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SimpleLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('[SimpleLogin] 开始登录', { username });

    try {
      console.log('[SimpleLogin] 发送请求');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, rememberMe: false }),
      });

      console.log('[SimpleLogin] 收到响应', { status: response.status });
      const result = await response.json();
      console.log('[SimpleLogin] 响应数据', result);

      if (result.code === 0) {
        console.log('[SimpleLogin] 登录成功，保存数据');
        localStorage.setItem('access_token', result.data.accessToken);
        localStorage.setItem('refresh_token', result.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(result.data.user));

        console.log('[SimpleLogin] 跳转到首页');
        router.push('/');
      } else {
        console.log('[SimpleLogin] 登录失败', result);
        setError(result.message || '登录失败');
      }
    } catch (err) {
      console.error('[SimpleLogin] 捕获错误', err);
      setError('网络错误，请稍后重试');
    } finally {
      console.log('[SimpleLogin] 结束');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '50px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>简单登录页面</h1>
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
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        测试账号: admin / admin123
      </div>
    </div>
  );
}

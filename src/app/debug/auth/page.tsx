'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthTestPage() {
  const router = useRouter();
  const [tokenFromCookie, setTokenFromCookie] = useState<string | null>(null);

  useEffect(() => {
    // 测试：尝试访问一个受保护的路由
    const testProtectedRoute = async () => {
      try {
        const response = await fetch('/api/auth/sessions');
        if (response.ok) {
          console.log('[AuthTest] 认证成功！');
          const data = await response.json();
          console.log('[AuthTest] 会话数据:', data);
        } else {
          console.log('[AuthTest] 认证失败，状态码:', response.status);
        }
      } catch (error) {
        console.error('[AuthTest] 请求失败:', error);
      }
    };

    testProtectedRoute();
  }, []);

  const handleGoHome = () => {
    console.log('[AuthTest] 跳转到首页');
    router.push('/');
  };

  const handleGoHomeWithReload = () => {
    console.log('[AuthTest] 刷新并跳转到首页');
    window.location.href = '/';
  };

  const handleClearAndLogin = () => {
    // 清除所有数据
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
    localStorage.clear();
    window.location.href = '/auth/login';
  };

  return (
    <div style={{ padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>认证测试页面</h1>

      <div style={{ marginBottom: '30px' }}>
        <h2>测试认证状态</h2>
        <p>此页面会自动测试当前用户的认证状态，结果请查看浏览器控制台。</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>操作</h2>
        <button
          onClick={handleGoHome}
          style={{ padding: '10px', marginRight: '10px' }}
        >
          跳转到首页（router.push）
        </button>
        <button
          onClick={handleGoHomeWithReload}
          style={{ padding: '10px', marginRight: '10px' }}
        >
          跳转到首页（window.location.href）
        </button>
        <button
          onClick={handleClearAndLogin}
          style={{ padding: '10px' }}
        >
          清除数据并重新登录
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>测试步骤：</p>
        <ol>
          <li>打开浏览器控制台（F12）</li>
          <li>查看控制台输出，确认认证状态</li>
          <li>尝试点击"跳转到首页"按钮</li>
          <li>观察是否能正常跳转或被重定向回登录页</li>
        </ol>
      </div>
    </div>
  );
}

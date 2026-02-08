'use client';

import { useEffect, useState } from 'react';

export default function CookieTestPage() {
  const [cookies, setCookies] = useState<Record<string, string>>({});
  const [localStorageData, setLocalStorageData] = useState<Record<string, string>>({});

  useEffect(() => {
    const updateData = () => {
      // 读取所有 cookies
      const cookies: Record<string, string> = {};
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          cookies[name] = value;
        }
      });
      setCookies(cookies);

      // 读取 localStorage
      const localStorageData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageData[key] = localStorage.getItem(key) || '';
        }
      }
      setLocalStorageData(localStorageData);
    };

    updateData();
    const interval = setInterval(updateData, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Cookie 和 LocalStorage 测试</h1>

      <div style={{ marginBottom: '30px' }}>
        <h2>Cookies</h2>
        {Object.keys(cookies).length === 0 ? (
          <div>暂无 Cookies</div>
        ) : (
          <div style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
            {Object.entries(cookies).map(([name, value]) => (
              <div key={name} style={{ marginBottom: '10px' }}>
                <div><strong>名称:</strong> {name}</div>
                <div><strong>值:</strong> {value.substring(0, 50)}{value.length > 50 ? '...' : ''}</div>
                <div><strong>长度:</strong> {value.length}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>LocalStorage</h2>
        {Object.keys(localStorageData).length === 0 ? (
          <div>暂无 LocalStorage</div>
        ) : (
          <div style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
            {Object.entries(localStorageData).map(([name, value]) => (
              <div key={name} style={{ marginBottom: '10px' }}>
                <div><strong>名称:</strong> {name}</div>
                <div><strong>值:</strong> {value.substring(0, 100)}{value.length > 100 ? '...' : ''}</div>
                <div><strong>长度:</strong> {value.length}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>操作</h2>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px', marginRight: '10px' }}
        >
          刷新页面
        </button>
        <button
          onClick={() => {
            document.cookie.split(';').forEach(cookie => {
              const [name] = cookie.trim().split('=');
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            });
            localStorage.clear();
            window.location.reload();
          }}
          style={{ padding: '10px' }}
        >
          清除所有 Cookies 和 LocalStorage
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>注意：HttpOnly 的 Cookie 无法通过 JavaScript 读取，这里只能看到非 HttpOnly 的 Cookie。</p>
        <p>如果登录成功后没有看到 access_token 和 refresh_token，但中间件能读取到，说明它们是 HttpOnly 的 Cookie（这是正确的）。</p>
      </div>
    </div>
  );
}

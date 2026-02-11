'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TestRedirectPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState('');
  const [localStorageData, setLocalStorageData] = useState({
    access_token: '未知',
    refresh_token: '未知',
    user: '未知',
  });
  const [currentUrl, setCurrentUrl] = useState('加载中...');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // 获取 localStorage 数据
    setLocalStorageData({
      access_token: localStorage.getItem('access_token') ? '存在' : '不存在',
      refresh_token: localStorage.getItem('refresh_token') ? '存在' : '不存在',
      user: localStorage.getItem('user') ? '存在' : '不存在',
    });
    // 获取当前 URL
    setCurrentUrl(window.location.href);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[TestRedirect] ${message}`);
  };

  const testLogin = async () => {
    addLog('开始测试登录...');
    setResult('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123',
          rememberMe: false,
        }),
      });

      const result = await response.json();
      addLog(`收到响应: ${JSON.stringify(result)}`);

      if (result.code === 0) {
        addLog('登录成功！');
        addLog('准备跳转到首页...');

        // 保存到 localStorage
        localStorage.setItem('access_token', result.data.accessToken);
        localStorage.setItem('refresh_token', result.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        addLog('已保存到 localStorage');

        return true;
      } else {
        addLog(`登录失败: ${result.message}`);
        setResult(result.message);
        return false;
      }
    } catch (err) {
      addLog(`登录出错: ${err}`);
      setResult('网络错误');
      return false;
    }
  };

  const testWindowLocationHref = async () => {
    const success = await testLogin();
    if (success) {
      addLog('使用 window.location.href = "/" 跳转');
      window.location.href = '/';
    }
  };

  const testWindowLocationReplace = async () => {
    const success = await testLogin();
    if (success) {
      addLog('使用 window.location.replace("/") 跳转');
      window.location.replace('/');
    }
  };

  const testRouterPush = async () => {
    const success = await testLogin();
    if (success) {
      addLog('使用 router.push("/") 跳转');
      // 动态导入 router 以避免 SSR 问题
      const { useRouter } = await import('next/navigation');
      const router = useRouter();
      router.push('/');
    }
  };

  const testWindowAssign = async () => {
    const success = await testLogin();
    if (success) {
      addLog('使用 window.location.assign("/") 跳转');
      window.location.assign('/');
    }
  };

  const testDirectLogin = async () => {
    addLog('直接登录测试...');
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/login';

    const usernameInput = document.createElement('input');
    usernameInput.type = 'hidden';
    usernameInput.name = 'username';
    usernameInput.value = 'admin';

    const passwordInput = document.createElement('input');
    passwordInput.type = 'hidden';
    passwordInput.name = 'password';
    passwordInput.value = 'admin123';

    const rememberInput = document.createElement('input');
    rememberInput.type = 'hidden';
    rememberInput.name = 'rememberMe';
    rememberInput.value = 'false';

    form.appendChild(usernameInput);
    form.appendChild(passwordInput);
    form.appendChild(rememberInput);

    document.body.appendChild(form);
    addLog('提交表单...');
    form.submit();
  };

  const clearLogs = () => {
    setLogs([]);
    setResult('');
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">登录跳转测试页面</h1>

        <div className="grid gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">测试不同的跳转方式</h2>
            <div className="grid gap-4">
              <Button onClick={testWindowLocationHref} variant="default">
                测试 window.location.href
              </Button>
              <Button onClick={testWindowLocationReplace} variant="default">
                测试 window.location.replace
              </Button>
              <Button onClick={testRouterPush} variant="default">
                测试 router.push
              </Button>
              <Button onClick={testWindowAssign} variant="default">
                测试 window.location.assign
              </Button>
              <Button onClick={testDirectLogin} variant="outline">
                测试直接表单提交
              </Button>
            </div>
          </div>

          {result && (
            <Alert variant="destructive">
              <AlertDescription>{result}</AlertDescription>
            </Alert>
          )}

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">日志</h2>
              <Button onClick={clearLogs} variant="outline" size="sm">
                清除日志
              </Button>
            </div>
            <div className="bg-gray-100 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">暂无日志</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">当前状态</h2>
            <div className="space-y-2">
              <div>
                <strong>LocalStorage:</strong>
                <pre className="bg-gray-100 p-2 rounded mt-1 text-sm">
                  {JSON.stringify(localStorageData, null, 2)}
                </pre>
              </div>
              <div>
                <strong>当前 URL:</strong>
                <p className="text-sm mt-1">{isMounted ? currentUrl : '加载中...'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

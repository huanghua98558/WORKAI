'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ManualRedirectLoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setUserData(null);

    console.log('[ManualLogin] 开始登录', formData);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('[ManualLogin] 响应', result);

      if (result.code === 0) {
        // 保存到 localStorage
        localStorage.setItem('access_token', result.data.accessToken);
        localStorage.setItem('refresh_token', result.data.refreshToken);
        localStorage.setItem('remember_me', formData.rememberMe.toString());
        localStorage.setItem('user', JSON.stringify(result.data.user));

        setUserData(result.data);
        setSuccess(true);
        console.log('[ManualLogin] 登录成功，等待用户手动跳转');
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err) {
      console.error('[ManualLogin] 错误', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRedirect = (method: string) => {
    console.log(`[ManualLogin] 使用 ${method} 跳转`);

    switch (method) {
      case 'href':
        window.location.href = '/';
        break;
      case 'replace':
        window.location.replace('/');
        break;
      case 'assign':
        window.location.assign('/');
        break;
      case 'open':
        window.open('/', '_self');
        break;
      default:
        window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">WorkTool AI (手动跳转测试)</CardTitle>
          <CardDescription className="text-center">
            登录后手动点击跳转按钮
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={handleChange}
                disabled={loading || success}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="请输入密码"
                value={formData.password}
                onChange={handleChange}
                disabled={loading || success}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                disabled={loading || success}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-600 dark:text-gray-400">
                记住我
              </label>
            </div>

            {!success ? (
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription className="text-green-600 font-semibold">
                    ✓ 登录成功！
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">选择跳转方式：</p>

                  <Button
                    onClick={() => handleManualRedirect('href')}
                    className="w-full"
                    variant="default"
                  >
                    方法 1: window.location.href
                  </Button>

                  <Button
                    onClick={() => handleManualRedirect('replace')}
                    className="w-full"
                    variant="default"
                  >
                    方法 2: window.location.replace
                  </Button>

                  <Button
                    onClick={() => handleManualRedirect('assign')}
                    className="w-full"
                    variant="default"
                  >
                    方法 3: window.location.assign
                  </Button>

                  <Button
                    onClick={() => handleManualRedirect('open')}
                    className="w-full"
                    variant="default"
                  >
                    方法 4: window.open('/', '_self')
                  </Button>
                </div>

                {userData && (
                  <div className="mt-4 p-4 bg-gray-100 rounded">
                    <p className="text-sm font-semibold mb-2">用户信息：</p>
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(userData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

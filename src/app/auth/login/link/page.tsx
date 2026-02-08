'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function LinkLoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

    console.log('[LinkLogin] 开始登录', formData);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('[LinkLogin] 响应', result);

      if (result.code === 0) {
        // 保存到 localStorage
        localStorage.setItem('access_token', result.data.accessToken);
        localStorage.setItem('refresh_token', result.data.refreshToken);
        localStorage.setItem('remember_me', formData.rememberMe.toString());
        localStorage.setItem('user', JSON.stringify(result.data.user));

        setSuccess(true);
        console.log('[LinkLogin] 登录成功，显示链接');

        // 不自动跳转，显示链接让用户点击
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err) {
      console.error('[LinkLogin] 错误', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">WorkTool AI (链接测试)</CardTitle>
          <CardDescription className="text-center">
            登录后点击链接跳转
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
                  <AlertDescription className="text-green-600 font-semibold text-center">
                    ✓ 登录成功！
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-center">请点击下面的链接跳转到首页：</p>

                  <Link href="/" className="block">
                    <Button className="w-full" variant="default" size="lg">
                      跳转到首页 (Next.js Link)
                    </Button>
                  </Link>

                  <a href="/" className="block">
                    <Button className="w-full" variant="outline" size="lg">
                      跳转到首页 (HTML a 标签)
                    </Button>
                  </a>

                  <div className="p-4 bg-gray-100 rounded">
                    <p className="text-sm font-semibold mb-2">当前状态：</p>
                    <div className="text-xs space-y-1">
                      <p>access_token: {localStorage.getItem('access_token') ? '✓ 存在' : '✗ 不存在'}</p>
                      <p>refresh_token: {localStorage.getItem('refresh_token') ? '✓ 存在' : '✗ 不存在'}</p>
                      <p>user: {localStorage.getItem('user') ? '✓ 存在' : '✗ 不存在'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false, // 添加记住我选项
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.code === 0) {
        // 记住我功能：设置不同的 cookie 过期时间
        const accessTokenExpiry = formData.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60; // 30天或1小时
        const refreshTokenExpiry = formData.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30天或7天

        // 保存 tokens 到 localStorage（兼容性）
        localStorage.setItem('access_token', result.data.accessToken);
        localStorage.setItem('refresh_token', result.data.refreshToken);
        localStorage.setItem('remember_me', formData.rememberMe.toString()); // 保存记住我设置

        // 保存用户信息
        localStorage.setItem('user', JSON.stringify(result.data.user));

        // 设置 cookies（用于 middleware 认证）
        document.cookie = `access_token=${result.data.accessToken}; path=/; max-age=${accessTokenExpiry}; SameSite=lax`;
        document.cookie = `refresh_token=${result.data.refreshToken}; path=/; max-age=${refreshTokenExpiry}; SameSite=lax`;

        // 跳转到首页
        router.push('/');
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('登录错误:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">WorkTool AI</CardTitle>
          <CardDescription className="text-center">
            登录到 AI 中枢系统
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
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  autoComplete="username"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  disabled={loading}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none"
                >
                  记住我
                </label>
              </div>

              <a
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                忘记密码？
              </a>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  登录中...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  安全登录
                </>
              )}
            </Button>

            <div className="text-center text-sm space-y-2">
              <div>
                还没有账号？
                <a
                  href="/auth/register"
                  className="ml-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  立即注册
                </a>
              </div>
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>登录即表示同意服务条款和隐私政策</span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

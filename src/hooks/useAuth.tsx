'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User, AuthTokens } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5分钟内过期时刷新

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查认证状态
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return false;
      }

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (result.code === 0) {
        setUser(result.data.user);

        // 检查是否需要刷新令牌
        const expiresAt = result.data.expiresAt;
        if (expiresAt && new Date(expiresAt).getTime() - Date.now() < TOKEN_REFRESH_THRESHOLD) {
          await refreshTokens();
        }

        return true;
      } else {
        // Token 无效，尝试刷新
        const refreshSuccess = await refreshTokens();
        if (!refreshSuccess) {
          clearAuth();
        }
        return false;
      }
    } catch (error) {
      console.error('认证检查失败:', error);
      clearAuth();
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 刷新令牌
  const refreshTokens = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        clearAuth();
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const result = await response.json();

      if (result.code === 0) {
        localStorage.setItem('access_token', result.data.accessToken);
        localStorage.setItem('refresh_token', result.data.refreshToken);

        // 更新 cookies
        document.cookie = `access_token=${result.data.accessToken}; path=/; max-age=${60 * 60}; SameSite=lax`;
        document.cookie = `refresh_token=${result.data.refreshToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=lax`;

        return true;
      } else {
        clearAuth();
        return false;
      }
    } catch (error) {
      console.error('刷新令牌失败:', error);
      clearAuth();
      return false;
    }
  };

  // 登录
  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (result.code === 0) {
      // 保存 tokens 到 localStorage
      localStorage.setItem('access_token', result.data.accessToken);
      localStorage.setItem('refresh_token', result.data.refreshToken);

      // 保存用户信息
      setUser(result.data.user);
      localStorage.setItem('user', JSON.stringify(result.data.user));

      // 设置 cookies（用于 middleware 认证）
      document.cookie = `access_token=${result.data.accessToken}; path=/; max-age=${60 * 60}; SameSite=lax`;
      document.cookie = `refresh_token=${result.data.refreshToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=lax`;

      // 跳转到首页
      router.push('/');
    } else {
      throw new Error(result.message || '登录失败');
    }
  };

  // 登出
  const logout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      clearAuth();
      router.push('/auth/login');
    }
  };

  // 清除认证信息
  const clearAuth = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);

    // 清除 cookies
    document.cookie = 'access_token=; path=/; max-age=0';
    document.cookie = 'refresh_token=; path=/; max-age=0';
  };

  // 初始化时检查认证
  useEffect(() => {
    checkAuth();
  }, []);

  // 定期刷新令牌
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      await refreshTokens();
    }, 5 * 60 * 1000); // 每5分钟检查一次

    return () => clearInterval(interval);
  }, [user]);

  const value = {
    user,
    loading,
    login,
    logout,
    refreshTokens,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC: 保护需要认证的页面
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/auth/login');
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">加载中...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
}

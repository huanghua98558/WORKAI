'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, LoginRequest, User } from '@/lib/auth-service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从 localStorage 加载认证信息
  useEffect(() => {
    const loadAuth = () => {
      if (typeof window !== 'undefined') {
        const savedToken = localStorage.getItem('access_token');
        const savedRefreshToken = localStorage.getItem('refresh_token');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedUser) {
          setToken(savedToken);
          setRefreshToken(savedRefreshToken);
          setUser(JSON.parse(savedUser));
        }
      }
      setIsLoading(false);
    };

    loadAuth();
  }, []);

  // 验证 Token 有效性
  useEffect(() => {
    if (token && !user) {
      verifyToken();
    }
  }, [token]);

  // 验证 Token
  const verifyToken = async () => {
    try {
      const response = await authService.verifyToken(token!);
      if (response.success && response.data?.valid) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else {
        // Token 无效，尝试刷新
        refreshAccessToken();
      }
    } catch (error) {
      console.error('Token 验证失败:', error);
      clearAuth();
    }
  };

  // 登录
  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login({ username, password });

      if (response.success && response.data) {
        const { token: newToken, refreshToken: newRefreshToken, user: newUser } = response.data;

        setToken(newToken);
        setRefreshToken(newRefreshToken);
        setUser(newUser as any);

        // 保存到 localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', newToken);
          localStorage.setItem('refresh_token', newRefreshToken);
          localStorage.setItem('user', JSON.stringify(newUser));
        }

        return { success: true };
      } else {
        return { success: false, error: response.error || '登录失败' };
      }
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, error: '网络错误，请稍后重试' };
    }
  };

  // 登出
  const logout = async () => {
    try {
      if (token) {
        await authService.logout(token);
      }
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      clearAuth();
    }
  };

  // 清除认证信息
  const clearAuth = () => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  };

  // 刷新 Access Token
  const refreshAccessToken = async (): Promise<boolean> => {
    if (!refreshToken) {
      clearAuth();
      return false;
    }

    try {
      const response = await authService.refreshToken(refreshToken);

      if (response.success && response.data) {
        const { token: newToken, refreshToken: newRefreshToken } = response.data;

        setToken(newToken);
        setRefreshToken(newRefreshToken);

        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', newToken);
          localStorage.setItem('refresh_token', newRefreshToken);
        }

        return true;
      } else {
        clearAuth();
        return false;
      }
    } catch (error) {
      console.error('Token 刷新失败:', error);
      clearAuth();
      return false;
    }
  };

  // 自动刷新 Token（在过期前 5 分钟）
  useEffect(() => {
    if (!token || !user) return;

    const expiresIn = user.exp * 1000 - Date.now();
    const refreshTime = expiresIn - 5 * 60 * 1000; // 提前 5 分钟刷新

    if (refreshTime > 0) {
      const timer = setTimeout(() => {
        refreshAccessToken();
      }, refreshTime);

      return () => clearTimeout(timer);
    }
  }, [token, user]);

  const value: AuthContextType = {
    user,
    token,
    refreshToken,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    refreshAccessToken,
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

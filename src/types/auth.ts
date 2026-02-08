/**
 * 认证相关类型定义
 */

export interface User {
  id: string;
  username: string;
  email?: string;
  fullName?: string;
  role: 'superadmin' | 'admin' | 'operator';
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  lastActivityAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Session {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  ipAddress: string;
  location?: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface AuthResponse {
  user: User;
  session: Session;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}

export interface ApiError {
  code: number;
  message: string;
  error?: string;
}

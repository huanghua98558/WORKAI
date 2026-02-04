/**
 * 认证 API 服务
 */

// 使用 Next.js API 路由作为代理，避免 CORS 问题
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    refreshToken: string;
    user: {
      id: string;
      username: string;
      email: string;
      role: string;
      isActive: boolean;
    };
  };
  error?: string;
  code?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data?: {
    token: string;
    refreshToken: string;
  };
  error?: string;
  code?: string;
}

export interface User {
  userId: string;
  username: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface VerifyTokenResponse {
  success: boolean;
  data?: {
    valid: boolean;
    user: User;
    timestamp: string;
  };
}

class AuthService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    return data;
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    return data;
  }

  /**
   * 验证 Token
   */
  async verifyToken(token: string): Promise<VerifyTokenResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data;
  }

  /**
   * 登出
   */
  async logout(token: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data;
  }

  /**
   * 带认证的 API 请求
   */
  async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    token: string
  ): Promise<T> {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (response.status === 403) {
      throw new Error('FORBIDDEN');
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }
}

export const authService = new AuthService();

import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // 完全禁用日志输出
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // 禁用开发模式下的详细日志
  devIndicators: {
    buildActivity: false,
  },

  // 压缩优化输出
  compress: true,

  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
  // 添加代理配置：将后端 API 请求代理到 Fastify 服务器
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    return [
      {
        source: '/api/worktool/callback/:path*',
        destination: `${backendUrl}/api/worktool/callback/:path*`,
      },
      // 添加其他 API 路由的代理
      {
        source: '/api/:path((?!proxy).)*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

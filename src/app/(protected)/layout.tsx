'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // 检查是否已登录
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      // 验证 token 是否有效
      fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.code !== 0) {
            // Token 无效，跳转到登录页
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            router.push('/auth/login');
          }
        })
        .catch((error) => {
          console.error('Token 验证失败:', error);
          router.push('/auth/login');
        });
    };

    checkAuth();
  }, [router]);

  return <>{children}</>;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 协同分析页面（旧路由别名）
 * 重定向到新的协同分析页面
 */
export default function CollabAnalyticsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到新的协同分析页面
    router.replace('/collab');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"></div>
        <p className="mt-2 text-sm text-muted-foreground">正在跳转...</p>
      </div>
    </div>
  );
}

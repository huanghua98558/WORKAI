'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, ArrowRight, AlertCircle } from 'lucide-react';

export default function AIOldPage() {
  const router = useRouter();

  useEffect(() => {
    // 自动重定向到主页的AI模块（3秒后）
    const timer = setTimeout(() => {
      router.push('/#ai-module');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-2xl mx-auto border-yellow-200 bg-yellow-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="h-6 w-6" />
            页面已迁移
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-yellow-700">
            AI配置功能已迁移到主页的「AI 模块」标签页，这里的管理方式已被新的AI模块取代。
          </p>
          <div className="flex items-center gap-2 text-sm text-yellow-600">
            <span>💡 3秒后自动跳转，或者</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/#ai-module')}
              className="gap-2"
            >
              <Brain className="h-4 w-4" />
              立即前往 AI 模块
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

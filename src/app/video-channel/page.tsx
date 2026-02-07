'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Scan, CheckCircle, Cookie, Eye, AlertCircle, Loader2, RefreshCw, Clock } from 'lucide-react';

export default function VideoChannelConversionPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [qrcodeId, setQrcodeId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [loginStatus, setLoginStatus] = useState<'checking' | 'logged_in' | 'not_logged' | 'expired'>('not_logged');
  const [cookies, setCookies] = useState<any[]>([]);
  const [screenshots, setScreenshots] = useState<{
    shop?: string;
    assistant?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [userId] = useState('user_' + Date.now());

  // 倒计时效果
  useEffect(() => {
    if (remainingTime > 0 && step === 2 && loginStatus === 'checking') {
      const timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [remainingTime, step, loginStatus]);

  // 格式化剩余时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. 获取二维码
  const handleGetQrcode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/video-channel/qrcode', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setQrcode(data.qrcodeBase64);
        setQrcodeId(data.qrcodeId);
        setExpiresAt(new Date(data.expiresAt));
        setRemainingTime(data.remainingTime);
        setLoginStatus('checking');
        setStep(2);
        // 自动开始检测登录状态
        setTimeout(() => {
          handleCheckLogin();
        }, 3000);
      } else {
        setError(data.error || '获取二维码失败');
      }
    } catch (err: any) {
      setError(err.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  // 刷新二维码
  const handleRefreshQrcode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/video-channel/refresh-qrcode', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setQrcode(data.qrcodeBase64);
        setQrcodeId(data.qrcodeId);
        setExpiresAt(new Date(data.expiresAt));
        setRemainingTime(data.remainingTime);
        setLoginStatus('checking');
        // 重新开始检测登录状态
        setTimeout(() => {
          handleCheckLogin();
        }, 3000);
      } else {
        setError(data.error || '刷新二维码失败');
      }
    } catch (err: any) {
      setError(err.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  // 2. 检测登录状态（轮询）
  const handleCheckLogin = async () => {
    setLoginStatus('checking');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/video-channel/check-login?maxAttempts=20&interval=3000');
      const data = await response.json();

      if (data.success) {
        if (data.isLoggedIn) {
          setLoginStatus('logged_in');
          setCookies(data.cookies || []);
          setStep(3);
        } else if (data.qrcodeExpired) {
          setLoginStatus('expired');
          setError('二维码已过期，请点击刷新按钮重新获取二维码');
        } else {
          setLoginStatus('not_logged');
          setError('检测超时，请重新扫描二维码');
        }
      } else {
        setError(data.error || '检测登录状态失败');
        setLoginStatus('not_logged');
      }
    } catch (err: any) {
      setError(err.message || '请求失败');
      setLoginStatus('not_logged');
    } finally {
      setLoading(false);
    }
  };

  // 3. 提取Cookie
  const handleExtractCookies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/video-channel/extract-cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          cookies
        })
      });
      const data = await response.json();

      if (data.success) {
        setStep(4);
      } else {
        setError(data.error || '提取Cookie失败');
      }
    } catch (err: any) {
      setError(err.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  // 4. 人工审核
  const handleManualAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/video-channel/manual-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cookies
        })
      });
      const data = await response.json();

      if (data.success) {
        setScreenshots({
          shop: data.shopScreenshotBase64,
          assistant: data.assistantScreenshotBase64
        });
        setStep(5);
      } else {
        setError(data.error || '人工审核失败');
      }
    } catch (err: any) {
      setError(err.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const resetProcess = () => {
    setStep(1);
    setQrcode(null);
    setQrcodeId(null);
    setExpiresAt(null);
    setRemainingTime(0);
    setLoginStatus('not_logged');
    setCookies([]);
    setScreenshots({});
    setError(null);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">视频号兼职人员转化流程</h1>
          <p className="text-muted-foreground mt-2">
            通过自动化工具实现视频号小店的登录、Cookie提取和人工审核
          </p>
        </div>
        <Button onClick={resetProcess} variant="outline">
          重新开始
        </Button>
      </div>

      {/* 流程步骤 */}
      <div className="flex items-center justify-center gap-4 p-4 bg-card rounded-lg border">
        {[
          { id: 1, label: '获取二维码', icon: Scan },
          { id: 2, label: '检测登录', icon: CheckCircle },
          { id: 3, label: '提取Cookie', icon: Cookie },
          { id: 4, label: '人工审核', icon: Eye }
        ].map((s, index) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isCompleted = step > s.id;

          return (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 ${isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`p-3 rounded-full border-2 ${isActive ? 'border-primary bg-primary/10' : isCompleted ? 'border-green-600 bg-green-600/10' : 'border-muted'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium">{s.label}</span>
              </div>
              {index < 3 && <div className="w-16 h-0.5 bg-border mx-4" />}
            </div>
          );
        })}
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="process" className="space-y-4">
        <TabsList>
          <TabsTrigger value="process">转化流程</TabsTrigger>
          <TabsTrigger value="status">当前状态</TabsTrigger>
          <TabsTrigger value="api">API文档</TabsTrigger>
        </TabsList>

        <TabsContent value="process" className="space-y-4">
          {/* 步骤1：获取二维码 */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>步骤1：获取登录二维码</CardTitle>
                <CardDescription>点击下方按钮生成视频号小店登录二维码</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGetQrcode}
                  disabled={loading}
                  size="lg"
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  生成二维码
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 步骤2：显示二维码和检测登录 */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>步骤2：扫描二维码登录</CardTitle>
                    <CardDescription>请使用微信扫描下方二维码登录视频号小店</CardDescription>
                  </div>
                  {remainingTime > 0 && loginStatus === 'checking' && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      有效期: {formatTime(remainingTime)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  {qrcode && (
                    <div className="relative p-4 bg-white rounded-lg border">
                      <img
                        src={qrcode}
                        alt="登录二维码"
                        className="w-64 h-64"
                      />
                      {remainingTime === 0 && loginStatus !== 'logged_in' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <div className="text-white text-center">
                            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                            <p className="font-medium">二维码已过期</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {remainingTime > 0 && loginStatus === 'checking' && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在检测登录状态...
                  </div>
                )}

                {loginStatus === 'logged_in' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>登录成功</AlertTitle>
                    <AlertDescription>已成功登录，可以提取Cookie</AlertDescription>
                  </Alert>
                )}

                {loginStatus === 'expired' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>二维码已过期</AlertTitle>
                    <AlertDescription>请点击下方刷新按钮重新获取二维码</AlertDescription>
                  </Alert>
                )}

                {loginStatus === 'not_logged' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>登录失败</AlertTitle>
                    <AlertDescription>请重新扫描二维码</AlertDescription>
                  </Alert>
                )}

                {loginStatus !== 'logged_in' && (
                  <Button
                    onClick={handleRefreshQrcode}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <RefreshCw className="mr-2 h-4 w-4" />
                    刷新二维码
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* 步骤3：提取Cookie */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>步骤3：提取Cookie</CardTitle>
                <CardDescription>登录成功后，提取关键Cookie用于后续操作</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>已登录</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    已获取 {cookies.length} 个Cookie
                  </div>
                </div>

                <Button
                  onClick={handleExtractCookies}
                  disabled={loading}
                  size="lg"
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  提取Cookie
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 步骤4：人工审核 */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>步骤4：人工审核</CardTitle>
                <CardDescription>生成视频号小店和助手的页面截图供人工审核</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleManualAudit}
                  disabled={loading}
                  size="lg"
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  生成审核截图
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 步骤5：显示截图 */}
          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>步骤5：审核完成</CardTitle>
                <CardDescription>请检查以下截图，确认页面是否正常</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">视频号小店页面</h3>
                  {screenshots.shop && (
                    <img
                      src={screenshots.shop}
                      alt="视频号小店页面"
                      className="w-full border rounded-lg"
                    />
                  )}
                </div>

                <div>
                  <h3 className="font-medium mb-2">视频号助手页面</h3>
                  {screenshots.assistant && (
                    <img
                      src={screenshots.assistant}
                      alt="视频号助手页面"
                      className="w-full border rounded-lg"
                    />
                  )}
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>转化流程完成</AlertTitle>
                  <AlertDescription>
                    Cookie已提取，审核截图已生成，可以进行后续操作
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>当前状态</CardTitle>
              <CardDescription>查看当前流程的执行状态</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">当前步骤</div>
                  <div className="font-medium">步骤 {step}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">登录状态</div>
                  <div className="font-medium">
                    {loginStatus === 'logged_in' ? (
                      <Badge variant="default" className="bg-green-600">已登录</Badge>
                    ) : loginStatus === 'checking' ? (
                      <Badge variant="secondary">检测中</Badge>
                    ) : loginStatus === 'expired' ? (
                      <Badge variant="destructive">二维码过期</Badge>
                    ) : (
                      <Badge variant="outline">未登录</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Cookie数量</div>
                  <div className="font-medium">{cookies.length} 个</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">用户ID</div>
                  <div className="font-medium font-mono text-xs">{userId}</div>
                </div>
              </div>

              {qrcodeId && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">二维码ID</div>
                    <div className="font-medium font-mono text-xs">{qrcodeId}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">二维码状态</div>
                    <div className="font-medium">
                      {remainingTime > 0 ? (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          有效期: {formatTime(remainingTime)}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">已过期</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {cookies.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">关键Cookie列表</div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {cookies.map((cookie: any, index: number) => (
                      <div key={index} className="p-2 bg-muted rounded text-sm">
                        <div className="font-medium">{cookie.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {cookie.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API文档</CardTitle>
              <CardDescription>视频号自动化接口说明</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold">1. 获取二维码</h3>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                  <div className="text-muted-foreground">POST /api/video-channel/qrcode</div>
                </div>
                <p className="text-sm text-muted-foreground">
                  返回视频号小店登录二维码的base64编码图片，包含qrcodeId、expiresAt和remainingTime
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">2. 刷新二维码</h3>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                  <div className="text-muted-foreground">POST /api/video-channel/refresh-qrcode</div>
                </div>
                <p className="text-sm text-muted-foreground">
                  重新生成二维码，用于二维码过期后刷新
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">3. 检测登录状态</h3>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                  <div className="text-muted-foreground">GET /api/video-channel/check-login?maxAttempts=20&interval=3000</div>
                </div>
                <p className="text-sm text-muted-foreground">
                  轮询检测登录状态，maxAttempts为最大检测次数，interval为检测间隔（毫秒）。返回qrcodeExpired字段标识二维码是否过期
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">4. 检查二维码状态</h3>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                  <div className="text-muted-foreground">GET /api/video-channel/qrcode-status</div>
                </div>
                <p className="text-sm text-muted-foreground">
                  检查当前二维码是否过期，返回expired和remainingTime
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">5. 提取Cookie</h3>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                  <div className="text-muted-foreground">POST /api/video-channel/extract-cookies</div>
                  <div className="text-muted-foreground mt-2">Body: {`{ "userId": "...", "cookies": [...] }`}</div>
                </div>
                <p className="text-sm text-muted-foreground">
                  提取并保存关键Cookie，返回提取的Cookie数量
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">6. 人工审核</h3>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                  <div className="text-muted-foreground">POST /api/video-channel/manual-audit</div>
                  <div className="text-muted-foreground mt-2">Body: {`{ "cookies": [...] }`}</div>
                </div>
                <p className="text-sm text-muted-foreground">
                  使用Cookie访问视频号小店和助手页面，生成截图用于人工审核
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

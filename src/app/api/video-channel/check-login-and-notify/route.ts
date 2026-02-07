import { NextRequest, NextResponse } from 'next/server';

/**
 * 视频号登录检测和消息自动发送
 * POST /api/video-channel/check-login-and-notify
 *
 * 功能：
 * 1. 检测用户是否登录成功
 * 2. 无论成功还是失败，都发送消息给用户
 * 3. 如果登录成功，继续检测Cookie权限
 * 4. 更新用户状态
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数：userId'
      }, { status: 400 });
    }

    console.log('开始检测登录状态:', { userId });

    // 1. 获取用户信息
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    const userResponse = await fetch(`${backendUrl}/api/video-channel/user/${userId}`);
    const userResult = await userResponse.json();

    if (!userResult.success || !userResult.user) {
      return NextResponse.json({
        success: false,
        error: '获取用户信息失败'
      }, { status: 404 });
    }

    const user = userResult.user;

    // 2. 调用登录检测API
    const checkLoginResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/video-channel/check-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });

    const loginResult = await checkLoginResponse.json();

    if (!loginResult.success) {
      return NextResponse.json({
        success: false,
        error: '登录检测失败: ' + (loginResult.error || '未知错误')
      }, { status: 500 });
    }

    const isLoggedIn = loginResult.isLoggedIn;
    const qrcodeExpired = loginResult.qrcodeExpired;

    console.log('登录检测结果:', { userId, isLoggedIn, qrcodeExpired });

    // 3. 根据检测结果发送消息并更新状态
    if (isLoggedIn) {
      // 登录成功
      await fetch(`${backendUrl}/api/video-channel/user/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          status: 'logged_in'
        })
      });

      // 发送登录成功消息
      await fetch(`${backendUrl}/api/video-channel/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          robotId: user.robotId,
          messageType: 'login_success',
          templateCode: 'login_success',
          variables: {
            userName: user.userName
          }
        })
      });

      // 4. 检测Cookie权限
      const checkPermissionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/video-channel/check-permission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          cookies: loginResult.cookies
        })
      });

      const permissionResult = await checkPermissionResponse.json();

      if (permissionResult.success) {
        const { shopAccessible, assistantAccessible } = permissionResult;

        // 发送权限检测结果消息
        if (shopAccessible && assistantAccessible) {
          await fetch(`${backendUrl}/api/video-channel/send-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId,
              robotId: user.robotId,
              messageType: 'permission_ok',
              templateCode: 'permission_ok',
              variables: {
                userName: user.userName
              }
            })
          });
        } else if (shopAccessible || assistantAccessible) {
          const accessiblePages = shopAccessible ? '视频号小店' : '视频号助手';
          await fetch(`${backendUrl}/api/video-channel/send-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId,
              robotId: user.robotId,
              messageType: 'permission_partial',
              templateCode: 'permission_partial',
              variables: {
                userName: user.userName,
                accessiblePages
              }
            })
          });
        } else {
          await fetch(`${backendUrl}/api/video-channel/send-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId,
              robotId: user.robotId,
              messageType: 'permission_failed',
              templateCode: 'permission_failed',
              variables: {
                userName: user.userName
              }
            })
          });
        }

        // 保存Cookie记录
        await fetch(`${backendUrl}/api/video-channel/cookie`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            cookieData: loginResult.cookies,
            cookieCount: loginResult.cookies.length,
            shopAccessible,
            assistantAccessible,
            shopStatusCode: permissionResult.shopStatusCode,
            assistantStatusCode: permissionResult.assistantStatusCode,
            permissionStatus: (shopAccessible && assistantAccessible) ? 'full' : (shopAccessible || assistantAccessible) ? 'partial' : 'invalid'
          })
        });

        // 更新用户状态
        await fetch(`${backendUrl}/api/video-channel/user/update-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            status: 'extracting'
          })
        });

        return NextResponse.json({
          success: true,
          isLoggedIn: true,
          shopAccessible,
          assistantAccessible,
          message: '登录成功，权限检测完成'
        });
      }
    } else if (qrcodeExpired) {
      // 二维码过期
      await fetch(`${backendUrl}/api/video-channel/user/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          status: 'waiting_login'
        })
      });

      // 发送登录超时消息
      await fetch(`${backendUrl}/api/video-channel/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          robotId: user.robotId,
          messageType: 'login_timeout',
          templateCode: 'login_timeout',
          variables: {
            userName: user.userName
          }
        })
      });

      return NextResponse.json({
        success: true,
        isLoggedIn: false,
        qrcodeExpired: true,
        message: '二维码已过期，请重新生成'
      });
    } else {
      // 登录失败
      await fetch(`${backendUrl}/api/video-channel/user/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          status: 'waiting_login'
        })
      });

      // 发送登录失败消息
      await fetch(`${backendUrl}/api/video-channel/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          robotId: user.robotId,
          messageType: 'login_failed',
          templateCode: 'login_failed',
          variables: {
            userName: user.userName
          }
        })
      });

      return NextResponse.json({
        success: true,
        isLoggedIn: false,
        qrcodeExpired: false,
        message: '登录失败，请稍后重试'
      });
    }

    return NextResponse.json({
      success: true,
      message: '登录检测完成'
    });

  } catch (error: any) {
    console.error('登录检测和消息发送失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器内部错误'
    }, { status: 500 });
  }
}

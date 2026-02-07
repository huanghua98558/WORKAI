import { NextResponse } from 'next/server';

/**
 * 测试API - 返回模拟的会话数据
 * 用于验证前端是否能正确显示数据
 */
export async function GET() {
  const mockSessions = [
    {
      sessionId: 'test-session-001',
      userId: 'user-001',
      groupId: 'group-001',
      userName: '测试用户张三',
      groupName: '测试群组',
      robotId: 'robot-001',
      robotName: '客服机器人',
      robotNickname: '小助手',
      lastMessage: '你好，我有一个问题需要咨询',
      isFromUser: true,
      isFromBot: false,
      isHuman: false,
      lastActiveTime: new Date().toISOString(),
      startTime: new Date().toISOString(),
      messageCount: 5,
      userMessages: 3,
      aiReplyCount: 2,
      humanReplyCount: 0,
      replyCount: 2,
      lastIntent: 'service',
      status: 'auto',
    },
    {
      sessionId: 'test-session-002',
      userId: 'user-002',
      groupId: 'group-001',
      userName: '测试用户李四',
      groupName: '测试群组',
      robotId: 'robot-001',
      robotName: '客服机器人',
      robotNickname: '小助手',
      lastMessage: '我想了解一下产品价格',
      isFromUser: true,
      isFromBot: false,
      isHuman: false,
      lastActiveTime: new Date(Date.now() - 300000).toISOString(),
      startTime: new Date(Date.now() - 300000).toISOString(),
      messageCount: 2,
      userMessages: 1,
      aiReplyCount: 1,
      humanReplyCount: 0,
      replyCount: 1,
      lastIntent: 'inquiry',
      status: 'auto',
    },
    {
      sessionId: 'test-session-003',
      userId: 'user-003',
      groupId: 'group-002',
      userName: '测试用户王五',
      groupName: '技术支持群',
      robotId: 'robot-002',
      robotName: '技术机器人',
      robotNickname: '技术小助手',
      lastMessage: '系统报错了，请帮忙看看',
      isFromUser: true,
      isFromBot: false,
      isHuman: false,
      lastActiveTime: new Date(Date.now() - 600000).toISOString(),
      startTime: new Date(Date.now() - 600000).toISOString(),
      messageCount: 3,
      userMessages: 2,
      aiReplyCount: 1,
      humanReplyCount: 0,
      replyCount: 1,
      lastIntent: 'error',
      status: 'human',
    },
  ];

  return NextResponse.json({
    success: true,
    data: mockSessions,
  });
}

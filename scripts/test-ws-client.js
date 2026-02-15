#!/usr/bin/env node
/**
 * WebSocket 客户端测试脚本
 * 模拟 worktool 连接到 WebSocket 服务器
 */

import { io } from 'socket.io-client';

const WS_URL = process.env.WS_URL || 'ws://localhost:5002';
const WS_PATH = process.env.WS_PATH || '/ws';
const ROBOT_ID = process.env.ROBOT_ID || 'test-robot-001';

console.log('='.repeat(60));
console.log('🧪 WebSocket 客户端测试');
console.log('='.repeat(60));
console.log(`WebSocket URL: ${WS_URL}`);
console.log(`WebSocket Path: ${WS_PATH}`);
console.log(`Robot ID: ${ROBOT_ID}`);
console.log('='.repeat(60));

// 创建 WebSocket 连接
const socket = io(WS_URL, {
  path: WS_PATH,
  transports: ['websocket', 'polling'],
});

// 连接事件
socket.on('connect', () => {
  console.log('\n✅ WebSocket 连接成功');
  console.log(`Socket ID: ${socket.id}`);

  // 注册机器人
  console.log(`\n📤 发送注册请求: ${ROBOT_ID}`);
  socket.emit('register', { robotId: ROBOT_ID });
});

// 连接成功响应
socket.on('connected', (data) => {
  console.log('\n📥 收到连接确认:', JSON.stringify(data, null, 2));
});

// 机器人信息
socket.on('robotInfo', (data) => {
  console.log('\n📥 收到机器人信息:', JSON.stringify(data, null, 2));

  // 发送测试消息
  console.log('\n📤 发送测试消息...');
  socket.emit('message', {
    robotId: ROBOT_ID,
    roomName: '测试群',
    senderName: '测试用户',
    content: '你好，这是一条测试消息',
    messageType: 1,
    roomType: 4,
  });
});

// 收到命令
socket.on('command', (data) => {
  console.log('\n📥 收到命令:', JSON.stringify(data, null, 2));
});

// 心跳响应
socket.on('pong', (data) => {
  console.log('\n📥 收到心跳响应:', JSON.stringify(data));
});

// 执行命令
socket.on('execute_command', (data) => {
  console.log('\n📥 收到执行命令:', JSON.stringify(data, null, 2));
});

// 错误处理
socket.on('error', (error) => {
  console.error('\n❌ WebSocket 错误:', error);
});

// 断开连接
socket.on('disconnect', (reason) => {
  console.log('\n🔴 WebSocket 断开连接:', reason);
});

// 10秒后断开
setTimeout(() => {
  console.log('\n⏰ 测试完成，断开连接...');
  socket.disconnect();
  process.exit(0);
}, 10000);

console.log('\n⏳ 等待连接...');

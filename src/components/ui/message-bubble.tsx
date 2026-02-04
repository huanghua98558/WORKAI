'use client';

import React from 'react';
import { User, Bot, UserCheck } from 'lucide-react';

export interface MessageBubbleProps {
  /** 消息内容 */
  content: string;
  /** 是否来自用户 */
  isFromUser: boolean;
  /** 是否来自人工客服 */
  isHuman?: boolean;
  /** 时间戳 */
  timestamp: string;
  /** 显示模式：'list' 表示列表视图（简短格式），'detail' 表示详情视图（完整格式） */
  displayMode?: 'list' | 'detail';
  /** 用户名 */
  userName?: string;
  /** 机器人名称 */
  robotName?: string;
  /** 人工客服名称 */
  operatorName?: string;
  /** 额外的类名 */
  className?: string;
  /** 消息意图（可选） */
  intent?: string;
  /** 意图标签的渲染函数（可选） */
  renderIntentBadge?: (intent: string) => React.ReactNode;
}

/**
 * 通用的消息气泡组件
 * 
 * 使用示例：
 * ```tsx
 * // 列表视图
 * <MessageBubble
 *   content="你好，有什么可以帮助你？"
 *   isFromUser={false}
 *   timestamp="2025-01-15T14:30:45Z"
 *   displayMode="list"
 *   robotName="客服机器人"
 * />
 * 
 * // 详情视图
 * <MessageBubble
 *   content="我需要查询订单"
 *   isFromUser={true}
 *   timestamp="2025-01-15T14:30:45Z"
 *   displayMode="detail"
 *   userName="张三"
 *   intent="order_query"
 * />
 * ```
 */
export function MessageBubble({
  content,
  isFromUser,
  isHuman = false,
  timestamp,
  displayMode = 'list',
  userName,
  robotName,
  operatorName,
  className = '',
  intent,
  renderIntentBadge
}: MessageBubbleProps) {
  const formatTime = (ts: string, mode: 'list' | 'detail') => {
    const date = new Date(ts);
    
    if (mode === 'list') {
      // 列表格式：MM-DD HH:mm
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      // 详情格式：完整格式，包含秒
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  };

  // 根据消息来源确定样式
  const getBubbleStyle = () => {
    if (isFromUser) {
      return {
        containerClass: 'justify-end',
        bubbleClass: 'bg-blue-500 text-white rounded-br-sm',
        textClass: 'text-white'
      };
    } else if (isHuman) {
      return {
        containerClass: 'justify-start',
        bubbleClass: 'bg-orange-100 dark:bg-orange-900/30 rounded-bl-sm',
        textClass: 'text-foreground'
      };
    } else {
      return {
        containerClass: 'justify-start',
        bubbleClass: 'bg-gray-100 dark:bg-gray-800 rounded-bl-sm',
        textClass: 'text-foreground'
      };
    }
  };

  // 根据消息来源确定图标和名称
  const getSenderInfo = () => {
    if (isFromUser) {
      return {
        icon: <User className="h-4 w-4 inline mr-1.5" />,
        name: userName || '用户'
      };
    } else if (isHuman) {
      return {
        icon: <UserCheck className="h-4 w-4 inline mr-1.5 text-orange-600 dark:text-orange-400" />,
        name: operatorName || '人工客服'
      };
    } else {
      return {
        icon: <Bot className="h-4 w-4 inline mr-1.5 text-green-600 dark:text-green-400" />,
        name: robotName || 'AI'
      };
    }
  };

  const { containerClass, bubbleClass, textClass } = getBubbleStyle();
  const { icon, name } = getSenderInfo();

  return (
    <div className={`flex ${containerClass} ${className}`}>
      <div className={`max-w-[80%] ${bubbleClass} rounded-2xl p-4`}>
        {/* 发送者信息和时间 */}
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className={`text-sm font-bold ${textClass}`}>
            {icon}
            {name}
          </span>
          <span className="text-xs opacity-70">
            {formatTime(timestamp, displayMode)}
          </span>
        </div>

        {/* 消息内容 */}
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>

        {/* 意图标签（可选） */}
        {intent && renderIntentBadge && (
          <div className="mt-2">
            {renderIntentBadge(intent)}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;

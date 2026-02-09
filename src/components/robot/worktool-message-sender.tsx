'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { workToolApi } from '@/services/worktool-api-service';
import { Send, Loader2, Image, Video, MessageSquare } from 'lucide-react';

interface WorkToolMessageSenderProps {
  /** 机器人 ID */
  robotId: string;
  /** 接收者姓名（可选，会话中可以自动填充） */
  toName?: string;
  /** 群组名称（可选，用于发送群消息） */
  groupName?: string;
  /** 发送成功回调 */
  onSendSuccess?: () => void;
  /** 发送失败回调 */
  onSendError?: (error: string) => void;
}

/**
 * WorkTool 消息发送组件
 * 用于向企业微信用户发送消息
 */
export default function WorkToolMessageSender({
  robotId,
  toName: propToName = '',
  groupName = '',
  onSendSuccess,
  onSendError
}: WorkToolMessageSenderProps) {
  const [toName, setToName] = useState(propToName);
  const [messageType, setMessageType] = useState('1');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!toName.trim()) {
      toast.error('请输入接收者姓名');
      return;
    }

    if (!content.trim()) {
      toast.error('请输入消息内容');
      return;
    }

    setSending(true);

    try {
      await workToolApi.sendMessage({
        robotId,
        toName: toName.trim(),
        content: content.trim(),
        messageType: parseInt(messageType),
      });

      toast.success('消息发送成功');
      setContent('');

      if (onSendSuccess) {
        onSendSuccess();
      }
    } catch (error: any) {
      const errorMessage = error.message || '发送消息失败';
      toast.error(errorMessage);

      if (onSendError) {
        onSendError(errorMessage);
      }
    } finally {
      setSending(false);
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case '1':
        return <MessageSquare className="h-4 w-4" />;
      case '2':
        return <Image className="h-4 w-4" />;
      case '3':
        return <Video className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case '1':
        return '文本';
      case '2':
        return '图片';
      case '3':
        return '视频';
      default:
        return '文本';
    }
  };

  return (
    <div className="space-y-4">
      {/* 接收者 */}
      <div className="space-y-2">
        <Label htmlFor="toName">接收者姓名</Label>
        <Input
          id="toName"
          placeholder="请输入接收者姓名"
          value={toName}
          onChange={(e) => setToName(e.target.value)}
          disabled={sending}
        />
        {groupName && (
          <p className="text-xs text-muted-foreground">
            当前群组: {groupName}
          </p>
        )}
      </div>

      {/* 消息类型 */}
      <div className="space-y-2">
        <Label htmlFor="messageType">消息类型</Label>
        <Select value={messageType} onValueChange={setMessageType} disabled={sending}>
          <SelectTrigger id="messageType">
            <SelectValue placeholder="选择消息类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">
              <div className="flex items-center gap-2">
                {getMessageTypeIcon('1')}
                <span>{getMessageTypeLabel('1')}</span>
              </div>
            </SelectItem>
            <SelectItem value="2">
              <div className="flex items-center gap-2">
                {getMessageTypeIcon('2')}
                <span>{getMessageTypeLabel('2')}</span>
              </div>
            </SelectItem>
            <SelectItem value="3">
              <div className="flex items-center gap-2">
                {getMessageTypeIcon('3')}
                <span>{getMessageTypeLabel('3')}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 消息内容 */}
      <div className="space-y-2">
        <Label htmlFor="content">消息内容</Label>
        <Textarea
          id="content"
          placeholder="请输入消息内容"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={sending}
          rows={4}
        />
      </div>

      {/* 发送按钮 */}
      <Button onClick={handleSend} disabled={sending} className="w-full">
        {sending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            发送中...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            发送消息
          </>
        )}
      </Button>
    </div>
  );
}

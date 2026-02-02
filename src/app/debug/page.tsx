'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  MessageSquare,
  Users,
  FileText,
  Send,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState('message');
  
  // 发送消息相关状态
  const [messageForm, setMessageForm] = useState({
    messageType: 'private', // private 或 group
    recipient: '',
    content: ''
  });
  const [messageResult, setMessageResult] = useState<any>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // 群操作相关状态
  const [groupForm, setGroupForm] = useState({
    groupName: '',
    operationType: 'create', // create, modify, dismiss
    newGroupName: '',
    members: ''
  });
  const [groupResult, setGroupResult] = useState<any>(null);
  const [isDoingGroupOperation, setIsDoingGroupOperation] = useState(false);

  // 推送文件相关状态
  const [fileForm, setFileForm] = useState({
    recipient: '',
    fileType: 'image', // image, audio, video, other
    fileName: '',
    fileUrl: '',
    remark: ''
  });
  const [fileResult, setFileResult] = useState<any>(null);
  const [isPushingFile, setIsPushingFile] = useState(false);

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!messageForm.recipient || !messageForm.content) {
      alert('请填写接收方和消息内容');
      return;
    }

    setIsSendingMessage(true);
    setMessageResult(null);

    try {
      const res = await fetch('/api/proxy/admin/debug/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageForm)
      });

      const data = await res.json();
      setMessageResult(data);
    } catch (error) {
      setMessageResult({
        success: false,
        message: '请求失败：网络错误'
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // 处理群操作
  const handleGroupOperation = async () => {
    if (!groupForm.groupName) {
      alert('请填写群名称');
      return;
    }

    setIsDoingGroupOperation(true);
    setGroupResult(null);

    try {
      const res = await fetch('/api/proxy/admin/debug/group-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupForm)
      });

      const data = await res.json();
      setGroupResult(data);
    } catch (error) {
      setGroupResult({
        success: false,
        message: '请求失败：网络错误'
      });
    } finally {
      setIsDoingGroupOperation(false);
    }
  };

  // 处理推送文件
  const handlePushFile = async () => {
    if (!fileForm.recipient || !fileForm.fileUrl) {
      alert('请填写接收方和文件 URL');
      return;
    }

    setIsPushingFile(true);
    setFileResult(null);

    try {
      const res = await fetch('/api/proxy/admin/debug/push-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileForm)
      });

      const data = await res.json();
      setFileResult(data);
    } catch (error) {
      setFileResult({
        success: false,
        message: '请求失败：网络错误'
      });
    } finally {
      setIsPushingFile(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      <div className="container mx-auto p-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TestTube className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            机器人调试功能
          </h1>
          <p className="text-muted-foreground mt-2">
            测试机器人的各种功能，包括发送消息、群操作和推送文件
          </p>
        </div>

        {/* 调试功能标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="message" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              发送消息
            </TabsTrigger>
            <TabsTrigger value="group" className="gap-2">
              <Users className="h-4 w-4" />
              群操作
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-2">
              <FileText className="h-4 w-4" />
              推送文件
            </TabsTrigger>
          </TabsList>

          {/* 发送消息功能 */}
          <TabsContent value="message">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  发送消息测试
                </CardTitle>
                <CardDescription className="text-blue-100">
                  测试机器人发送私聊或群聊消息功能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="messageType">发送类型</Label>
                    <Select
                      value={messageForm.messageType}
                      onValueChange={(value) => setMessageForm({ ...messageForm, messageType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">私聊</SelectItem>
                        <SelectItem value="group">群聊</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="recipient">接收方（填名字，机器人会自动搜索）</Label>
                    <Input
                      id="recipient"
                      placeholder={messageForm.messageType === 'private' ? '输入好友昵称' : '输入群名称'}
                      value={messageForm.recipient}
                      onChange={(e) => setMessageForm({ ...messageForm, recipient: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">消息内容</Label>
                    <Textarea
                      id="content"
                      placeholder="输入要发送的消息内容..."
                      value={messageForm.content}
                      onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleSendMessage}
                    disabled={isSendingMessage}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isSendingMessage ? (
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

                {/* 发送结果 */}
                {messageResult && (
                  <Alert
                    variant={messageResult.success ? 'default' : 'destructive'}
                    className={messageResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}
                  >
                    {messageResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle className="font-medium">
                      {messageResult.success ? '发送成功' : '发送失败'}
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      {messageResult.message}
                      {messageResult.data && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(messageResult.data, null, 2)}
                        </pre>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 群操作功能 */}
          <TabsContent value="group">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  群操作测试
                </CardTitle>
                <CardDescription className="text-purple-100">
                  测试机器人的创建、修改或解散群功能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertTitle className="text-yellow-800 dark:text-yellow-200 text-sm">提示</AlertTitle>
                  <AlertDescription className="text-yellow-700 dark:text-yellow-300 text-xs">
                    请确保填写的群名称准确，机器人会自动搜索匹配的群
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="operationType">操作类型</Label>
                    <Select
                      value={groupForm.operationType}
                      onValueChange={(value) => setGroupForm({ ...groupForm, operationType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="create">创建群</SelectItem>
                        <SelectItem value="modify">修改群</SelectItem>
                        <SelectItem value="dismiss">解散群</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="groupName">群名称（填名字，机器人会自动搜索）</Label>
                    <Input
                      id="groupName"
                      placeholder="输入群名称"
                      value={groupForm.groupName}
                      onChange={(e) => setGroupForm({ ...groupForm, groupName: e.target.value })}
                    />
                  </div>

                  {groupForm.operationType === 'modify' && (
                    <div>
                      <Label htmlFor="newGroupName">新群名称</Label>
                      <Input
                        id="newGroupName"
                        placeholder="输入新的群名称"
                        value={groupForm.newGroupName}
                        onChange={(e) => setGroupForm({ ...groupForm, newGroupName: e.target.value })}
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleGroupOperation}
                    disabled={isDoingGroupOperation}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isDoingGroupOperation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        执行中...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        {groupForm.operationType === 'create' ? '创建群' : 
                         groupForm.operationType === 'modify' ? '修改群' : '解散群'}
                      </>
                    )}
                  </Button>
                </div>

                {/* 操作结果 */}
                {groupResult && (
                  <Alert
                    variant={groupResult.success ? 'default' : 'destructive'}
                    className={groupResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}
                  >
                    {groupResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle className="font-medium">
                      {groupResult.success ? '操作成功' : '操作失败'}
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      {groupResult.message}
                      {groupResult.data && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(groupResult.data, null, 2)}
                        </pre>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 推送文件功能 */}
          <TabsContent value="file">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  推送文件测试
                </CardTitle>
                <CardDescription className="text-green-100">
                  测试机器人推送图片、音频、视频等文件功能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fileRecipient">接收方（填名字，机器人会自动搜索）</Label>
                    <Input
                      id="fileRecipient"
                      placeholder="输入好友昵称或群名称"
                      value={fileForm.recipient}
                      onChange={(e) => setFileForm({ ...fileForm, recipient: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fileType">文件类型</Label>
                    <Select
                      value={fileForm.fileType}
                      onValueChange={(value) => setFileForm({ ...fileForm, fileType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">图片</SelectItem>
                        <SelectItem value="audio">音频</SelectItem>
                        <SelectItem value="video">视频</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fileName">文件名称</Label>
                    <Input
                      id="fileName"
                      placeholder="输入文件名称（可选）"
                      value={fileForm.fileName}
                      onChange={(e) => setFileForm({ ...fileForm, fileName: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fileUrl">文件 URL</Label>
                    <Input
                      id="fileUrl"
                      placeholder="输入文件的 URL 地址"
                      value={fileForm.fileUrl}
                      onChange={(e) => setFileForm({ ...fileForm, fileUrl: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="remark">备注</Label>
                    <Textarea
                      id="remark"
                      placeholder="输入备注信息（可选）"
                      value={fileForm.remark}
                      onChange={(e) => setFileForm({ ...fileForm, remark: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handlePushFile}
                    disabled={isPushingFile}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isPushingFile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        推送中...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        推送文件
                      </>
                    )}
                  </Button>
                </div>

                {/* 推送结果 */}
                {fileResult && (
                  <Alert
                    variant={fileResult.success ? 'default' : 'destructive'}
                    className={fileResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}
                  >
                    {fileResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle className="font-medium">
                      {fileResult.success ? '推送成功' : '推送失败'}
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      {fileResult.message}
                      {fileResult.data && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(fileResult.data, null, 2)}
                        </pre>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

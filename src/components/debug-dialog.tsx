'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface DebugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DebugDialog({ open, onOpenChange }: DebugDialogProps) {
  const [activeTab, setActiveTab] = useState('message');
  
  // 发送消息相关状态
  const [messageForm, setMessageForm] = useState({
    messageType: 'private',
    recipient: '',
    content: ''
  });
  const [messageResult, setMessageResult] = useState<any>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // 群操作相关状态
  const [groupForm, setGroupForm] = useState({
    groupName: '',
    operationType: 'create',
    newGroupName: '',
    selectList: '',
    removeList: '',
    groupAnnouncement: '',
    groupRemark: '',
    showMessageHistory: false,
    groupTemplate: ''
  });
  const [groupResult, setGroupResult] = useState<any>(null);
  const [isDoingGroupOperation, setIsDoingGroupOperation] = useState(false);

  // 推送文件相关状态
  const [fileForm, setFileForm] = useState({
    recipient: '',
    fileType: 'image',
    fileName: '',
    fileUrl: '',
    remark: ''
  });
  const [fileResult, setFileResult] = useState<any>(null);
  const [isPushingFile, setIsPushingFile] = useState(false);

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

  const handleGroupOperation = async () => {
    if (!groupForm.groupName) {
      alert('请填写群名称');
      return;
    }
    setIsDoingGroupOperation(true);
    setGroupResult(null);
    try {
      const selectListArray = groupForm.selectList 
        ? groupForm.selectList.split(',').map(s => s.trim()).filter(s => s)
        : [];
      const removeListArray = groupForm.removeList
        ? groupForm.removeList.split(',').map(s => s.trim()).filter(s => s)
        : [];
      const res = await fetch('/api/proxy/admin/debug/group-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationType: groupForm.operationType,
          groupName: groupForm.groupName,
          newGroupName: groupForm.newGroupName,
          selectList: selectListArray,
          removeList: removeListArray,
          groupAnnouncement: groupForm.groupAnnouncement,
          groupRemark: groupForm.groupRemark,
          showMessageHistory: groupForm.showMessageHistory,
          groupTemplate: groupForm.groupTemplate
        })
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            调试功能
          </DialogTitle>
          <DialogDescription>
            测试机器人的各种功能，包括发送消息、群操作和推送文件
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
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

          <TabsContent value="message">
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  发送消息测试
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3">
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
                    <Label htmlFor="recipient">接收方</Label>
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
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="group">
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  群操作测试
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertTitle className="text-yellow-800 dark:text-yellow-200 text-sm">提示</AlertTitle>
                  <AlertDescription className="text-yellow-700 dark:text-yellow-300 text-xs">
                    请确保填写的群名称准确，机器人会自动搜索匹配的群
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
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
                    <Label htmlFor="groupName">群名称</Label>
                    <Input
                      id="groupName"
                      placeholder="输入群名称"
                      value={groupForm.groupName}
                      onChange={(e) => setGroupForm({ ...groupForm, groupName: e.target.value })}
                    />
                  </div>

                  {groupForm.operationType === 'create' && (
                    <>
                      <div>
                        <Label htmlFor="selectList">拉入群成员（用逗号分隔）</Label>
                        <Input
                          id="selectList"
                          placeholder="成员1,成员2,成员3"
                          value={groupForm.selectList}
                          onChange={(e) => setGroupForm({ ...groupForm, selectList: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="groupAnnouncement">群公告</Label>
                        <Textarea
                          id="groupAnnouncement"
                          placeholder="输入群公告"
                          value={groupForm.groupAnnouncement}
                          onChange={(e) => setGroupForm({ ...groupForm, groupAnnouncement: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="groupRemark">群备注</Label>
                        <Input
                          id="groupRemark"
                          placeholder="输入群备注"
                          value={groupForm.groupRemark}
                          onChange={(e) => setGroupForm({ ...groupForm, groupRemark: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {groupForm.operationType === 'modify' && (
                    <>
                      <div>
                        <Label htmlFor="newGroupName">新群名称</Label>
                        <Input
                          id="newGroupName"
                          placeholder="输入新的群名称"
                          value={groupForm.newGroupName}
                          onChange={(e) => setGroupForm({ ...groupForm, newGroupName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="selectList">添加成员（用逗号分隔）</Label>
                        <Input
                          id="selectList"
                          placeholder="成员1,成员2,成员3"
                          value={groupForm.selectList}
                          onChange={(e) => setGroupForm({ ...groupForm, selectList: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="removeList">移除成员（用逗号分隔）</Label>
                        <Input
                          id="removeList"
                          placeholder="成员1,成员2,成员3"
                          value={groupForm.removeList}
                          onChange={(e) => setGroupForm({ ...groupForm, removeList: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="groupAnnouncement">修改群公告</Label>
                        <Textarea
                          id="groupAnnouncement"
                          placeholder="输入新的群公告"
                          value={groupForm.groupAnnouncement}
                          onChange={(e) => setGroupForm({ ...groupForm, groupAnnouncement: e.target.value })}
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={handleGroupOperation}
                    disabled={isDoingGroupOperation}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isDoingGroupOperation ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="file">
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  推送文件测试
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="fileRecipient">接收方</Label>
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
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

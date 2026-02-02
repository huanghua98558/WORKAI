'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle,
  Activity,
  Clock,
  Search,
  TestTube,
  Bot
} from 'lucide-react';

interface DebugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExecutionRecord {
  processingId: string;
  robotId: string;
  status: string;
  startTime: string;
  completedAt?: string;
  processingTime?: number;
  messageData?: any;
  steps: {
    [key: string]: {
      status: string;
      startTime?: number;
      endTime?: number;
      result?: any;
    };
  };
  decision?: any;
  error?: string;
}

export default function DebugDialog({ open, onOpenChange }: DebugDialogProps) {
  // 辅助函数：格式化处理时间
  const formatProcessingTime = (ms: number | undefined): string => {
    if (!ms || ms < 0) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  // 机器人选择相关状态
  const [availableRobots, setAvailableRobots] = useState<any[]>([]);
  const [selectedRobot, setSelectedRobot] = useState<any>(null);
  const [showRobotSelection, setShowRobotSelection] = useState(true);
  const [isLoadingRobots, setIsLoadingRobots] = useState(false);

  const [activeTab, setActiveTab] = useState('message');

  // 加载机器人列表
  const loadRobots = async () => {
    setIsLoadingRobots(true);
    try {
      const res = await fetch('/api/proxy/admin/robots');
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0) {
          const robots = data.data || [];
          // 只显示启用的机器人
          const activeRobots = robots.filter((r: any) => r.isActive);
          setAvailableRobots(activeRobots);

          // 如果只有一个在线机器人，自动选择
          if (activeRobots.length === 1) {
            setSelectedRobot(activeRobots[0]);
            setShowRobotSelection(false);
          } else if (activeRobots.length === 0) {
            // 没有可用机器人
            setSelectedRobot(null);
            setShowRobotSelection(false);
          }
        }
      }
    } catch (error) {
      console.error('加载机器人列表失败:', error);
    } finally {
      setIsLoadingRobots(false);
    }
  };

  // 当Dialog打开时加载机器人列表
  useEffect(() => {
    if (open) {
      loadRobots();
      setActiveTab('message');
      setShowRobotSelection(true);
      setSelectedRobot(null);
    }
  }, [open]);

  // 选择机器人
  const handleSelectRobot = (robot: any) => {
    setSelectedRobot(robot);
    setShowRobotSelection(false);
    // 更新消息表单中的 robotId
    setMessageForm(prev => ({
      ...prev,
      robotId: robot.robotId
    }));
  };

  // 返回机器人选择界面
  const handleBackToRobotSelection = () => {
    setShowRobotSelection(true);
    setSelectedRobot(null);
  };
  
  // 发送消息相关状态
  const [messageForm, setMessageForm] = useState({
    messageType: 'private',
    robotId: '',
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

  // 执行结果追踪相关状态
  const [executionRecords, setExecutionRecords] = useState<ExecutionRecord[]>([]);
  const [executionStats, setExecutionStats] = useState<any>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<ExecutionRecord | null>(null);

  // 加载执行记录
  const loadExecutionRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const response = await fetch('/api/proxy/admin/execution?endpoint=records&limit=50');
      const data = await response.json();
      if (data.success) {
        setExecutionRecords(data.data || []);
      }
    } catch (error) {
      console.error('加载执行记录失败:', error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // 加载执行统计
  const loadExecutionStats = async () => {
    try {
      const response = await fetch('/api/proxy/admin/execution?endpoint=stats');
      const data = await response.json();
      if (data.success) {
        setExecutionStats(data.data);
      }
    } catch (error) {
      console.error('加载执行统计失败:', error);
    }
  };

  // 搜索执行记录
  const searchExecutionRecords = async (query: string) => {
    if (!query.trim()) {
      loadExecutionRecords();
      return;
    }
    setIsLoadingRecords(true);
    try {
      const response = await fetch(`/api/proxy/admin/execution?endpoint=search&q=${encodeURIComponent(query)}&limit=20`);
      const data = await response.json();
      if (data.success) {
        setExecutionRecords(data.data || []);
      }
    } catch (error) {
      console.error('搜索执行记录失败:', error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // 加载执行记录详情
  const loadExecutionDetail = async (processingId: string) => {
    try {
      const response = await fetch(`/api/proxy/admin/execution?endpoint=detail/${processingId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedRecord(data.data);
      }
    } catch (error) {
      console.error('加载执行详情失败:', error);
    }
  };

  // 当切换到执行结果标签页时加载数据
  useEffect(() => {
    if (activeTab === 'execution') {
      loadExecutionRecords();
      loadExecutionStats();
    }
  }, [activeTab]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      searchExecutionRecords(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendMessage = async () => {
    if (!messageForm.recipient || !messageForm.content) {
      alert('请填写接收方和消息内容');
      return;
    }
    if (!messageForm.robotId) {
      alert('请先选择机器人');
      return;
    }
    setIsSendingMessage(true);
    setMessageResult(null);
    try {
      const res = await fetch('/api/proxy/admin/debug/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robotId: messageForm.robotId,
          messageType: messageForm.messageType,
          recipient: messageForm.recipient,
          content: messageForm.content
        })
      });
      const data = await res.json();
      setMessageResult(data);
      // 发送成功后刷新执行记录
      if (activeTab === 'execution') {
        loadExecutionRecords();
      }
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

      if (!messageForm.robotId) {
        alert('请先选择机器人');
        return;
      }

      const res = await fetch('/api/proxy/admin/debug/group-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robotId: messageForm.robotId,
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
    if (!messageForm.robotId) {
      alert('请先选择机器人');
      return;
    }
    setIsPushingFile(true);
    setFileResult(null);
    try {
      const res = await fetch('/api/proxy/admin/debug/push-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robotId: messageForm.robotId,
          ...fileForm
        })
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* 机器人选择界面 */}
        {showRobotSelection && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <TestTube className="h-6 w-6" />
                选择调试机器人
              </DialogTitle>
              <DialogDescription>
                选择要调试的机器人进行功能测试
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {isLoadingRobots ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                    <p className="text-sm text-muted-foreground mt-2">加载机器人列表...</p>
                  </div>
                </div>
              ) : availableRobots.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>没有可用的机器人</AlertTitle>
                  <AlertDescription>
                    请先在"机器人管理"页面添加并启用机器人，然后重试。
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {availableRobots.map((robot) => (
                    <Card
                      key={robot.id}
                      className="cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all border-2"
                      onClick={() => handleSelectRobot(robot)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                            <Bot className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1">{robot.name}</h3>
                            <p className="text-sm text-muted-foreground font-mono mb-2">{robot.robotId}</p>
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant={robot.status === 'online' ? 'default' : 'secondary'} className="gap-1">
                                {robot.status === 'online' ? (
                                  <>
                                    <CheckCircle className="h-3 w-3" />
                                    在线
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3" />
                                    离线
                                  </>
                                )}
                              </Badge>
                              {robot.nickname && (
                                <span className="text-xs text-muted-foreground">{robot.nickname}</span>
                              )}
                            </div>
                            {robot.description && (
                              <p className="text-xs text-muted-foreground">{robot.description}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* 调试功能界面 */}
        {!showRobotSelection && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    <TestTube className="h-6 w-6" />
                    调试功能
                  </DialogTitle>
                  {selectedRobot && (
                    <div className="mt-2 flex items-center gap-3">
                      <Badge variant="outline" className="gap-1">
                        <Bot className="h-3 w-3" />
                        {selectedRobot.name}
                      </Badge>
                      <Badge variant={selectedRobot.status === 'online' ? 'default' : 'secondary'} className="gap-1">
                        {selectedRobot.status === 'online' ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            在线
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            离线
                          </>
                        )}
                      </Badge>
                      {availableRobots.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBackToRobotSelection}
                          className="text-xs"
                        >
                          切换机器人
                        </Button>
                      )}
                    </div>
                  )}
                  <DialogDescription>
                    测试机器人的各种功能，包括发送消息、群操作和推送文件
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {!selectedRobot && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>未选择机器人</AlertTitle>
                <AlertDescription>
                  没有可用的机器人。请先在"机器人管理"页面添加并启用机器人。
                </AlertDescription>
              </Alert>
            )}

            {selectedRobot && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
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
                  <TabsTrigger value="execution" className="gap-2">
                    <Activity className="h-4 w-4" />
                    执行结果
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
                {/* 当前选择的机器人 */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">
                        {selectedRobot ? selectedRobot.name : '未选择机器人'}
                      </span>
                      {selectedRobot && (
                        <Badge variant="outline" className="text-xs">{selectedRobot.robotId}</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleBackToRobotSelection}
                      className="text-xs"
                    >
                      切换机器人
                    </Button>
                  </div>
                </div>

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

          <TabsContent value="execution">
            <div className="space-y-4">
              {/* 统计卡片 */}
              {executionStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">总处理数</div>
                      <div className="text-2xl font-bold">{executionStats.total || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">成功率</div>
                      <div className="text-2xl font-bold text-green-600">{executionStats.successRate || '0'}%</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">自动回复</div>
                      <div className="text-2xl font-bold text-blue-600">{executionStats.autoReply || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">错误数</div>
                      <div className="text-2xl font-bold text-red-600">{executionStats.error || 0}</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 搜索框 */}
              <div className="flex gap-2">
                <Input
                  placeholder="搜索执行记录..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => loadExecutionRecords()} variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* 执行记录列表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">最近执行记录</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingRecords ? (
                    <div className="text-center py-8 text-gray-500">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                      加载中...
                    </div>
                  ) : executionRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      暂无执行记录
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {executionRecords.map((record) => (
                        <div
                          key={record.processingId}
                          className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          onClick={() => loadExecutionDetail(record.processingId)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {record.status === 'success' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : record.status === 'error' ? (
                                <XCircle className="h-5 w-5 text-red-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-blue-600" />
                              )}
                              <span className="text-sm font-medium">
                                {record.status === 'success' ? '成功' : record.status === 'error' ? '失败' : '处理中'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatProcessingTime(record.processingTime)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(record.startTime).toLocaleString('zh-CN')}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {record.messageData?.spoken || record.messageData?.content || '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 执行详情 */}
              {selectedRecord && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">执行详情</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">处理ID</div>
                        <div className="font-mono text-xs">{selectedRecord.processingId}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">状态</div>
                        <div className="font-medium">
                          {selectedRecord.status === 'success' ? '成功' : selectedRecord.status === 'error' ? '失败' : '处理中'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">开始时间</div>
                        <div>{new Date(selectedRecord.startTime).toLocaleString('zh-CN')}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">完成时间</div>
                        <div>{selectedRecord.completedAt ? new Date(selectedRecord.completedAt).toLocaleString('zh-CN') : '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">处理时间</div>
                        <div className="font-medium">{formatProcessingTime(selectedRecord.processingTime)}</div>
                      </div>
                    </div>

                    {selectedRecord.error && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>错误信息</AlertTitle>
                        <AlertDescription>{selectedRecord.error}</AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <div className="text-sm font-medium mb-2">处理步骤</div>
                      <div className="space-y-2">
                        {Object.entries(selectedRecord.steps || {}).map(([stepName, step]: [string, any]) => (
                          <div key={stepName} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              {step.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                              {step.status === 'processing' && <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />}
                              {step.status === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                              <span className="font-medium text-sm">{stepName}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {step.startTime && step.endTime ? `耗时: ${step.endTime - step.startTime}ms` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedRecord.decision && (
                      <div>
                        <div className="text-sm font-medium mb-2">决策结果</div>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
                          {JSON.stringify(selectedRecord.decision, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
              </Tabs>
          )}
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}

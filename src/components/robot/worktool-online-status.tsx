'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { workToolApi } from '@/services/worktool-api-service';
import { RefreshCw, Clock, UserCircle, AlertCircle } from 'lucide-react';

interface RobotStatusInfo {
  /** 机器人 ID */
  robotId: string;
  /** 在线状态 */
  isOnline: boolean;
  /** 状态更新时间 */
  lastOnlineTime?: number;
  /** 状态描述 */
  statusMessage?: string;
}

interface WorkToolOnlineStatusProps {
  /** 机器人 ID */
  robotId: string;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 是否自动刷新 */
  autoRefresh?: boolean;
  /** 自动刷新间隔（毫秒） */
  refreshInterval?: number;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * WorkTool 在线状态组件
 * 用于显示机器人的在线状态
 */
export default function WorkToolOnlineStatus({
  robotId,
  showDetails = false,
  autoRefresh = false,
  refreshInterval = 30000,
  className = ''
}: WorkToolOnlineStatusProps) {
  const [status, setStatus] = useState<RobotStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await workToolApi.getOnlineStatus(robotId);

      setStatus({
        robotId,
        isOnline: response.isOnline,
        lastOnlineTime: Date.now(),
        statusMessage: response.isOnline ? '在线' : '离线'
      });
    } catch (error: any) {
      console.error('获取机器人状态失败:', error);
      setStatus({
        robotId,
        isOnline: false,
        lastOnlineTime: Date.now(),
        statusMessage: '状态未知'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    if (autoRefresh) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [robotId, autoRefresh, refreshInterval]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '未知';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="text-muted-foreground">
          加载中...
        </Badge>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="text-muted-foreground">
          无状态信息
        </Badge>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 状态徽章 */}
      <div className="flex items-center gap-2">
        {status.isOnline ? (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            在线
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600">
            离线
          </Badge>
        )}

        {autoRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="space-y-2 text-sm text-muted-foreground">
          {status.lastOnlineTime && (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span>更新时间: {formatTimestamp(status.lastOnlineTime)}</span>
            </div>
          )}

          {!status.isOnline && (
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span>机器人当前离线，无法发送消息</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

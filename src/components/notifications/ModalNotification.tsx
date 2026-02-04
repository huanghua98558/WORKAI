'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNotifications } from './NotificationProvider';

export function ModalNotification() {
  const { currentAlert, clearCurrentAlert, preferences } = useNotifications();

  // 只有Critical级别且启用了Modal才显示
  if (!currentAlert || currentAlert.level !== 'critical' || !preferences.modalEnabled) {
    return null;
  }

  return (
    <Dialog open={!!currentAlert} onOpenChange={() => clearCurrentAlert()}>
      <DialogContent className="max-w-md border-red-500 border-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <span className="text-2xl">🚨</span>
            <span>紧急告警</span>
          </DialogTitle>
          <DialogDescription className="text-base">
            {currentAlert.type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-900 font-medium">{currentAlert.description}</p>
          </div>

          {currentAlert.robotName && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">机器人:</span> {currentAlert.robotName}
            </div>
          )}

          <div className="text-sm text-gray-500">
            <span className="font-medium">时间:</span>{' '}
            {new Date(currentAlert.triggerTime).toLocaleString('zh-CN')}
          </div>

          {currentAlert.recipientCount !== undefined && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">已通知人数:</span> {currentAlert.recipientCount}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => clearCurrentAlert()} className="bg-red-600 hover:bg-red-700">
            我知道了
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

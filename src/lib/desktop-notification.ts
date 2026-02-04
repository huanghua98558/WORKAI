/**
 * 桌面通知服务
 * 使用 Web Notification API
 */

interface DesktopNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  onClick?: () => void;
  onClose?: () => void;
}

export class DesktopNotificationService {
  private permission: NotificationPermission = 'default';
  private notifications: Map<string, Notification> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('[DesktopNotification] 当前浏览器不支持通知 API');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  /**
   * 检查权限状态
   */
  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  /**
   * 发送桌面通知
   */
  async send(options: DesktopNotificationOptions): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('[DesktopNotification] 当前浏览器不支持通知 API');
      return false;
    }

    if (this.permission !== 'granted') {
      console.warn('[DesktopNotification] 未授予通知权限');
      return false;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/notification.png',
        badge: options.badge,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        tag: options.tag,
      });

      // 点击事件
      if (options.onClick) {
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }

      // 关闭事件
      if (options.onClose) {
        notification.onclose = () => {
          options.onClose?.();
        };
      }

      // 存储通知引用
      const tag = options.tag || Date.now().toString();
      this.notifications.set(tag, notification);

      // 自动清理
      notification.onclose = () => {
        this.notifications.delete(tag);
        options.onClose?.();
      };

      return true;
    } catch (error) {
      console.error('[DesktopNotification] 发送通知失败:', error);
      return false;
    }
  }

  /**
   * 关闭指定通知
   */
  close(tag: string): void {
    const notification = this.notifications.get(tag);
    if (notification) {
      notification.close();
      this.notifications.delete(tag);
    }
  }

  /**
   * 关闭所有通知
   */
  closeAll(): void {
    this.notifications.forEach((notification) => {
      notification.close();
    });
    this.notifications.clear();
  }

  /**
   * 获取活动通知数量
   */
  getActiveCount(): number {
    return this.notifications.size;
  }
}

// 导出单例
export const desktopNotificationService = new DesktopNotificationService();

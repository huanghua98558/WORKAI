'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api-client';

interface AvatarUploadProps {
  currentAvatar?: string;
  username?: string;
  onAvatarChange: (avatarUrl: string) => void;
}

export default function AvatarUpload({ currentAvatar, username, onAvatarChange }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('不支持的文件类型，仅支持 JPG、PNG、WebP、GIF');
      return;
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError('文件大小超过限制，最大允许 5MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      // 创建 FormData
      const formData = new FormData();
      formData.append('avatar', file);

      // 上传头像
      const response = await fetch('/api/avatar/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.code === 0) {
        onAvatarChange(result.data.avatarUrl);
      } else {
        setError(result.message || '上传失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('上传头像失败:', err);
    } finally {
      setUploading(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除头像吗？')) {
      return;
    }

    setUploading(true);

    try {
      await api.post('/avatar/delete', {});

      onAvatarChange('');
    } catch (err) {
      setError('删除失败');
      console.error('删除头像失败:', err);
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
          <AvatarImage src={currentAvatar} alt={username} />
          <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {getInitials(username)}
          </AvatarFallback>
        </Avatar>

        {/* 上传按钮 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full">
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleFileSelect}
              disabled={uploading}
              className="rounded-full"
            >
              {currentAvatar ? <Upload className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </Button>

            {currentAvatar && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={uploading}
                className="rounded-full"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <Alert variant="destructive" className="w-full max-w-xs">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!currentAvatar && !uploading && (
        <p className="text-sm text-muted-foreground">
          点击上传头像（支持 JPG、PNG、WebP、GIF，最大 5MB）
        </p>
      )}

      {currentAvatar && (
        <p className="text-xs text-muted-foreground">
          头像链接有效期 7 天，过期后系统会自动刷新
        </p>
      )}
    </div>
  );
}

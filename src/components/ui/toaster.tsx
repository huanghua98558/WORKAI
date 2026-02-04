'use client';

import { useToast } from '@/hooks/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, variant }) {
        return (
          <Toast key={id} variant={variant}>
            <div className="flex items-start gap-3">
              {variant === 'destructive' && (
                <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              )}
              {variant === 'default' && (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

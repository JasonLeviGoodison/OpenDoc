'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onOpenChange, title, description, children, className, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-2xl data-[state=open]:animate-fade-in',
            {
              'w-full max-w-sm': size === 'sm',
              'w-full max-w-md': size === 'md',
              'w-full max-w-lg': size === 'lg',
              'w-full max-w-2xl': size === 'xl',
            },
            className
          )}
        >
          {(title || description) && (
            <div className="px-6 py-4 border-b border-border">
              {title && <Dialog.Title className="text-lg font-semibold text-foreground">{title}</Dialog.Title>}
              {description && <Dialog.Description className="text-sm text-muted-foreground mt-1">{description}</Dialog.Description>}
            </div>
          )}
          <div className="px-6 py-4">
            {children}
          </div>
          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors cursor-pointer">
              <X size={18} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

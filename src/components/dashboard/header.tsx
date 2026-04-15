'use client';

import { UserButton } from '@clerk/nextjs';
import { Search } from 'lucide-react';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-8 sticky top-0 z-30 bg-background">
      <div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {actions}

        <div className="w-56">
          <Input
            placeholder="Search..."
            icon={<Search size={15} />}
          />
        </div>

        <NotificationBell />

        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8',
            },
          }}
        />
      </div>
    </header>
  );
}

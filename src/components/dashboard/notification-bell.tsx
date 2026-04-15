'use client';

import * as Popover from '@radix-ui/react-popover';
import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { apiFetchJson } from '@/lib/api-client';
import type { Notification, NotificationsResponse } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

function getUnreadCountLabel(unreadCount: number) {
  if (unreadCount > 99) {
    return '99+';
  }

  return String(unreadCount);
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadCountLabel = getUnreadCountLabel(unreadCount);

  async function loadNotifications() {
    setLoading(true);

    try {
      const response = await apiFetchJson<NotificationsResponse>('/api/notifications');
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function markNotificationAsRead(notificationId: string) {
    const notification = notifications.find((entry) => entry.id === notificationId);

    if (!notification || notification.read) {
      return;
    }

    setNotifications((currentNotifications) =>
      currentNotifications.map((entry) =>
        entry.id === notificationId
          ? {
              ...entry,
              read: true,
            }
          : entry,
      ),
    );
    setUnreadCount((currentUnreadCount) => Math.max(0, currentUnreadCount - 1));

    try {
      await apiFetchJson<Notification>(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
      });
    } catch (error) {
      console.error('Failed to mark notification as read', error);
      await loadNotifications();
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) {
      return;
    }

    setMarkingAllRead(true);
    setNotifications((currentNotifications) =>
      currentNotifications.map((entry) => ({
        ...entry,
        read: true,
      })),
    );
    setUnreadCount(0);

    try {
      await apiFetchJson<{ success: boolean }>('/api/notifications/mark-all-read', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
      await loadNotifications();
    } finally {
      setMarkingAllRead(false);
    }
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
          void loadNotifications();
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-muted hover:bg-card-hover hover:text-foreground transition-colors cursor-pointer"
          type="button"
        >
          <Bell size={18} />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {unreadCountLabel}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-50 w-[360px] rounded-2xl border border-border bg-card p-0 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
          sideOffset={12}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread
              </p>
            </div>

            <Button
              disabled={markingAllRead || unreadCount === 0}
              onClick={() => {
                void handleMarkAllRead();
              }}
              size="sm"
              variant="ghost"
            >
              <CheckCheck size={14} />
              Mark all read
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center px-4 py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-accent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                New document activity will appear here.
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-card-hover cursor-pointer',
                    !notification.read && 'bg-accent-muted/30',
                  )}
                  onClick={() => {
                    void markNotificationAsRead(notification.id);
                  }}
                  type="button"
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2.5 w-2.5 flex-none rounded-full',
                      notification.read ? 'bg-border' : 'bg-accent',
                    )}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      <p className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {notification.created_at ? formatDateTime(notification.created_at) : ''}
                      </p>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';

import {
  useMarkAllReadMutation,
  useMarkReadMutation,
  useNotificationsQuery,
} from '../api/queries';
import type { NotificationDTO } from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

interface NotificationItemProps {
  item: NotificationDTO;
  onRead: (id: number) => void;
}

function NotificationItem({ item, onRead }: NotificationItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors hover:bg-gray-50',
        !item.is_read && 'bg-indigo-50/60 hover:bg-indigo-50',
      )}
      onClick={() => { if (!item.is_read) onRead(item.id); }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn('text-sm font-medium text-gray-800', !item.is_read && 'text-indigo-700')}>
          {item.title}
        </span>
        {!item.is_read && (
          <span className="mt-1 shrink-0 size-1.5 rounded-full bg-indigo-500" />
        )}
      </div>
      <p className="text-xs text-gray-500 leading-snug">{item.body}</p>
      <span className="text-[10px] text-gray-400 mt-0.5">{timeAgo(item.created_at)}</span>
    </button>
  );
}

interface NotificationBellProps {
  /** 다크 배경(사이드바)용이면 true */
  dark?: boolean;
}

export function NotificationBell({ dark = false }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data } = useNotificationsQuery();
  const { mutate: markRead } = useMarkReadMutation();
  const { mutate: markAll } = useMarkAllReadMutation();

  const items = data?.items ?? [];
  const unread = data?.unread_count ?? 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative',
            dark
              ? 'size-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10'
              : 'size-9 rounded-xl hover:bg-gray-100',
          )}
          aria-label="알림"
        >
          <Bell className={dark ? 'size-4' : 'size-5 text-gray-600'} />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-4 text-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">
            알림 {unread > 0 && <span className="text-indigo-600">({unread})</span>}
          </span>
          {unread > 0 && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
              onClick={() => markAll()}
            >
              <CheckCheck className="size-3.5" />
              모두 읽음
            </button>
          )}
        </div>

        {/* 목록 */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              새로운 알림이 없습니다.
            </div>
          ) : (
            items.map((item) => (
              <NotificationItem
                key={item.id}
                item={item}
                onRead={(id) => markRead(id)}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

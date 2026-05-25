import { Calendar, MessageSquare, User } from 'lucide-react';

import { formatRelativeTime } from '../../model/formatData';

import type { BoardPost } from '../../model/boardType';

import { Card, CardHeader, CardContent, CardFooter } from '@/shared/components/ui/card';

const _STRIP_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
function stripMarkdown(text: string): string {
  return text.replace(_STRIP_RE, '').replace(/\n{3,}/g, '\n\n').trim();
}

interface BoardCardProps<T extends BoardPost> {
  item: T;
  onClick: () => void;
  badge?: React.ReactNode;
}

export function BoardCard<T extends BoardPost>({ item, badge, onClick }: BoardCardProps<T>) {
  return (
    <div onClick={onClick} className="block focus:outline-none focus:ring-2 focus:ring-mega">
      <Card className="py-4 px-5 gap-3 transition hover:shadow-md hover:bg-gray-100 cursor-pointer">
        <CardHeader className="p-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            {badge} {item.title}
          </div>
        </CardHeader>

        <CardContent className="p-0 max-w-2/3">
          <p className="text-xs text-gray-600 line-clamp-2">{stripMarkdown(item.content)}</p>
        </CardContent>

        <CardFooter className="p-0 flex items-center gap-4 text-[10px] text-gray-400">
          <div className="flex gap-1">
            <User size={15} />
            <span> {item.author_name}</span>
          </div>
          <div className="flex gap-1">
            <Calendar size={15} />
            <span>{formatRelativeTime(item.created_at)}</span>
          </div>
          <div className="flex gap-1">
            <MessageSquare size={15} />
            {item.comments_count != null && <span>{item.comments_count}</span>}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

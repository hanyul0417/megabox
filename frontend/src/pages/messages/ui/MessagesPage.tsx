import { Mail, Plus, Send, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { MessageCreateDTO, MessageResponse, UserSearchResultDTO } from '@/features/message';

import { getPositionBadgeStyle } from '@/entities/user/model/position';
import {
  useDeleteMessageMutation,
  useInboxQuery,
  useOutboxQuery,
  useSendMessageMutation,
  useSearchUsersQuery,
  useUnreadCountQuery,
} from '@/features/message';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

/* ── 상대시간 헬퍼 ─────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

/* ── 직급 배지 ─────────────────────────────────────── */
function PositionBadge({ position }: { position: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
        getPositionBadgeStyle(position),
      )}
    >
      {position}
    </span>
  );
}

/* ── 받은함 메시지 카드 ──────────────────────────────── */
function InboxCard({ msg, onClick }: { msg: MessageResponse; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm',
        msg.is_read
          ? 'border-gray-100 bg-white'
          : 'border-l-4 border-l-indigo-400 border-t border-r border-b border-gray-100 bg-indigo-50/30',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {!msg.is_read && <span className="size-2 rounded-full bg-indigo-500 shrink-0" />}
        <span className="text-sm font-medium text-gray-800 truncate">{msg.sender_name}</span>
        <PositionBadge position={msg.sender_position} />
        <span className="ml-auto text-xs text-gray-400 shrink-0">{timeAgo(msg.created_at)}</span>
      </div>
      <p
        className={cn(
          'text-sm truncate',
          msg.is_read ? 'text-gray-500' : 'font-semibold text-gray-800',
        )}
      >
        {msg.title}
      </p>
    </button>
  );
}

/* ── 보낸함 메시지 카드 ──────────────────────────────── */
function OutboxCard({ msg, onClick }: { msg: MessageResponse; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl border border-gray-100 bg-white transition-all hover:shadow-sm"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-gray-800 truncate">{msg.receiver_name}</span>
        <PositionBadge position={msg.receiver_position} />
        <span
          className={cn(
            'ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium',
            msg.is_read ? 'text-gray-400 bg-gray-100' : 'text-indigo-600 bg-indigo-50',
          )}
        >
          {msg.is_read ? '읽음' : '미읽음'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-500 truncate flex-1">{msg.title}</p>
        <span className="text-xs text-gray-400 shrink-0">{timeAgo(msg.created_at)}</span>
      </div>
    </button>
  );
}

/* ── 쪽지 상세 Dialog ────────────────────────────────── */
function MessageDetailDialog({
  message,
  open,
  onOpenChange,
  onDelete,
}: {
  message: MessageResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: number) => void;
}) {
  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{message.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 pt-1">
              <span>
                보낸 사람: {message.sender_name}
                <PositionBadge position={message.sender_position} />
              </span>
              <span className="text-gray-300">|</span>
              <span>
                받는 사람: {message.receiver_name}
                <PositionBadge position={message.receiver_position} />
              </span>
              <span className="text-gray-300">|</span>
              <span>{new Date(message.created_at).toLocaleString('ko-KR')}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 px-1 min-h-[100px] whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
          {message.content}
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(message.id)}
            className="gap-1"
          >
            <Trash2 className="size-4" />
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── 수신자 검색 컴포넌트 ────────────────────────────── */
function ReceiverSearchInput({
  selected,
  onSelect,
  onClear,
}: {
  selected: UserSearchResultDTO | null;
  onSelect: (user: UserSearchResultDTO) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const { data: results = [] } = useSearchUsersQuery(query);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
          <span className="font-medium text-indigo-700">{selected.name}</span>
          <PositionBadge position={selected.position} />
          <button
            type="button"
            onClick={onClear}
            className="ml-1 text-indigo-400 hover:text-indigo-600"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        placeholder="이름으로 검색..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
      />
      {showDropdown && query.length >= 1 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">검색 결과가 없습니다.</div>
          ) : (
            results.map((user) => (
              <button
                key={user.id}
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                onClick={() => {
                  onSelect(user);
                  setQuery('');
                  setShowDropdown(false);
                }}
              >
                <span className="text-sm font-medium text-gray-800">{user.name}</span>
                <PositionBadge position={user.position} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── 쪽지 쓰기 Dialog ───────────────────────────────── */
function ComposeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [receiver, setReceiver] = useState<UserSearchResultDTO | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { mutate: send, isPending } = useSendMessageMutation();

  const handleSubmit = useCallback(() => {
    if (!receiver) return;
    const data: MessageCreateDTO = {
      receiver_id: receiver.id,
      title: title.trim(),
      content: content.trim(),
    };
    send(data, {
      onSuccess: () => {
        onOpenChange(false);
        setReceiver(null);
        setTitle('');
        setContent('');
      },
    });
  }, [receiver, title, content, send, onOpenChange]);

  const isValid = receiver !== null && title.trim().length > 0 && content.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-4" />
            쪽지 쓰기
          </DialogTitle>
          <DialogDescription>수신자를 검색하고 쪽지를 보내세요.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">받는 사람</label>
            <ReceiverSearchInput
              selected={receiver}
              onSelect={setReceiver}
              onClear={() => setReceiver(null)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">제목</label>
            <Input
              placeholder="쪽지 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">내용</label>
            <Textarea
              placeholder="내용을 입력하세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isPending} className="gap-1">
            <Send className="size-4" />
            {isPending ? '전송 중...' : '보내기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── 빈 상태 ─────────────────────────────────────────── */
function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Mail className="size-12 mb-3 stroke-1" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────── */
export default function MessagesPage() {
  const { data: inbox = [], isLoading: inboxLoading } = useInboxQuery();
  const { data: outbox = [], isLoading: outboxLoading } = useOutboxQuery();
  const { data: unreadData } = useUnreadCountQuery();
  const { mutate: deleteMsg } = useDeleteMessageMutation();

  const [selectedMsg, setSelectedMsg] = useState<MessageResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const unreadCount = unreadData?.count ?? 0;

  const handleCardClick = (msg: MessageResponse) => {
    setSelectedMsg(msg);
    setDetailOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMsg(id, {
      onSuccess: () => {
        setDetailOpen(false);
        setSelectedMsg(null);
      },
    });
  };

  return (
    <div className="px-4 py-6 lg:px-8 max-w-3xl mx-auto space-y-6">
      {/* 헤더 */}
      <PageHeader
        icon={<Mail className="size-5 text-indigo-600" />}
        iconBg="bg-indigo-100"
        title="쪽지함"
        description="1:1 쪽지를 주고받을 수 있습니다."
      >
        <Button onClick={() => setComposeOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          쪽지 쓰기
        </Button>
      </PageHeader>

      {/* 탭 */}
      <Tabs defaultValue="inbox">
        <TabsList className="w-full">
          <TabsTrigger value="inbox" className="flex-1 gap-1.5">
            받은 쪽지
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="h-5 min-w-[20px] px-1 text-[10px] rounded-full"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="outbox" className="flex-1">
            보낸 쪽지
          </TabsTrigger>
        </TabsList>

        {/* 받은함 */}
        <TabsContent value="inbox">
          {inboxLoading ? (
            <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
          ) : inbox.length === 0 ? (
            <EmptyState text="받은 쪽지가 없습니다." />
          ) : (
            <div className="space-y-2 mt-3">
              {inbox.map((msg) => (
                <InboxCard key={msg.id} msg={msg} onClick={() => handleCardClick(msg)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* 보낸함 */}
        <TabsContent value="outbox">
          {outboxLoading ? (
            <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
          ) : outbox.length === 0 ? (
            <EmptyState text="보낸 쪽지가 없습니다." />
          ) : (
            <div className="space-y-2 mt-3">
              {outbox.map((msg) => (
                <OutboxCard key={msg.id} msg={msg} onClick={() => handleCardClick(msg)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 상세 모달 */}
      <MessageDetailDialog
        message={selectedMsg}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDelete={handleDelete}
      />

      {/* 쓰기 모달 */}
      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  );
}

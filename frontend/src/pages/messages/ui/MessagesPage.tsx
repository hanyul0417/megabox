import { Mail, Plus, Reply, Search, Send, Trash2, Users, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { MessageCreateDTO, MessageResponse, UserSearchResultDTO } from '@/features/message';

import { getAvatarBg, getPositionBadgeStyle } from '@/entities/user/model/position';
import {
  useContactsQuery,
  useDeleteMessageMutation,
  useInboxQuery,
  useOpenMessageMutation,
  useOutboxQuery,
  useSearchUsersQuery,
  useSendMessageMutation,
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

/* ── 상대시간 ──────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

/* ── 직급 배지 ─────────────────────────────────────────── */
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

/* ── 직원 아바타 ───────────────────────────────────────── */
function UserAvatar({ name, position, size = 'md' }: { name: string; position: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'size-7 text-xs' : 'size-9 text-sm';
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold shrink-0',
        sizeClass,
        getAvatarBg(position),
      )}
    >
      {name[0]}
    </div>
  );
}

/* ── 받은함 카드 ─────────────────────────────────────────── */
function InboxCard({ msg, onClick }: { msg: MessageResponse; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3.5 rounded-xl border transition-all hover:shadow-sm',
        msg.is_read
          ? 'border-gray-100 bg-white hover:bg-gray-50/60'
          : 'border-l-4 border-l-indigo-400 border-t border-r border-b border-gray-100 bg-indigo-50/30',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {!msg.is_read && <span className="size-1.5 rounded-full bg-indigo-500 shrink-0" />}
        <UserAvatar name={msg.sender_name} position={msg.sender_position} size="sm" />
        <span className="text-sm font-semibold text-gray-800 truncate">{msg.sender_name}</span>
        <PositionBadge position={msg.sender_position} />
        <span className="ml-auto text-xs text-gray-400 shrink-0">{timeAgo(msg.created_at)}</span>
      </div>
      <p className={cn('text-xs truncate pl-[28px]', msg.is_read ? 'text-gray-400' : 'text-gray-600')}>
        {msg.content}
      </p>
    </button>
  );
}

/* ── 보낸함 카드 ─────────────────────────────────────────── */
function OutboxCard({ msg, onClick }: { msg: MessageResponse; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 rounded-xl border border-gray-100 bg-white transition-all hover:bg-gray-50/60 hover:shadow-sm"
    >
      <div className="flex items-center gap-2 mb-1">
        <UserAvatar name={msg.receiver_name} position={msg.receiver_position} size="sm" />
        <span className="text-sm font-semibold text-gray-800 truncate">{msg.receiver_name}</span>
        <PositionBadge position={msg.receiver_position} />
        <span
          className={cn(
            'ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
            msg.is_read ? 'text-gray-400 bg-gray-100' : 'text-indigo-600 bg-indigo-50',
          )}
        >
          {msg.is_read ? '읽음' : '미읽음'}
        </span>
      </div>
      <div className="flex items-center gap-2 pl-[28px]">
        <p className="text-xs text-gray-400 truncate flex-1">{msg.content}</p>
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
  onReply,
}: {
  message: MessageResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: number) => void;
  onReply: (receiver: UserSearchResultDTO) => void;
}) {
  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4 text-indigo-500" />
            쪽지
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="text-gray-400 text-xs">보낸 사람</span>
                <span className="font-medium text-gray-700">{message.sender_name}</span>
                <PositionBadge position={message.sender_position} />
              </span>
              <span className="text-gray-300">→</span>
              <span className="flex items-center gap-1.5">
                <span className="text-gray-400 text-xs">받는 사람</span>
                <span className="font-medium text-gray-700">{message.receiver_name}</span>
                <PositionBadge position={message.receiver_position} />
              </span>
              <span className="w-full text-xs text-gray-400">
                {new Date(message.created_at).toLocaleString('ko-KR')}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 px-1 min-h-[80px] whitespace-pre-wrap text-sm text-gray-700 leading-relaxed border-t border-gray-100">
          {message.content}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onReply({
                id: message.sender_id,
                name: message.sender_name,
                position: message.sender_position,
              })
            }
            className="gap-1.5 rounded-xl"
          >
            <Reply className="size-4" />
            답장
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(message.id)}
            className="gap-1.5 rounded-xl"
          >
            <Trash2 className="size-4" />
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── 수신자 검색 인풋 ─────────────────────────────────── */
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
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm w-fit">
        <span className="font-medium text-indigo-700">{selected.name}</span>
        <PositionBadge position={selected.position} />
        <button type="button" onClick={onClear} className="ml-1 text-indigo-400 hover:text-indigo-600">
          <X className="size-3.5" />
        </button>
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
        className="rounded-xl"
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
  initialReceiver,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReceiver?: UserSearchResultDTO | null;
}) {
  const [receiver, setReceiver] = useState<UserSearchResultDTO | null>(null);
  const [content, setContent] = useState('');
  const { mutate: send, isPending } = useSendMessageMutation();

  useEffect(() => {
    if (open) {
      setReceiver(initialReceiver ?? null);
      setContent('');
    }
  }, [open, initialReceiver]);

  const handleSubmit = useCallback(() => {
    if (!receiver || !content.trim()) return;
    const data: MessageCreateDTO = { receiver_id: receiver.id, content: content.trim() };
    send(data, { onSuccess: () => onOpenChange(false) });
  }, [receiver, content, send, onOpenChange]);

  const isValid = receiver !== null && content.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
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
            <label className="text-sm font-medium text-gray-700">내용</label>
            <Textarea
              placeholder="내용을 입력하세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none rounded-xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="gap-1.5 rounded-xl"
          >
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
    <div className="flex flex-col items-center justify-center py-14 text-gray-400">
      <Mail className="size-10 mb-3 stroke-1" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ── 직원 목록 패널 ──────────────────────────────────── */
function ContactsPanel({ onCompose }: { onCompose: (receiver: UserSearchResultDTO) => void }) {
  const { data: contacts = [], isLoading } = useContactsQuery();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? contacts.filter((c) => c.name.includes(search.trim()))
    : contacts;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      {/* 패널 헤더 */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Users className="size-3.5 text-indigo-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">직원 목록</h3>
          {contacts.length > 0 && (
            <span className="ml-auto text-xs text-gray-400">{contacts.length}명</span>
          )}
        </div>
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="이름 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 transition"
          />
        </div>
      </div>

      {/* 직원 리스트 */}
      <div className="flex-1 overflow-y-auto py-1.5" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {isLoading ? (
          <div className="py-8 text-center text-xs text-gray-400">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            {search ? '검색 결과가 없습니다.' : '직원이 없습니다.'}
          </div>
        ) : (
          filtered.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => onCompose(contact)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-indigo-50/60 transition-colors group"
            >
              <UserAvatar name={contact.name} position={contact.position} size="sm" />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-800 truncate">{contact.name}</span>
                  <PositionBadge position={contact.position} />
                </div>
              </div>
              <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 font-medium">
                쪽지
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────── */
export default function MessagesPage() {
  const { data: inbox = [], isLoading: inboxLoading } = useInboxQuery();
  const { data: outbox = [], isLoading: outboxLoading } = useOutboxQuery();
  const { data: unreadData } = useUnreadCountQuery();
  const { mutate: deleteMsg } = useDeleteMessageMutation();
  const { mutate: openMessage } = useOpenMessageMutation();

  const [selectedMsg, setSelectedMsg] = useState<MessageResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyReceiver, setReplyReceiver] = useState<UserSearchResultDTO | null>(null);

  const unreadCount = unreadData?.count ?? 0;

  const handleInboxClick = (msg: MessageResponse) => {
    setSelectedMsg(msg);
    setDetailOpen(true);
    if (!msg.is_read) {
      openMessage(msg.id, { onSuccess: (updated) => setSelectedMsg(updated) });
    }
  };

  const handleOutboxClick = (msg: MessageResponse) => {
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

  const handleReply = (receiver: UserSearchResultDTO) => {
    setDetailOpen(false);
    setReplyReceiver(receiver);
    setComposeOpen(true);
  };

  const handleComposeOpen = (receiver?: UserSearchResultDTO) => {
    setReplyReceiver(receiver ?? null);
    setComposeOpen(true);
  };

  const handleComposeClose = (open: boolean) => {
    setComposeOpen(open);
    if (!open) setReplyReceiver(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 헤더 */}
      <PageHeader
        icon={<Mail className="size-5 text-mega" />}
        iconBg="bg-mega/10"
        title="쪽지함"
        description="1:1 쪽지를 주고받을 수 있습니다."
      >
        <Button onClick={() => handleComposeOpen()} className="gap-1.5 rounded-xl">
          <Plus className="size-4" />
          쪽지 쓰기
        </Button>
      </PageHeader>

      {/* 2열 레이아웃 (PC) / 단열 (모바일) */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">
        {/* 왼쪽: 직원 목록 패널 (PC만 표시) */}
        <div className="hidden lg:block">
          <ContactsPanel onCompose={handleComposeOpen} />
        </div>

        {/* 오른쪽: 쪽지함 탭 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <Tabs defaultValue="inbox">
            {/* 탭 헤더 */}
            <div className="px-4 pt-4 pb-0 border-b border-gray-100">
              <TabsList className="w-full bg-gray-100/70 rounded-xl p-1 h-auto gap-1">
                <TabsTrigger
                  value="inbox"
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5"
                >
                  받은 쪽지
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-4 min-w-[16px] px-1 text-[9px] rounded-full"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="outbox"
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  보낸 쪽지
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 받은함 */}
            <TabsContent value="inbox" className="mt-0 px-3 py-3">
              {inboxLoading ? (
                <div className="py-14 text-center text-sm text-gray-400">불러오는 중...</div>
              ) : inbox.length === 0 ? (
                <EmptyState text="받은 쪽지가 없습니다." />
              ) : (
                <div className="space-y-1.5">
                  {inbox.map((msg) => (
                    <InboxCard key={msg.id} msg={msg} onClick={() => handleInboxClick(msg)} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 보낸함 */}
            <TabsContent value="outbox" className="mt-0 px-3 py-3">
              {outboxLoading ? (
                <div className="py-14 text-center text-sm text-gray-400">불러오는 중...</div>
              ) : outbox.length === 0 ? (
                <EmptyState text="보낸 쪽지가 없습니다." />
              ) : (
                <div className="space-y-1.5">
                  {outbox.map((msg) => (
                    <OutboxCard key={msg.id} msg={msg} onClick={() => handleOutboxClick(msg)} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 모바일 전용: 직원 목록 버튼 */}
      <div className="lg:hidden">
        <ContactsPanel onCompose={handleComposeOpen} />
      </div>

      {/* 상세 모달 */}
      <MessageDetailDialog
        message={selectedMsg}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDelete={handleDelete}
        onReply={handleReply}
      />

      {/* 쓰기/답장 모달 */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={handleComposeClose}
        initialReceiver={replyReceiver}
      />
    </div>
  );
}

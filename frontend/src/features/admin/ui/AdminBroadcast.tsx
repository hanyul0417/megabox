import { Megaphone, Send, User, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useBroadcastContactsQuery, useSendBroadcastMutation } from '../api/queries';

import type { BroadcastTarget } from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

const MAX_TITLE = 150;
const MAX_CONTENT = 500;

function TargetButton({
  active,
  icon,
  label,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-colors',
        active ? 'border-mega bg-mega/5 ring-1 ring-mega/30' : 'border-gray-200 hover:bg-gray-50',
      )}
    >
      <div
        className={cn(
          'size-9 rounded-lg flex items-center justify-center shrink-0',
          active ? 'bg-mega/15 text-mega' : 'bg-gray-100 text-gray-400',
        )}
      >
        {icon}
      </div>
      <div>
        <p className={cn('text-sm font-semibold', active ? 'text-mega' : 'text-foreground')}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}

const AdminBroadcast = () => {
  const { data: contacts = [], isLoading: contactsLoading } = useBroadcastContactsQuery();
  const sendMutation = useSendBroadcastMutation();

  const [target, setTarget] = useState<BroadcastTarget>('all');
  const [userId, setUserId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const resetForm = () => {
    setTitle('');
    setContent('');
    setUserId('');
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('제목을 입력하세요.');
      return;
    }
    if (!content.trim()) {
      toast.error('내용을 입력하세요.');
      return;
    }
    if (target === 'user' && !userId) {
      toast.error('받는 사람을 선택하세요.');
      return;
    }

    sendMutation.mutate(
      {
        target,
        user_id: target === 'user' ? Number(userId) : undefined,
        title: title.trim(),
        content: content.trim(),
      },
      { onSuccess: resetForm },
    );
  };

  return (
    <>
      {/* 헤더 */}
      <div className="flex gap-2 mb-5">
        <Megaphone className="size-5 text-mega-secondary mt-0.5" />
        <div>
          <h2 className="text-base font-semibold">알림 발송</h2>
          <p className="text-sm text-muted-foreground">
            전체 직원 또는 특정 직원에게 알림을 보냅니다.
          </p>
        </div>
      </div>

      <div className="space-y-5 max-w-xl">
        {/* 대상 선택 */}
        <div className="space-y-1.5">
          <Label>보낼 대상</Label>
          <div className="flex gap-2">
            <TargetButton
              active={target === 'all'}
              icon={<Users className="size-4" />}
              label="전체"
              description="모든 직원에게 알림만 전송 (이동 링크 없음)"
              onClick={() => setTarget('all')}
            />
            <TargetButton
              active={target === 'user'}
              icon={<User className="size-4" />}
              label="개인"
              description="선택한 직원에게 실제 쪽지로 전송"
              onClick={() => setTarget('user')}
            />
          </div>
        </div>

        {/* 받는 사람 선택 (개인일 때만) */}
        {target === 'user' && (
          <div className="space-y-1.5">
            <Label>
              받는 사람 <span className="text-destructive">*</span>
            </Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={contactsLoading ? '불러오는 중...' : '직원을 선택하세요'}
                />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.position})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 제목 */}
        <div className="space-y-1.5">
          <Label htmlFor="broadcast-title">
            제목 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="broadcast-title"
            placeholder="알림 제목을 입력하세요"
            maxLength={MAX_TITLE}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="text-xs text-muted-foreground text-right">
            {title.length} / {MAX_TITLE}
          </p>
        </div>

        {/* 내용 */}
        <div className="space-y-1.5">
          <Label htmlFor="broadcast-content">
            내용 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="broadcast-content"
            placeholder="자유롭게 내용을 입력하세요"
            rows={5}
            maxLength={MAX_CONTENT}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="text-xs text-muted-foreground text-right">
            {content.length} / {MAX_CONTENT}
          </p>
        </div>

        <Button onClick={handleSubmit} disabled={sendMutation.isPending} className="w-full">
          <Send className="size-4" />
          {sendMutation.isPending
            ? '보내는 중...'
            : target === 'all'
              ? '전체 발송'
              : '쪽지로 보내기'}
        </Button>

        <p className="text-xs text-muted-foreground">
          * 전체 발송은 클릭해도 이동하지 않는 공지성 알림입니다. 개인 발송은 실제 쪽지함에 전달되어
          상대방이 답장할 수 있습니다.
        </p>
      </div>
    </>
  );
};

export default AdminBroadcast;

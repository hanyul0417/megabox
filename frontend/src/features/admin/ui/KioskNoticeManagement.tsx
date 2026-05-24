import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { CalendarDays, Megaphone, Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  useCreateKioskNoticeMutation,
  useDeleteKioskNoticeMutation,
  useKioskNoticesQuery,
  useUpdateKioskNoticeMutation,
} from '../api/queries';

import type { KioskNoticeDTO } from '../api/dto';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const MAX_NOTICES = 5;

// ─── 공지 상태 계산 ────────────────────────────────────────────────────────────

type NoticeStatus = 'active' | 'upcoming' | 'expired' | 'disabled';

function getNoticeStatus(notice: KioskNoticeDTO): NoticeStatus {
  if (!notice.is_active) return 'disabled';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseISO(notice.start_date);
  const end = parseISO(notice.end_date);
  if (isAfter(start, today)) return 'upcoming';
  if (isBefore(end, today)) return 'expired';
  return 'active';
}

const STATUS_META: Record<NoticeStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active:   { label: '게시중',  variant: 'default' },
  upcoming: { label: '예정',    variant: 'secondary' },
  expired:  { label: '만료',    variant: 'outline' },
  disabled: { label: '비활성',  variant: 'destructive' },
};

// ─── 폼 타입 ──────────────────────────────────────────────────────────────────

interface NoticeForm {
  content: string;
  start_date: string;
  end_date: string;
  sort_order: number;
}

const EMPTY_FORM: NoticeForm = {
  content: '',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: format(new Date(), 'yyyy-MM-dd'),
  sort_order: 0,
};

// ─── 공지 폼 다이얼로그 ────────────────────────────────────────────────────────

interface NoticeFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: NoticeForm;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (form: NoticeForm) => void;
}

function NoticeFormDialog({ open, mode, initial, isPending, onClose, onSubmit }: NoticeFormDialogProps) {
  const [form, setForm] = useState<NoticeForm>(initial ?? EMPTY_FORM);

  // 다이얼로그 열릴 때 폼 초기화
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setForm(initial ?? EMPTY_FORM);
    else onClose();
  };

  const handleSubmit = () => {
    if (!form.content.trim()) { toast.error('공지 내용을 입력하세요.'); return; }
    if (!form.start_date || !form.end_date) { toast.error('게시 기간을 설정하세요.'); return; }
    if (form.end_date < form.start_date) { toast.error('종료일이 시작일보다 앞설 수 없습니다.'); return; }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '공지사항 등록' : '공지사항 수정'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 내용 */}
          <div className="space-y-1.5">
            <Label htmlFor="notice-content">
              공지 내용 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="notice-content"
              placeholder="한 줄 공지 내용을 입력하세요 (최대 200자)"
              maxLength={200}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground text-right">{form.content.length} / 200</p>
          </div>

          {/* 게시 기간 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="notice-start">
                시작일 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="notice-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notice-end">
                종료일 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="notice-end"
                type="date"
                value={form.end_date}
                min={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>

          {/* 정렬 순서 */}
          <div className="space-y-1.5">
            <Label htmlFor="notice-order">표시 순서 (숫자가 작을수록 위)</Label>
            <Input
              id="notice-order"
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              className="w-28"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>취소</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? '저장 중...' : mode === 'create' ? '등록' : '수정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const KioskNoticeManagement = () => {
  const { data: notices = [], isLoading } = useKioskNoticesQuery();
  const createMutation = useCreateKioskNoticeMutation();
  const updateMutation = useUpdateKioskNoticeMutation();
  const deleteMutation = useDeleteKioskNoticeMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<KioskNoticeDTO | null>(null);

  const canAdd = notices.length < MAX_NOTICES;

  const handleCreate = (form: NoticeForm) => {
    createMutation.mutate(
      { ...form, is_active: true },
      { onSuccess: () => setIsCreateOpen(false) },
    );
  };

  const handleUpdate = (form: NoticeForm) => {
    if (!editTarget) return;
    updateMutation.mutate(
      { id: editTarget.id, data: form },
      { onSuccess: () => setEditTarget(null) },
    );
  };

  const handleToggleActive = (notice: KioskNoticeDTO) => {
    updateMutation.mutate(
      { id: notice.id, data: { is_active: !notice.is_active } },
    );
  };

  const handleDelete = (notice: KioskNoticeDTO) => {
    if (!confirm(`"${notice.content}" 공지사항을 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(notice.id);
  };

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex gap-2">
          <Megaphone className="size-5 text-mega-secondary mt-0.5" />
          <div>
            <h2 className="text-base font-semibold">키오스크 공지사항</h2>
            <p className="text-sm text-muted-foreground">
              근태 화면에 표시될 공지사항을 관리합니다. 최대 {MAX_NOTICES}개, 게시 기간 내 자동 표시됩니다.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={!canAdd}
          title={!canAdd ? `최대 ${MAX_NOTICES}개까지 등록 가능합니다.` : undefined}
        >
          <Plus className="size-4" />
          공지 추가
        </Button>
      </div>

      {/* 등록 수 표시 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1">
          {Array.from({ length: MAX_NOTICES }).map((_, i) => (
            <div
              key={i}
              className={[
                'size-2.5 rounded-full transition-colors',
                i < notices.length ? 'bg-mega-secondary' : 'bg-gray-200',
              ].join(' ')}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {notices.length} / {MAX_NOTICES}개 등록됨
        </span>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && notices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border-2 border-dashed border-gray-200">
          <Megaphone className="size-10 text-gray-300" />
          <p className="text-sm text-muted-foreground">등록된 공지사항이 없습니다.</p>
          <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
            첫 공지 등록하기
          </Button>
        </div>
      )}

      {/* 공지 목록 */}
      {!isLoading && notices.length > 0 && (
        <div className="space-y-3">
          {notices.map((notice) => {
            const status = getNoticeStatus(notice);
            const meta = STATUS_META[status];

            return (
              <div
                key={notice.id}
                className={[
                  'flex items-center gap-4 px-4 py-4 rounded-xl border transition-colors',
                  status === 'active'
                    ? 'border-mega-secondary/30 bg-mega-secondary/5'
                    : 'border-border bg-white',
                ].join(' ')}
              >
                {/* 아이콘 */}
                <div className={[
                  'size-9 rounded-lg flex items-center justify-center flex-shrink-0',
                  status === 'active' ? 'bg-mega-secondary/15' : 'bg-gray-100',
                ].join(' ')}>
                  <Megaphone className={[
                    'size-4',
                    status === 'active' ? 'text-mega-secondary' : 'text-gray-400',
                  ].join(' ')} />
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <p className={[
                    'text-sm font-medium truncate',
                    status === 'disabled' || status === 'expired' ? 'text-muted-foreground line-through' : 'text-foreground',
                  ].join(' ')}>
                    {notice.content}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <CalendarDays className="size-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(notice.start_date), 'yyyy.MM.dd')}
                      {' — '}
                      {format(parseISO(notice.end_date), 'yyyy.MM.dd')}
                    </span>
                  </div>
                </div>

                {/* 상태 뱃지 */}
                <Badge variant={meta.variant} className="shrink-0 text-xs">
                  {meta.label}
                </Badge>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* 활성/비활성 토글 */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(notice)}
                    disabled={updateMutation.isPending}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title={notice.is_active ? '비활성화' : '활성화'}
                  >
                    {notice.is_active
                      ? <ToggleRight className="size-5 text-mega-secondary" />
                      : <ToggleLeft className="size-5 text-gray-400" />
                    }
                  </button>

                  {/* 수정 */}
                  <button
                    type="button"
                    onClick={() => setEditTarget(notice)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="수정"
                  >
                    <Pencil className="size-4 text-gray-500" />
                  </button>

                  {/* 삭제 */}
                  <button
                    type="button"
                    onClick={() => handleDelete(notice)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 안내 */}
      {!isLoading && notices.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          * 게시중 상태인 공지만 키오스크 화면에 표시됩니다. 기간이 지나면 자동으로 숨겨집니다.
        </p>
      )}

      {/* 등록 다이얼로그 */}
      <NoticeFormDialog
        open={isCreateOpen}
        mode="create"
        isPending={createMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {/* 수정 다이얼로그 */}
      {editTarget && (
        <NoticeFormDialog
          open={editTarget !== null}
          mode="edit"
          initial={{
            content: editTarget.content,
            start_date: editTarget.start_date,
            end_date: editTarget.end_date,
            sort_order: editTarget.sort_order,
          }}
          isPending={updateMutation.isPending}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
        />
      )}
    </>
  );
};

export default KioskNoticeManagement;

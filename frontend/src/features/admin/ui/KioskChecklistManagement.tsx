import { CheckSquare, Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  useChecklistItemsQuery,
  useCreateChecklistItemMutation,
  useDeleteChecklistItemMutation,
  useUpdateChecklistItemMutation,
} from '../api/queries';

import type { ChecklistItemDTO } from '../api/dto';

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
import { cn } from '@/shared/lib/utils';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const MAX_PER_DAY = 5;

export const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ─── 폼 타입 ──────────────────────────────────────────────────────────────────

interface ItemForm {
  content: string;
  sort_order: number;
}

// ─── 항목 폼 다이얼로그 ────────────────────────────────────────────────────────

interface ItemFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  dayLabel: string;
  initial?: ItemForm;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (form: ItemForm) => void;
}

function ItemFormDialog({ open, mode, dayLabel, initial, isPending, onClose, onSubmit }: ItemFormDialogProps) {
  const [form, setForm] = useState<ItemForm>(initial ?? { content: '', sort_order: 0 });

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setForm(initial ?? { content: '', sort_order: 0 });
    else onClose();
  };

  const handleSubmit = () => {
    if (!form.content.trim()) { toast.error('항목 내용을 입력하세요.'); return; }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {dayLabel}요일 체크리스트 {mode === 'create' ? '추가' : '수정'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="item-content">
              항목 내용 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="item-content"
              placeholder="체크할 항목을 입력하세요 (최대 100자)"
              maxLength={100}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-right">{form.content.length} / 100</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-order">표시 순서 (숫자가 작을수록 위)</Label>
            <Input
              id="item-order"
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              className="w-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>취소</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? '저장 중...' : mode === 'create' ? '추가' : '수정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const KioskChecklistManagement = () => {
  const { data: allItems = [], isLoading } = useChecklistItemsQuery();
  const createMutation = useCreateChecklistItemMutation();
  const updateMutation = useUpdateChecklistItemMutation();
  const deleteMutation = useDeleteChecklistItemMutation();

  const [selectedDay, setSelectedDay] = useState<DayIndex>(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChecklistItemDTO | null>(null);

  const dayItems = allItems.filter((item) => item.day_of_week === selectedDay);
  const canAdd = dayItems.length < MAX_PER_DAY;

  const handleCreate = (form: ItemForm) => {
    createMutation.mutate(
      { day_of_week: selectedDay, ...form },
      { onSuccess: () => setIsCreateOpen(false) },
    );
  };

  const handleUpdate = (form: ItemForm) => {
    if (!editTarget) return;
    updateMutation.mutate(
      { id: editTarget.id, data: form },
      { onSuccess: () => setEditTarget(null) },
    );
  };

  const handleToggleActive = (item: ChecklistItemDTO) => {
    updateMutation.mutate({ id: item.id, data: { is_active: !item.is_active } });
  };

  const handleDelete = (item: ChecklistItemDTO) => {
    if (!confirm(`"${item.content}" 항목을 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(item.id);
  };

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex gap-2">
          <CheckSquare className="size-5 text-mega-secondary mt-0.5" />
          <div>
            <h2 className="text-base font-semibold">요일별 체크리스트</h2>
            <p className="text-sm text-muted-foreground">
              키오스크 화면에 표시할 요일별 체크 항목을 관리합니다. 요일당 최대 {MAX_PER_DAY}개.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={!canAdd}
          title={!canAdd ? `요일당 최대 ${MAX_PER_DAY}개까지 등록 가능합니다.` : undefined}
        >
          <Plus className="size-4" />
          항목 추가
        </Button>
      </div>

      {/* 요일 탭 */}
      <div className="flex gap-1 mb-5 bg-gray-100/70 rounded-xl p-1 w-fit">
        {DAY_LABELS.map((label, idx) => {
          const count = allItems.filter((i) => i.day_of_week === idx).length;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedDay(idx as DayIndex)}
              className={cn(
                'relative px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap',
                selectedDay === idx
                  ? 'bg-white text-mega font-semibold shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  'ml-1 inline-flex items-center justify-center size-4 rounded-full text-[10px] font-bold',
                  selectedDay === idx ? 'bg-mega text-white' : 'bg-gray-300 text-gray-600',
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 등록 수 바 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1">
          {Array.from({ length: MAX_PER_DAY }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'size-2.5 rounded-full transition-colors',
                i < dayItems.length ? 'bg-mega-secondary' : 'bg-gray-200',
              )}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {DAY_LABELS[selectedDay]}요일 {dayItems.length} / {MAX_PER_DAY}개
        </span>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl" />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && dayItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 gap-3 rounded-xl border-2 border-dashed border-gray-200">
          <CheckSquare className="size-10 text-gray-300" />
          <p className="text-sm text-muted-foreground">{DAY_LABELS[selectedDay]}요일 체크리스트가 없습니다.</p>
          <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
            첫 항목 추가하기
          </Button>
        </div>
      )}

      {/* 항목 목록 */}
      {!isLoading && dayItems.length > 0 && (
        <div className="space-y-2">
          {dayItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
                item.is_active ? 'bg-white border-border' : 'bg-gray-50 border-border',
              )}
            >
              {/* 순서 */}
              <span className="text-xs text-muted-foreground w-4 shrink-0 text-center">
                {item.sort_order}
              </span>

              {/* 내용 */}
              <p className={cn(
                'flex-1 text-sm',
                !item.is_active && 'line-through text-muted-foreground',
              )}>
                {item.content}
              </p>

              {/* 상태 뱃지 */}
              <Badge variant={item.is_active ? 'default' : 'outline'} className="text-xs shrink-0">
                {item.is_active ? '활성' : '비활성'}
              </Badge>

              {/* 액션 */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleActive(item)}
                  disabled={updateMutation.isPending}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title={item.is_active ? '비활성화' : '활성화'}
                >
                  {item.is_active
                    ? <ToggleRight className="size-5 text-mega-secondary" />
                    : <ToggleLeft className="size-5 text-gray-400" />
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setEditTarget(item)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Pencil className="size-4 text-gray-500" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="size-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && dayItems.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          * 활성 항목만 키오스크 화면에 표시됩니다. 매일 자정에 체크 상태가 초기화됩니다.
        </p>
      )}

      {/* 다이얼로그 */}
      <ItemFormDialog
        open={isCreateOpen}
        mode="create"
        dayLabel={DAY_LABELS[selectedDay]}
        isPending={createMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {editTarget && (
        <ItemFormDialog
          open={editTarget !== null}
          mode="edit"
          dayLabel={DAY_LABELS[editTarget.day_of_week as DayIndex] ?? ''}
          initial={{ content: editTarget.content, sort_order: editTarget.sort_order }}
          isPending={updateMutation.isPending}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
        />
      )}
    </>
  );
};

export default KioskChecklistManagement;

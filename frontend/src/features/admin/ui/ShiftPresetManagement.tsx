import { Clock, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  useCreateShiftPresetMutation,
  useDeleteShiftPresetMutation,
  useShiftPresetsQuery,
  useUpdateShiftPresetMutation,
} from '../api/queries';

import type { ShiftPresetDTO } from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import ConfirmDialog from '@/shared/components/ui/confirm-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Spinner } from '@/shared/components/ui/spinner';
import TimeInput from '@/shared/ui/TimeInput';

const MAX_PRESETS = 8;

// ─── 프리셋 폼 다이얼로그 ──────────────────────────────────────────────────

interface PresetFormDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: ShiftPresetDTO | null;
  nextSortOrder: number;
}

const defaultForm = {
  label: '',
  start_time: '',
  end_time: '',
  border_color: '#e5e7eb',
  font_color: '#374151',
};

const PresetFormDialog = ({ open, onClose, initial, nextSortOrder }: PresetFormDialogProps) => {
  const [form, setForm] = useState(defaultForm);

  const createMut = useCreateShiftPresetMutation();
  const updateMut = useUpdateShiftPresetMutation();
  const isPending = createMut.isPending || updateMut.isPending;
  const isEdit = Boolean(initial);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          label: initial.label,
          start_time: initial.start_time,
          end_time: initial.end_time,
          border_color: initial.border_color,
          font_color: initial.font_color,
        });
      } else {
        setForm(defaultForm);
      }
    }
  }, [open, initial]);

  const isValid = form.label.trim() !== '' && form.start_time !== '' && form.end_time !== '';

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      if (isEdit && initial) {
        await updateMut.mutateAsync({ id: initial.id, data: form });
      } else {
        await createMut.mutateAsync({ ...form, sort_order: nextSortOrder });
      }
      onClose();
    } catch {
      toast.error('저장에 실패했습니다.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-sm rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-mega-secondary to-mega px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Clock className="text-white size-5" />
          </div>
          <DialogTitle className="text-white font-bold">
            시프트 프리셋 {isEdit ? '수정' : '추가'}
          </DialogTitle>
          <DialogClose
            className="ml-auto text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 p-1"
            onClick={onClose}
          >
            <span className="sr-only">닫기</span>
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* 이름 */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">프리셋 이름</Label>
            <Input
              placeholder="예: 오전, 미들, 막입, 막퇴"
              maxLength={20}
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="rounded-xl h-11"
            />
          </div>

          {/* 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">시작 시간</Label>
              <TimeInput
                value={form.start_time}
                onChange={(v) => setForm((f) => ({ ...f, start_time: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">종료 시간</Label>
              <TimeInput
                value={form.end_time}
                onChange={(v) => setForm((f) => ({ ...f, end_time: v }))}
              />
            </div>
          </div>

          {/* 색상 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">테두리 색상</Label>
              <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-input bg-background">
                <input
                  type="color"
                  value={form.border_color}
                  onChange={(e) => setForm((f) => ({ ...f, border_color: e.target.value }))}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                  title="테두리 색상 선택"
                />
                <span className="text-xs text-gray-500 font-mono">{form.border_color}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">폰트 색상</Label>
              <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-input bg-background">
                <input
                  type="color"
                  value={form.font_color}
                  onChange={(e) => setForm((f) => ({ ...f, font_color: e.target.value }))}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                  title="폰트 색상 선택"
                />
                <span className="text-xs text-gray-500 font-mono">{form.font_color}</span>
              </div>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">미리보기</Label>
            <div
              className="inline-flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border-2 text-xs font-semibold"
              style={{ borderColor: form.border_color, color: form.font_color }}
            >
              <span>{form.label || '이름'}</span>
              <span className="text-[9px] font-normal opacity-70 leading-none">
                {form.start_time || '00:00'}~{form.end_time || '00:00'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-6 gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl h-10"
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            className="flex-1 bg-mega-secondary hover:bg-mega text-white rounded-xl h-10"
            onClick={() => void handleSubmit()}
            disabled={isPending || !isValid}
          >
            {isPending ? '저장 중...' : isEdit ? '수정하기' : '추가하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

const ShiftPresetManagement = () => {
  const { data: presets = [], isLoading } = useShiftPresetsQuery();
  const deleteMut = useDeleteShiftPresetMutation();
  const updateMut = useUpdateShiftPresetMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ShiftPresetDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShiftPresetDTO | null>(null);

  const openAdd = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (preset: ShiftPresetDTO) => {
    setEditTarget(preset);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMut.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleMoveUp = (preset: ShiftPresetDTO, idx: number) => {
    if (idx === 0) return;
    const prev = presets[idx - 1];
    void updateMut.mutateAsync({ id: preset.id, data: { sort_order: prev.sort_order } });
    void updateMut.mutateAsync({ id: prev.id, data: { sort_order: preset.sort_order } });
  };

  const handleMoveDown = (preset: ShiftPresetDTO, idx: number) => {
    if (idx === presets.length - 1) return;
    const next = presets[idx + 1];
    void updateMut.mutateAsync({ id: preset.id, data: { sort_order: next.sort_order } });
    void updateMut.mutateAsync({ id: next.id, data: { sort_order: preset.sort_order } });
  };

  const nextSortOrder = presets.length > 0 ? Math.max(...presets.map((p) => p.sort_order)) + 1 : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">시프트 빠른 선택 프리셋</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            스케줄 생성 시 표시되는 빠른 선택 버튼을 관리합니다.
            <span className="ml-1 text-amber-600 font-medium">최대 {MAX_PRESETS}개</span>
          </p>
        </div>
        <Button
          onClick={openAdd}
          disabled={presets.length >= MAX_PRESETS}
          className="bg-mega-secondary hover:bg-mega text-white rounded-xl h-9 px-4 text-sm gap-1.5"
        >
          <Plus className="size-4" />
          프리셋 추가
        </Button>
      </div>

      {/* 등록 현황 */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className="flex gap-1">
          {Array.from({ length: MAX_PRESETS }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-1.5 rounded-full transition-colors ${
                i < presets.length ? 'bg-mega-secondary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span>
          {presets.length} / {MAX_PRESETS}
        </span>
      </div>

      {/* 프리셋 목록 */}
      {presets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
          <Clock className="size-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">등록된 프리셋이 없습니다</p>
          <p className="text-xs mt-1">프리셋 추가 버튼을 눌러 시작하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {presets.map((preset, idx) => (
            <div
              key={preset.id}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-colors"
            >
              {/* 드래그 핸들 (순서 이동 버튼) */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveUp(preset, idx)}
                  disabled={idx === 0 || updateMut.isPending}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="위로"
                >
                  <svg
                    className="size-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <GripVertical className="size-3.5 text-gray-300" />
                <button
                  type="button"
                  onClick={() => handleMoveDown(preset, idx)}
                  disabled={idx === presets.length - 1 || updateMut.isPending}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="아래로"
                >
                  <svg
                    className="size-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* 프리셋 미리보기 버튼 */}
              <div
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 text-xs font-semibold shrink-0"
                style={{ borderColor: preset.border_color, color: preset.font_color }}
              >
                <span>{preset.label}</span>
                <span className="text-[9px] font-normal opacity-70 leading-none">
                  {preset.start_time}~{preset.end_time}
                </span>
              </div>

              {/* 색상 뱃지 */}
              <div className="flex gap-1.5 items-center flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded border border-gray-200 shrink-0"
                    style={{ backgroundColor: preset.border_color }}
                    title={`테두리: ${preset.border_color}`}
                  />
                  <span
                    className="w-3 h-3 rounded border border-gray-200 shrink-0"
                    style={{ backgroundColor: preset.font_color }}
                    title={`폰트: ${preset.font_color}`}
                  />
                </div>
                <span className="text-xs text-gray-400 truncate">
                  {preset.start_time} ~ {preset.end_time}
                </span>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(preset)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-mega-secondary hover:bg-mega-secondary/10 transition-colors"
                  title="수정"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(preset)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="삭제"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 폼 다이얼로그 */}
      <PresetFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editTarget}
        nextSortOrder={nextSortOrder}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="프리셋 삭제"
        description={`"${deleteTarget?.label}" 프리셋을 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default ShiftPresetManagement;

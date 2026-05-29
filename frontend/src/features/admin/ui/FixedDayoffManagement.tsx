import { Clock, Pencil, Plus, Trash2, User2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAdminUsersQuery, useUpdateAdminUserMutation } from '../api/queries';
import type { AdminUserDTO, UnavailableDayConfig, UnavailableTimes } from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import { cn } from '@/shared/lib/utils';

// ── 상수 ──────────────────────────────────────────────────────────────────────

// 표시 순서: 월~일
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_LABEL: Record<number, string> = {
  0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토',
};

const POSITION_ORDER: Record<string, number> = {
  관리자: 0, 리더: 1, 크루: 2, 미화: 3, 시스템: 99,
};

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function buildDefaultTimes(): UnavailableTimes {
  const result: UnavailableTimes = {};
  for (const day of DAY_ORDER) {
    result[String(day)] = { all_day: false, slots: [] };
  }
  return result;
}

function normalizeTimes(raw?: UnavailableTimes): UnavailableTimes {
  const base = buildDefaultTimes();
  if (!raw) return base;
  for (const day of DAY_ORDER) {
    const key = String(day);
    const src = raw[key];
    if (src) {
      base[key] = {
        all_day: src.all_day ?? false,
        slots: (src.slots ?? []).map((s) => ({ start: s.start, end: s.end })),
      };
    }
  }
  return base;
}

function isAnyRestricted(times?: UnavailableTimes): boolean {
  if (!times) return false;
  return Object.values(times).some((v) => v != null && (v.all_day || (v.slots?.length ?? 0) > 0));
}

// ── 요약 배지 ─────────────────────────────────────────────────────────────────

function ScheduleSummary({ times }: { times?: UnavailableTimes }) {
  if (!times || !isAnyRestricted(times)) {
    return <span className="text-xs text-gray-400">제한 없음</span>;
  }

  const chips: { label: string; type: 'allday' | 'partial' }[] = [];

  for (const day of DAY_ORDER) {
    const key = String(day);
    const cfg = times[key];
    if (!cfg) continue;
    if (cfg.all_day) {
      chips.push({ label: DAY_LABEL[day], type: 'allday' });
    } else if ((cfg.slots?.length ?? 0) > 0) {
      const slotStr = cfg.slots.map((s) => `${s.start}~${s.end}`).join(' ');
      chips.push({ label: `${DAY_LABEL[day]} ${slotStr}`, type: 'partial' });
    }
  }

  if (chips.length === 0) return <span className="text-xs text-gray-400">제한 없음</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
            c.type === 'allday'
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700',
          )}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

// ── 시간 슬롯 행 ──────────────────────────────────────────────────────────────

interface SlotRowProps {
  start: string;
  end: string;
  onChange: (field: 'start' | 'end', value: string) => void;
  onDelete: () => void;
}

function SlotRow({ start, end, onChange, onDelete }: SlotRowProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="time"
        value={start}
        onChange={(e) => onChange('start', e.target.value)}
        className="flex-1 h-8 px-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-mega"
      />
      <span className="text-xs text-gray-400">~</span>
      <input
        type="time"
        value={end}
        onChange={(e) => onChange('end', e.target.value)}
        className="flex-1 h-8 px-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-mega"
      />
      <button
        type="button"
        onClick={onDelete}
        className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

// ── 요일 행 ──────────────────────────────────────────────────────────────────

interface DayRowProps {
  day: number;
  config: UnavailableDayConfig;
  onChange: (config: UnavailableDayConfig) => void;
}

function DayRow({ day, config, onChange }: DayRowProps) {
  const hasRestriction = config.all_day || config.slots.length > 0;

  const toggleAllDay = (checked: boolean) => {
    onChange({ ...config, all_day: checked });
  };

  const addSlot = () => {
    onChange({ ...config, slots: [...config.slots, { start: '09:00', end: '18:00' }] });
  };

  const updateSlot = (idx: number, field: 'start' | 'end', value: string) => {
    const newSlots = config.slots.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
    onChange({ ...config, slots: newSlots });
  };

  const removeSlot = (idx: number) => {
    onChange({ ...config, slots: config.slots.filter((_, i) => i !== idx) });
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-3 transition-colors',
        hasRestriction ? 'border-mega/30 bg-mega/5' : 'border-gray-100 bg-gray-50/50',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold',
              hasRestriction ? 'bg-mega text-white' : 'bg-white text-gray-500 border border-gray-200',
            )}
          >
            {DAY_LABEL[day]}
          </span>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.all_day}
              onCheckedChange={toggleAllDay}
              className="scale-90"
            />
            <span className="text-xs text-gray-600">하루 종일 불가</span>
          </div>
        </div>
        {!config.all_day && (
          <button
            type="button"
            onClick={addSlot}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-mega hover:bg-mega/10 rounded-md transition-colors"
          >
            <Plus className="size-3" />
            시간 추가
          </button>
        )}
      </div>

      {!config.all_day && config.slots.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1.5 pl-11">
          {config.slots.map((slot, idx) => (
            <SlotRow
              key={idx}
              start={slot.start}
              end={slot.end}
              onChange={(field, value) => updateSlot(idx, field, value)}
              onDelete={() => removeSlot(idx)}
            />
          ))}
        </div>
      )}

      {config.all_day && (
        <p className="mt-1.5 pl-11 text-[11px] text-red-500">이 날은 근무 배정에서 제외됩니다</p>
      )}
    </div>
  );
}

// ── 편집 Sheet ────────────────────────────────────────────────────────────────

interface EditSheetProps {
  user: AdminUserDTO | null;
  open: boolean;
  onClose: () => void;
}

function EditSheet({ user, open, onClose }: EditSheetProps) {
  const [times, setTimes] = useState<UnavailableTimes>(buildDefaultTimes());
  const updateMutation = useUpdateAdminUserMutation();

  useEffect(() => {
    if (user) setTimes(normalizeTimes(user.unavailable_times));
  }, [user]);

  if (!user) return null;

  const updateDay = (day: number, config: UnavailableDayConfig) => {
    setTimes((prev) => ({ ...prev, [String(day)]: config }));
  };

  const handleSave = () => {
    // 모든 제한 없는 요일 정리 (all_day=false & slots=[] 인 경우 제거)
    const cleaned: UnavailableTimes = {};
    for (const [key, cfg] of Object.entries(times)) {
      if (cfg != null && (cfg.all_day || cfg.slots.length > 0)) {
        cleaned[key] = cfg;
      }
    }

    updateMutation.mutate(
      { memberId: user.id, data: { unavailable_times: cleaned } },
      {
        onSuccess: () => {
          toast.success(`${user.name}님의 고정 휴무 설정이 저장되었습니다.`);
          onClose();
        },
        onError: () => toast.error('저장 중 오류가 발생했습니다.'),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-mega/10">
              <Clock className="size-4 text-mega" />
            </div>
            <div>
              <SheetTitle className="text-base">{user.name}</SheetTitle>
              <p className="text-xs text-gray-500 mt-0.5">{user.position} · 고정 휴무 설정</p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
          {DAY_ORDER.map((day) => (
            <DayRow
              key={day}
              day={day}
              config={times[String(day)] ?? { all_day: false, slots: [] }}
              onChange={(cfg) => updateDay(day, cfg)}
            />
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button
            className="flex-1 bg-mega hover:bg-mega/90"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function FixedDayoffManagement() {
  const [editingUser, setEditingUser] = useState<AdminUserDTO | null>(null);
  const { data, isLoading } = useAdminUsersQuery({ limit: 200 });

  const users = (data?.items ?? [])
    .filter((u) => u.status === 'approved' && u.position !== '시스템')
    .sort((a, b) => {
      const pa = POSITION_ORDER[a.position] ?? 9;
      const pb = POSITION_ORDER[b.position] ?? 9;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name, 'ko');
    });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-gray-500 mb-3">
          직원별로 근무 불가 요일 및 시간대를 설정합니다.
          <span className="ml-1 inline-flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-100 border border-red-300" />
            <span className="text-red-600">하루 종일</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-100 border border-amber-300 ml-1" />
            <span className="text-amber-600">시간대 제한</span>
          </span>
        </p>

        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <User2 className="size-10 mb-3 opacity-30" />
            <p className="text-sm">등록된 직원이 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-100 bg-white hover:border-mega/30 hover:shadow-sm transition-all"
              >
                {/* 이름 / 직책 */}
                <div className="w-24 flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.position}</p>
                </div>

                {/* 현재 설정 요약 */}
                <div className="flex-1 min-w-0">
                  <ScheduleSummary times={user.unavailable_times} />
                </div>

                {/* 편집 버튼 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 h-8 px-3 text-xs text-mega hover:bg-mega/10"
                  onClick={() => setEditingUser(user)}
                >
                  <Pencil className="size-3 mr-1" />
                  편집
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditSheet
        user={editingUser}
        open={editingUser !== null}
        onClose={() => setEditingUser(null)}
      />
    </>
  );
}

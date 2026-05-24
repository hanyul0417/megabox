import { CheckSquare, LogOut, Megaphone, UserCircle2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { useActiveKioskNoticesQuery, useChecklistTodayQuery, useToggleChecklistMutation } from '@/features/admin/api/queries';
import { useTodayWorkRecordQuery, useWorkStatusActionMutation } from '../api/queries';
import { useNow } from '../model/useNow';

import { WorkStatusButtons } from './WorkStatusButtons';
import { WorkStatusHistory } from './WorkStatusHistory';
import { WorkStatusUserSelect } from './WorkStatusUserSelect';

import type {
  WorkAction,
  WorkCurrentStatus,
  WorkStatusEmployee,
} from '@/entities/work-status/api/dto';

import { STATUS_COLORS, STATUS_LABELS, deriveCurrentStatus } from '@/entities/work-status/api/dto';
// eslint-disable-next-line fsd-import/layer-imports
import LogoutBtn from '@/features/login/ui/LogoutBtn';
import { getProfileImageUrl } from '@/shared/lib/avatar';
import { formatCurrentDateTime } from '@/shared/lib/date';
import { cn } from '@/shared/lib/utils';

// ── 직급 뱃지 ─────────────────────────────────────────────────────────────
const POSITION_LABEL: Record<string, string> = {
  CREW: '크루', LEADER: '리더', CLEANING: '미화',
  크루: '크루', 리더: '리더', 미화: '미화',
};

// ── 섹션 헤더 ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
      {children}
    </p>
  );
}

// ── 키오스크 체크리스트 ────────────────────────────────────────────────────
function KioskChecklist() {
  const { data: items = [], isLoading } = useChecklistTodayQuery();
  const toggleMutation = useToggleChecklistMutation();

  const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];
  const todayLabel = DAY_NAMES[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className="h-9 bg-gray-100 rounded-lg" />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
        <CheckSquare className="size-8 text-gray-200" />
        <p className="text-xs text-gray-400 text-center">
          오늘({todayLabel}) 체크리스트가<br />없습니다
        </p>
      </div>
    );
  }

  const checkedCount = items.filter((i) => i.is_checked).length;

  return (
    <div className="flex flex-col gap-2">
      {/* 완료율 바 */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-mega-secondary rounded-full transition-all duration-300"
            style={{ width: `${items.length ? (checkedCount / items.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {checkedCount}/{items.length}
        </span>
      </div>

      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => toggleMutation.mutate(item.id)}
          disabled={toggleMutation.isPending}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border-2 transition-all duration-150 text-left',
            'active:scale-[0.98] cursor-pointer select-none touch-manipulation',
            item.is_checked
              ? 'bg-mega-secondary/8 border-mega-secondary/30'
              : 'bg-white border-gray-100 hover:border-gray-200',
          )}
        >
          {/* 체크박스 */}
          <div className={cn(
            'flex items-center justify-center size-5 rounded-md border-2 shrink-0 transition-all',
            item.is_checked
              ? 'bg-mega-secondary border-mega-secondary'
              : 'border-gray-300 bg-white',
          )}>
            {item.is_checked && (
              <svg className="size-3 text-white" fill="none" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          {/* 내용 */}
          <span className={cn(
            'text-sm font-medium transition-colors',
            item.is_checked ? 'text-muted-foreground line-through' : 'text-foreground',
          )}>
            {item.content}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── 공지사항 섹션 ─────────────────────────────────────────────────────────
function NoticeSection() {
  const { data: notices = [] } = useActiveKioskNoticesQuery();

  if (notices.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 shrink-0">
      <SectionLabel>공지사항</SectionLabel>
      <div className="space-y-1.5">
        {notices.map((notice) => (
          <div key={notice.id} className="flex items-start gap-2">
            <Megaphone className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-700 leading-snug">{notice.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 메인 패널 ─────────────────────────────────────────────────────────────
export function WorkStatusPanel() {
  const [selectedEmployee, setSelectedEmployee] = useState<WorkStatusEmployee | null>(null);
  const [submittingAction, setSubmittingAction] = useState<WorkAction | null>(null);

  const now = useNow();
  const { time, date, dayOfWeek } = formatCurrentDateTime(now);

  const { data: todayRecord, isLoading: isRecordLoading } = useTodayWorkRecordQuery(
    selectedEmployee?.id ?? null,
  );

  const currentStatus: WorkCurrentStatus = deriveCurrentStatus(todayRecord);
  const statusMeta = STATUS_COLORS[currentStatus];

  const { mutate: doAction, isPending: isSubmitting } = useWorkStatusActionMutation();

  const handleAction = useCallback(
    (action: WorkAction) => {
      if (!selectedEmployee) return;
      setSubmittingAction(action);
      doAction(
        { action, userId: selectedEmployee.id },
        {
          onSuccess: () => {
            const LABELS: Record<WorkAction, string> = {
              CHECK_IN: '출근', BREAK_START: '휴식', BREAK_END: '복귀', CHECK_OUT: '퇴근',
            };
            toast.success(`${selectedEmployee.name}님 ${LABELS[action]} 처리되었습니다.`);
          },
          onSettled: () => setSubmittingAction(null),
        },
      );
    },
    [selectedEmployee, doAction],
  );

  const handleSelectEmployee = useCallback((emp: WorkStatusEmployee) => {
    setSelectedEmployee(emp);
    setSubmittingAction(null);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-app-bg overflow-hidden">

      {/* ── 헤더 ── */}
      <header className="bg-nav-bg text-white shrink-0">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold tracking-tight tabular-nums">{time}</span>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-white/70 text-sm font-medium">{date}</span>
              <span className="text-white/50 text-xs">{dayOfWeek}</span>
            </div>
          </div>
          <div className="sm:hidden text-right">
            <p className="text-white/60 text-xs">{date} {dayOfWeek}</p>
          </div>
          <LogoutBtn
            variant="ghost"
            className="flex items-center gap-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl px-3 py-2 text-sm"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">로그아웃</span>
          </LogoutBtn>
        </div>
      </header>

      {/* ── 2컬럼 메인 ── */}
      <div className="flex-1 min-h-0 max-w-6xl mx-auto w-full px-4 py-4">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">

          {/* ── LEFT: 근태 관리 ── */}
          <div className="flex flex-col gap-3 min-h-0">

            {/* 직원 선택 */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 shrink-0">
              <SectionLabel>직원 선택</SectionLabel>
              <WorkStatusUserSelect selected={selectedEmployee} onSelect={handleSelectEmployee} />
            </section>

            {/* 직원 정보 or 플레이스홀더 */}
            {selectedEmployee ? (
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-mega-secondary/10 shrink-0 overflow-hidden">
                      {getProfileImageUrl(selectedEmployee.profile_image) ? (
                        <img
                          src={getProfileImageUrl(selectedEmployee.profile_image)}
                          alt={selectedEmployee.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-mega-secondary">
                          {selectedEmployee.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{selectedEmployee.name}</p>
                      <p className="text-xs text-gray-500">
                        {POSITION_LABEL[selectedEmployee.position] ?? selectedEmployee.position}
                      </p>
                    </div>
                  </div>
                  <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl', statusMeta.bg)}>
                    <span className={cn('size-2 rounded-full shrink-0', statusMeta.dot)} />
                    <span className={cn('text-xs font-semibold', statusMeta.text)}>
                      {STATUS_LABELS[currentStatus]}
                    </span>
                  </div>
                </div>
              </section>
            ) : (
              <section className="flex items-center justify-center gap-2.5 py-5 rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 shrink-0">
                <UserCircle2 className="size-6 text-gray-300" />
                <p className="text-gray-400 text-sm">직원을 선택하면 근태 버튼이 활성화됩니다.</p>
              </section>
            )}

            {/* 근태 버튼 */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 shrink-0">
              <SectionLabel>근태 입력</SectionLabel>
              <WorkStatusButtons
                currentStatus={currentStatus}
                isDisabled={!selectedEmployee}
                isSubmitting={isSubmitting}
                submittingAction={submittingAction}
                record={todayRecord ?? null}
                onAction={handleAction}
              />
            </section>

            {/* 오늘 기록 — 직원 선택 시만 */}
            {selectedEmployee && (
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex-1 min-h-0 overflow-y-auto">
                <WorkStatusHistory record={todayRecord} isLoading={isRecordLoading} />
              </section>
            )}
          </div>

          {/* ── RIGHT: 공지 + 체크리스트 ── */}
          <div className="flex flex-col gap-3 min-h-0">

            {/* 공지사항 (있을 때만) */}
            <NoticeSection />

            {/* 체크리스트 */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex-1 min-h-0 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>오늘의 체크리스트</SectionLabel>
              </div>
              <KioskChecklist />
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}

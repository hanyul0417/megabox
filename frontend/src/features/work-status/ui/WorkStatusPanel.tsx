import { LogOut, UserCircle2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

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
  CREW: '크루',
  LEADER: '리더',
  CLEANING: '미화',
  크루: '크루',
  리더: '리더',
  미화: '미화',
};

// ── 메인 패널 ─────────────────────────────────────────────────────────────
export function WorkStatusPanel() {
  const [selectedEmployee, setSelectedEmployee] = useState<WorkStatusEmployee | null>(null);
  const [submittingAction, setSubmittingAction] = useState<WorkAction | null>(null);

  const now = useNow();
  const { time, date, dayOfWeek } = formatCurrentDateTime(now);

  // 선택된 직원의 오늘 기록 조회
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
              CHECK_IN: '출근',
              BREAK_START: '휴식',
              BREAK_END: '복귀',
              CHECK_OUT: '퇴근',
            };
            toast.success(`${selectedEmployee.name}님 ${LABELS[action]} 처리되었습니다.`);
          },
          onSettled: () => {
            setSubmittingAction(null);
          },
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
    <div className="flex flex-col min-h-screen bg-app-bg">
      {/* ── 헤더: 시계 + 로그아웃 ── */}
      <header className="bg-nav-bg text-white shrink-0">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
              {time}
            </span>
            <div className="hidden sm:flex flex-col">
              <span className="text-white/70 text-sm font-medium">{date}</span>
              <span className="text-white/50 text-xs">{dayOfWeek}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="sm:hidden text-right">
              <p className="text-white/60 text-xs">
                {date} {dayOfWeek}
              </p>
            </div>
            <LogoutBtn
              variant="ghost"
              className="flex items-center gap-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl px-3 py-2 text-sm"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </LogoutBtn>
          </div>
        </div>
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {/* ── 직원 선택 섹션 ── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            직원 선택
          </label>
          <WorkStatusUserSelect selected={selectedEmployee} onSelect={handleSelectEmployee} />
        </section>

        {/* ── 직원 정보 카드 (선택된 경우) ── */}
        {selectedEmployee ? (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* 아바타 */}
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-mega-secondary/10 shrink-0 overflow-hidden">
                  {getProfileImageUrl(selectedEmployee.profile_image) ? (
                    <img
                      src={getProfileImageUrl(selectedEmployee.profile_image)}
                      alt={selectedEmployee.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-mega-secondary">
                      {selectedEmployee.name.charAt(0)}
                    </span>
                  )}
                </div>
                {/* 이름 + 직급 */}
                <div>
                  <p className="text-xl font-bold text-gray-900">{selectedEmployee.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {POSITION_LABEL[selectedEmployee.position] ?? selectedEmployee.position}
                  </p>
                </div>
              </div>

              {/* 현재 상태 배지 */}
              <div className={cn('flex items-center gap-2 px-4 py-2 rounded-xl', statusMeta.bg)}>
                <span className={cn('size-2.5 rounded-full shrink-0', statusMeta.dot)} />
                <span className={cn('text-sm font-semibold', statusMeta.text)}>
                  {STATUS_LABELS[currentStatus]}
                </span>
              </div>
            </div>
          </section>
        ) : (
          /* 직원 미선택 안내 */
          <section className="flex items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-gray-200 bg-white/50">
            <UserCircle2 className="size-8 text-gray-300" />
            <p className="text-gray-400 text-sm font-medium">
              위에서 직원을 선택하면 근태 버튼이 활성화됩니다.
            </p>
          </section>
        )}

        {/* ── 액션 버튼 ── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            근태 입력
          </label>
          <WorkStatusButtons
            currentStatus={currentStatus}
            isDisabled={!selectedEmployee}
            isSubmitting={isSubmitting}
            submittingAction={submittingAction}
            record={todayRecord ?? null}
            onAction={handleAction}
          />
        </section>

        {/* ── 오늘의 기록 ── */}
        {selectedEmployee && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <WorkStatusHistory record={todayRecord} isLoading={isRecordLoading} />
          </section>
        )}
      </div>
    </div>
  );
}

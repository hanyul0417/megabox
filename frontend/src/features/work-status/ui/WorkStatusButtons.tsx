import { Coffee, LogIn, LogOut, RefreshCcw } from 'lucide-react';
import { memo } from 'react';

import type { WorkAction, WorkCurrentStatus } from '@/entities/work-status/api/dto';

import { ACTION_ENABLED } from '@/entities/work-status/api/dto';
import { cn } from '@/shared/lib/utils';

// ── 버튼 정의 ──────────────────────────────────────────────────────────────
const BUTTONS: {
  action: WorkAction;
  label: string;
  icon: typeof LogIn;
  activeClass: string;
  recordTime?: (record: ActionRecord | null) => string | null;
}[] = [
  {
    action: 'CHECK_IN',
    label: '출근',
    icon: LogIn,
    activeClass: 'bg-green-500 hover:bg-green-600 text-white shadow-green-200',
  },
  {
    action: 'BREAK_START',
    label: '휴식',
    icon: Coffee,
    activeClass: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200',
  },
  {
    action: 'BREAK_END',
    label: '복귀',
    icon: RefreshCcw,
    activeClass: 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-200',
  },
  {
    action: 'CHECK_OUT',
    label: '퇴근',
    icon: LogOut,
    activeClass: 'bg-slate-600 hover:bg-slate-700 text-white shadow-slate-200',
  },
];

interface ActionRecord {
  check_in: string | null;
  break_start: string | null;
  break_end: string | null;
  check_out: string | null;
}

// 백엔드에서 "HH:MM:SS" 형식으로 반환됨
function formatTime(timeString: string | null | undefined): string | null {
  if (!timeString) return null;
  return timeString.slice(0, 5); // "HH:MM"
}

interface WorkStatusButtonsProps {
  currentStatus: WorkCurrentStatus;
  isDisabled: boolean; // 직원 미선택 시 전체 비활성
  isSubmitting: boolean;
  submittingAction: WorkAction | null;
  record: ActionRecord | null;
  onAction: (action: WorkAction) => void;
}

export const WorkStatusButtons = memo(
  ({
    currentStatus,
    isDisabled,
    isSubmitting,
    submittingAction,
    record,
    onAction,
  }: WorkStatusButtonsProps) => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {BUTTONS.map(({ action, label, icon: Icon, activeClass }) => {
          const isEnabled = !isDisabled && ACTION_ENABLED[currentStatus][action];
          const isLoading = isSubmitting && submittingAction === action;

          // 이미 기록된 시간 표시
          const timeMap: Record<WorkAction, string | null> = {
            CHECK_IN: formatTime(record?.check_in),
            BREAK_START: formatTime(record?.break_start),
            BREAK_END: formatTime(record?.break_end),
            CHECK_OUT: formatTime(record?.check_out),
          };
          const recordedTime = timeMap[action];

          return (
            <button
              key={action}
              type="button"
              disabled={!isEnabled || isSubmitting}
              onClick={() => isEnabled && onAction(action)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-2',
                'min-h-[100px] sm:min-h-[120px] rounded-2xl border-2 transition-all duration-150',
                'select-none touch-manipulation',
                isEnabled
                  ? [
                      activeClass,
                      'border-transparent shadow-lg active:scale-[0.96] active:shadow-sm',
                      'cursor-pointer',
                    ]
                  : ['bg-gray-50 border-gray-100 text-gray-300', 'cursor-not-allowed opacity-40'],
                isLoading && 'animate-pulse',
              )}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-7 h-7 border-3 border-white/40 border-t-white rounded-full animate-spin" />
                  <span className="text-sm font-semibold">처리 중...</span>
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-xl',
                      isEnabled ? 'bg-white/20' : 'bg-gray-100',
                    )}
                  >
                    <Icon className="size-6" />
                  </div>
                  <span className="text-base font-bold">{label}</span>
                  {recordedTime && (
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        isEnabled ? 'bg-white/20' : 'bg-gray-200 text-gray-400',
                      )}
                    >
                      {recordedTime}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    );
  },
);

WorkStatusButtons.displayName = 'WorkStatusButtons';

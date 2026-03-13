import { ChevronLeft, ChevronRight, PenLine, Settings2, ShieldCheck } from 'lucide-react';

import { formatWeekRangeParts } from '../model/weekUtils';

import type { ScheduleWeekResponse } from '../model/type';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface WeekNavigatorProps {
  year: number;
  week: number;
  weekDates: Date[];
  scheduleWeek?: ScheduleWeekResponse | null;
  isAdmin?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onStatusChange?: () => void;
}

const WeekNavigator = ({
  weekDates,
  scheduleWeek,
  isAdmin,
  onPrev,
  onNext,
  onToday,
  onStatusChange,
}: WeekNavigatorProps) => {
  const { year, range } = formatWeekRangeParts(weekDates);
  const isConfirmed = scheduleWeek?.status === 'CONFIRMED';

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* 주차 네비게이션 */}
      <div className="flex items-center justify-center gap-2 md:justify-start">
        <button
          type="button"
          onClick={onPrev}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all shrink-0"
          aria-label="이전 주"
        >
          <ChevronLeft className="size-4 text-gray-500" />
        </button>

        <div className="flex flex-col items-center px-4 py-2 rounded-xl border border-gray-200 bg-white min-w-0 shadow-sm sm:px-5 sm:min-w-[200px]">
          <span className="text-[10px] font-medium text-gray-400 leading-none whitespace-nowrap">
            {year}년 {weekDates[0] ? `${weekDates[0].getMonth() + 1}월` : ''}
          </span>
          <span className="text-sm font-bold text-gray-900 mt-0.5 leading-tight whitespace-nowrap">
            {range}
          </span>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all shrink-0"
          aria-label="다음 주"
        >
          <ChevronRight className="size-4 text-gray-500" />
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToday}
          className="h-9 px-3 text-xs text-gray-500 hover:text-mega-secondary hover:bg-mega-secondary/5 rounded-xl shrink-0"
        >
          이번 주
        </Button>
      </div>

      {/* 상태 + 관리자 컨트롤 */}
      <div className="flex items-center justify-center gap-2 md:justify-end">
        {scheduleWeek != null ? (
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold select-none sm:px-4 sm:py-2 sm:text-sm',
              isConfirmed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200',
            )}
          >
            {isConfirmed ? (
              <ShieldCheck className="size-4 shrink-0" />
            ) : (
              <PenLine className="size-4 shrink-0" />
            )}
            {isConfirmed ? '확정됨' : '초안 작성 중'}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-xs font-medium select-none sm:px-4 sm:py-2 sm:text-sm">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            스케줄 없음
          </div>
        )}

        {isAdmin && scheduleWeek != null && (
          <Button
            variant="outline"
            size="sm"
            onClick={onStatusChange}
            className={cn(
              'h-9 text-xs gap-1.5 rounded-xl border transition-colors',
              isConfirmed
                ? 'border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300'
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300',
            )}
          >
            <Settings2 className="size-3.5" />
            {isConfirmed ? '초안으로 변경' : '스케줄 확정'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default WeekNavigator;

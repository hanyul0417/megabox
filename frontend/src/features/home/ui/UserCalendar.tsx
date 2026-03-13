import React from 'react';

import type { HomeScheduleItem } from './ScheduleListItem';

import { cn } from '@/shared/lib/utils';

// ── 타입 ──────────────────────────────────────────────────────────────────

export type UserCalendarProps = {
  scheduleMap: Map<string, HomeScheduleItem[]>;
  isLoading?: boolean;
};

type ShiftType = 'morning' | 'afternoon' | 'night';

type DayCellProps = {
  day: number;
  dateKey: string;
  isToday: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  isCurrentMonth: boolean;
  shifts: ShiftType[];
};

// ── 상수 ──────────────────────────────────────────────────────────────────

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

const SHIFT_DOT: Record<ShiftType, string> = {
  morning: 'bg-sky-400',
  afternoon: 'bg-amber-400',
  night: 'bg-violet-500',
};

const SHIFT_LABEL: Record<ShiftType, string> = {
  morning: '오전',
  afternoon: '오후',
  night: '야간',
};

// ── 유틸 ──────────────────────────────────────────────────────────────────

/** 근무 시작 시간 → 근무 타입 */
function getShiftType(startTime: string): ShiftType {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'night';
}

/**
 * 월 캘린더에 필요한 42셀 날짜 배열 생성 (월요일 시작)
 * - 해당 월에 속하지 않는 셀은 null
 */
function buildCalendarDays(year: number, month: number): (number | null)[] {
  // 해당 월 1일의 요일 (0=일, 1=월, ... 6=토)
  const firstDow = new Date(year, month - 1, 1).getDay();
  // 월요일 시작으로 변환: 월=0, 화=1, ... 일=6
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = Array<number | null>(42).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells[startOffset + d - 1] = d;
  }
  return cells;
}

/** YYYY-MM-DD 형식으로 날짜 키 생성 */
function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── DayCell ────────────────────────────────────────────────────────────────

const DayCell = React.memo(
  ({ day, dateKey, isToday, isSaturday, isSunday, isCurrentMonth, shifts }: DayCellProps) => {
    if (!isCurrentMonth) {
      return <div aria-hidden="true" />;
    }

    // 중복 제거 후 최대 3개까지만 표시
    const uniqueShifts = [...new Set(shifts)].slice(0, 3);
    const hasShift = uniqueShifts.length > 0;

    return (
      <div
        data-date={dateKey}
        className={cn(
          'relative flex flex-col items-center justify-start gap-1',
          'min-h-[44px] md:min-h-[52px] rounded-lg pt-1.5 pb-1 px-0.5',
          'transition-colors duration-100',
          hasShift && !isToday && 'bg-gray-50',
          isToday && 'bg-mega-secondary/10 ring-1 ring-mega-secondary ring-inset',
        )}
      >
        {/* 날짜 숫자 */}
        <span
          className={cn(
            'text-xs md:text-sm leading-none select-none',
            isToday && 'font-bold text-mega-secondary',
            !isToday && isSaturday && 'text-blue-500',
            !isToday && isSunday && 'text-red-400',
            !isToday && !isSaturday && !isSunday && 'text-gray-700',
          )}
        >
          {day}
        </span>

        {/* 근무 타입 dot */}
        {uniqueShifts.length > 0 && (
          <div className="flex items-center gap-0.5 flex-wrap justify-center">
            {uniqueShifts.map((shift) => (
              <span
                key={shift}
                aria-label={SHIFT_LABEL[shift]}
                className={cn('block rounded-full', 'w-1.5 h-1.5 md:w-2 md:h-2', SHIFT_DOT[shift])}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

DayCell.displayName = 'DayCell';

// ── Skeleton ───────────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label="캘린더 불러오는 중">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="h-5 rounded bg-gray-100" />
        ))}
      </div>
      {/* 6행 × 7열 셀 */}
      {Array.from({ length: 6 }).map((_, row) => (
        <div key={row} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, col) => (
            <div key={col} className="h-11 md:h-[52px] rounded-lg bg-gray-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────

function CalendarLegend() {
  return (
    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
      {(Object.entries(SHIFT_LABEL) as [ShiftType, string][]).map(([type, label]) => (
        <div key={type} className="flex items-center gap-1.5">
          <span className={cn('block w-2 h-2 rounded-full shrink-0', SHIFT_DOT[type])} />
          <span className="text-[11px] text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── UserCalendar ───────────────────────────────────────────────────────────

const UserCalendar = ({ scheduleMap, isLoading = false }: UserCalendarProps) => {
  const today = new Date();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  // 현재 표시 월 (기본: 오늘 월)
  const [displayYear, setDisplayYear] = React.useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = React.useState(today.getMonth() + 1);

  // 42셀 날짜 배열
  const calendarDays = React.useMemo(
    () => buildCalendarDays(displayYear, displayMonth),
    [displayYear, displayMonth],
  );

  // 월 이동
  const movePrev = () => {
    if (displayMonth === 1) {
      setDisplayYear((y) => y - 1);
      setDisplayMonth(12);
    } else {
      setDisplayMonth((m) => m - 1);
    }
  };

  const moveNext = () => {
    if (displayMonth === 12) {
      setDisplayYear((y) => y + 1);
      setDisplayMonth(1);
    } else {
      setDisplayMonth((m) => m + 1);
    }
  };

  return (
    <div>
      {/* 월 네비게이터 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={movePrev}
          aria-label="이전 달"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 12L6 8l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <span className="text-sm font-semibold text-gray-800 tabular-nums">
          {displayYear}년 {displayMonth}월
        </span>

        <button
          onClick={moveNext}
          aria-label="다음 달"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d, idx) => (
              <div
                key={d}
                className={cn(
                  'text-center text-[11px] font-medium py-1 select-none',
                  idx === 5 && 'text-blue-500',
                  idx === 6 && 'text-red-400',
                  idx < 5 && 'text-gray-400',
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 (6행 × 7열 = 42셀) */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} aria-hidden="true" />;
              }

              const dateKey = toDateKey(displayYear, displayMonth, day);
              const schedulesOnDay = scheduleMap.get(dateKey) ?? [];
              const shifts = schedulesOnDay.map((s) => getShiftType(s.start_time));

              // 그리드 내 열 인덱스 (0=월 ... 5=토 ... 6=일)
              const colIdx = idx % 7;
              const isSaturday = colIdx === 5;
              const isSunday = colIdx === 6;

              return (
                <DayCell
                  key={dateKey}
                  day={day}
                  dateKey={dateKey}
                  isToday={dateKey === todayKey}
                  isSaturday={isSaturday}
                  isSunday={isSunday}
                  isCurrentMonth={true}
                  shifts={shifts}
                />
              );
            })}
          </div>

          {/* 범례 */}
          <CalendarLegend />
        </>
      )}
    </div>
  );
};

export default UserCalendar;

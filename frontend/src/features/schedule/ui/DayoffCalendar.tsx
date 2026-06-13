import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { DayOffCalendarData, DayOffResponse } from '../model/type';

import { cn } from '@/shared/lib/utils';

interface DayoffCalendarProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  calendarData: DayOffCalendarData;
  myDayoffs: DayOffResponse[];
  holidays?: Record<string, string>; // YYYY-MM-DD → 공휴일명
  onDateClick: (dateStr: string) => void;
}

// 일~토 순서
const DAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 일요일 시작 기준 첫 번째 열 오프셋 (일=0, 월=1, ..., 토=6)
function getSunStartOffset(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

const DayoffCalendar = ({
  year,
  month,
  onMonthChange,
  calendarData,
  myDayoffs,
  holidays = {},
  onDateClick,
}: DayoffCalendarProps) => {
  const today = new Date();
  const todayStr = formatDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const offset = getSunStartOffset(year, month);
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const myActiveDates = new Set(
    myDayoffs.filter((d) => d.status !== 'REJECTED').map((d) => d.request_date),
  );

  const handlePrev = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const handleNext = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-violet-500">
        <button
          onClick={handlePrev}
          className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-white font-bold text-sm">
          {year}년 {month}월
        </span>
        <button
          onClick={handleNext}
          className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* 요일 헤더 — 일~토, 일=빨강, 토=파랑 */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_HEADERS.map((d, i) => (
          <div
            key={d}
            className={cn(
              'text-center py-2 text-xs font-semibold',
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500',
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[68px] border-b border-r border-gray-50"
              />
            );
          }

          const dateStr = formatDateStr(year, month, day);
          const entries = calendarData[dateStr] ?? [];
          const isToday = dateStr === todayStr;
          const isMine = myActiveDates.has(dateStr);
          const colIdx = idx % 7; // 0=일 ~ 6=토
          const holidayLabel = holidays[dateStr];
          const isSat = colIdx === 6;
          const isSunOrHoliday = colIdx === 0 || !!holidayLabel;

          return (
            <div
              key={dateStr}
              onClick={() => onDateClick(dateStr)}
              className={cn(
                'min-h-[68px] p-1 border-b border-r border-gray-50 cursor-pointer transition-colors',
                'hover:bg-violet-50/60',
                isMine && 'bg-violet-50',
                colIdx === 6 && 'border-r-0', // 토요일 열 오른쪽 border 제거
              )}
            >
              {/* 날짜 숫자 */}
              <div
                className={cn(
                  'text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full',
                  isToday
                    ? 'bg-violet-500 text-white'
                    : isSunOrHoliday
                      ? 'text-red-500'
                      : isSat
                        ? 'text-blue-500'
                        : 'text-gray-700',
                )}
              >
                {day}
              </div>

              {/* 공휴일명 */}
              {holidayLabel && (
                <div className="text-[9px] text-red-400 leading-tight truncate mb-0.5 px-0.5">
                  {holidayLabel}
                </div>
              )}

              {/* 직원 이름 칩 */}
              <div className="space-y-0.5 mt-0.5">
                {entries.slice(0, 3).map((entry, i) => (
                  <div
                    key={i}
                    className={cn(
                      'text-[10px] px-1 rounded truncate leading-[14px]',
                      entry.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700',
                    )}
                  >
                    {entry.user_name.slice(0, 3)}
                  </div>
                ))}
                {entries.length > 3 && (
                  <div className="text-[9px] text-gray-400 px-1">+{entries.length - 3}명</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[10px] text-gray-500">승인</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span className="text-[10px] text-gray-500">검토중</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-300 shrink-0" />
          <span className="text-[10px] text-gray-500">내 휴무</span>
        </div>
      </div>
    </div>
  );
};

export default DayoffCalendar;

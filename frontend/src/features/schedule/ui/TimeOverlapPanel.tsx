import { Users2 } from 'lucide-react';

import type { WeekOverlapResponse } from '../model/type';
import { formatDate, WEEKDAY_KO } from '../model/weekUtils';

import { cn } from '@/shared/lib/utils';

interface TimeOverlapPanelProps {
  overlapData?: WeekOverlapResponse;
  weekDates: Date[];
  isLoading?: boolean;
}

// 근무 밀도에 따라 색상 계산
function getDensityColor(count: number, max: number): string {
  if (max === 0 || count === 0) return 'bg-gray-50';
  const ratio = count / max;
  if (ratio >= 0.8) return 'bg-mega/80 text-white';
  if (ratio >= 0.6) return 'bg-mega/60 text-white';
  if (ratio >= 0.4) return 'bg-mega/40 text-mega';
  if (ratio >= 0.2) return 'bg-mega/20 text-mega';
  return 'bg-mega/10 text-mega/70';
}

const TimeOverlapPanel = ({ overlapData, weekDates, isLoading }: TimeOverlapPanelProps) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 animate-pulse rounded" />
          <div className="w-32 h-4 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!overlapData?.days?.length) {
    return null;
  }

  // 전체 최대 동시 근무자 수 계산
  let globalMax = 0;
  for (const day of overlapData.days) {
    for (const slot of day.slots) {
      if (slot.count > globalMax) globalMax = slot.count;
    }
  }

  // 날짜별 슬롯 맵핑
  const dayMap = new Map<string, typeof overlapData.days[0]>();
  for (const day of overlapData.days) {
    dayMap.set(day.work_date, day);
  }

  // 모든 타임 슬롯 수집 (정렬)
  const allSlots = new Set<string>();
  for (const day of overlapData.days) {
    for (const slot of day.slots) {
      allSlots.add(slot.start_time);
    }
  }
  const sortedSlots = Array.from(allSlots).sort();

  if (sortedSlots.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-mega/10 flex items-center justify-center">
            <Users2 className="size-4 text-mega" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900">시간대별 근무 밀도</h3>
            <p className="text-xs text-gray-400">동시 근무 인원수 히트맵</p>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="p-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-16 py-2 text-gray-400 font-medium text-left pl-2">시간</th>
              {weekDates.map((date, idx) => {
                const isSat = idx === 5;
                const isSun = idx === 6;
                return (
                  <th
                    key={formatDate(date)}
                    className={cn(
                      'py-2 text-center font-semibold w-[calc((100%-4rem)/7)]',
                      isSat ? 'text-blue-500' : isSun ? 'text-red-500' : 'text-gray-600',
                    )}
                  >
                    <div>{WEEKDAY_KO[idx]}</div>
                    <div className="text-[10px] font-normal text-gray-400">{date.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedSlots.map((slotTime) => (
              <tr key={slotTime}>
                <td className="py-0.5 text-gray-400 font-medium pl-2">
                  {slotTime.slice(0, 5)}
                </td>
                {weekDates.map((date) => {
                  const dateKey = formatDate(date);
                  const dayData = dayMap.get(dateKey);
                  const slot = dayData?.slots.find((s) => s.start_time === slotTime);
                  const count = slot?.count ?? 0;
                  const employees = slot?.employees ?? [];

                  return (
                    <td key={dateKey} className="py-0.5 px-0.5">
                      <div
                        className={cn(
                          'relative group rounded-lg h-7 flex items-center justify-center text-[10px] font-semibold cursor-default transition-all',
                          getDensityColor(count, globalMax),
                        )}
                        title={
                          employees.length > 0
                            ? employees.map((e) => e.name).join(', ')
                            : '근무 없음'
                        }
                      >
                        {count > 0 ? count : ''}

                        {/* Tooltip */}
                        {employees.length > 0 && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 hidden group-hover:block pointer-events-none">
                            <div className="bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl">
                              <div className="font-semibold mb-0.5 text-gray-300">
                                {slotTime.slice(0, 5)} 동시 {count}명
                              </div>
                              {employees.map((emp) => (
                                <div key={emp.user_id}>
                                  {emp.name}{' '}
                                  <span className="text-gray-400">({emp.position})</span>
                                </div>
                              ))}
                            </div>
                            <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
          <span className="text-[10px] text-gray-400 font-medium">밀도:</span>
          {[
            { label: '낮음', color: 'bg-mega/10' },
            { label: '', color: 'bg-mega/30' },
            { label: '', color: 'bg-mega/50' },
            { label: '', color: 'bg-mega/70' },
            { label: '높음', color: 'bg-mega/90' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={cn('w-3 h-3 rounded', item.color)} />
              {item.label && (
                <span className="text-[10px] text-gray-400">{item.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimeOverlapPanel;

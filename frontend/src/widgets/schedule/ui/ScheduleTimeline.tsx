import type { ScheduleResponse } from '@/features/schedule/model/type';

import { ScheduleCard } from '@/features/schedule';
import {
  assignColumns,
  TIMELINE_END_HOUR,
  TIMELINE_HEIGHT,
  TIMELINE_HOURS,
  TIMELINE_START_HOUR,
} from '@/features/schedule/model/timelineUtils';
import { formatDate, WEEKDAY_KO } from '@/features/schedule/model/weekUtils';
import { cn } from '@/shared/lib/utils';

type ScheduleTimelineProps = {
  weekDates: Date[];
  schedulesByDate: Record<string, ScheduleResponse[]>;
  isLoading: boolean;
  isAdmin: boolean;
  onEditSchedule: (schedule: ScheduleResponse) => void;
  onDeleteSchedule: (id: number) => void;
};

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

const ScheduleTimeline = ({
  weekDates,
  schedulesByDate,
  isLoading,
  isAdmin,
  onEditSchedule,
  onDeleteSchedule,
}: ScheduleTimelineProps) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
      {/* Horizontal scroll wrapper */}
      <div className="overflow-x-auto">
        {/* Vertical scroll container — header + body share the same scroll context */}
        <div className="overflow-y-auto" style={{ maxHeight: '750px', minWidth: '752px' }}>
          {/* Day Header Row — sticky */}
          <div
            className="grid border-b border-gray-100 bg-gray-50/70 sticky top-0 z-10"
            style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
          >
            {/* Corner */}
            <div className="border-r border-gray-100 py-3 flex items-end justify-center pb-1">
              <span className="text-[9px] text-gray-300 font-medium">시간</span>
            </div>
            {/* Day headers */}
            {weekDates.map((date, idx) => {
              const isTodayDate = isToday(date);
              const isSat = idx === 5;
              const isSun = idx === 6;
              return (
                <div
                  key={formatDate(date)}
                  className={cn(
                    'flex flex-col items-center py-3 border-r border-gray-100 last:border-r-0',
                    isTodayDate && 'bg-mega-secondary/5',
                  )}
                >
                  <span
                    className={cn(
                      'text-[11px] font-semibold leading-none mb-2',
                      isTodayDate
                        ? 'text-mega-secondary'
                        : isSat
                          ? 'text-blue-500'
                          : isSun
                            ? 'text-red-500'
                            : 'text-gray-400',
                    )}
                  >
                    {WEEKDAY_KO[idx]}
                  </span>
                  <div
                    className={cn(
                      'w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold transition-all',
                      isTodayDate
                        ? 'bg-mega-secondary text-white shadow-lg shadow-mega-secondary/30'
                        : isSat
                          ? 'text-blue-600 hover:bg-blue-50'
                          : isSun
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline Body */}
          <div
            className="grid"
            style={{ gridTemplateColumns: '52px repeat(7, 1fr)', height: `${TIMELINE_HEIGHT}px` }}
          >
            {/* Time Axis */}
            <div
              className="relative border-r border-gray-100 bg-slate-50/50"
              style={{ height: `${TIMELINE_HEIGHT}px` }}
            >
              {Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => i + TIMELINE_START_HOUR).map(
                (hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 flex items-center justify-end pr-2"
                    style={{
                      top: `${((hour - TIMELINE_START_HOUR) / TIMELINE_HOURS) * TIMELINE_HEIGHT}px`,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    {hour < TIMELINE_END_HOUR && (
                      <span
                        className={cn(
                          'text-[9px] font-medium whitespace-nowrap',
                          hour >= 24
                            ? 'text-purple-400'
                            : hour % 2 === 0
                              ? 'text-gray-400'
                              : 'text-gray-300',
                        )}
                      >
                        {String(hour >= 24 ? hour - 24 : hour).padStart(2, '0')}
                        {hour >= 24 && <span className="text-[7px]">+1</span>}
                      </span>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* Day Columns */}
            {weekDates.map((date, idx) => {
              const key = formatDate(date);
              const daySchedules = schedulesByDate[key] ?? [];
              const blocks = assignColumns(daySchedules);
              const isTodayDate = isToday(date);
              const isSat = idx === 5;
              const isSun = idx === 6;

              return (
                <div
                  key={key}
                  className={cn(
                    'relative border-r border-gray-100 last:border-r-0 cursor-default',
                    isTodayDate && 'bg-mega-secondary/[0.04]',
                    isSat && !isTodayDate && 'bg-blue-50/30',
                    isSun && !isTodayDate && 'bg-red-50/30',
                  )}
                  style={{ height: `${TIMELINE_HEIGHT}px` }}
                >
                  {/* Hour grid lines */}
                  {Array.from(
                    { length: TIMELINE_HOURS + 1 },
                    (_, i) => i + TIMELINE_START_HOUR,
                  ).map((hour) => (
                    <div
                      key={hour}
                      className={cn(
                        'absolute left-0 right-0 border-t pointer-events-none',
                        hour % 2 === 0 ? 'border-gray-100' : 'border-gray-50/70',
                      )}
                      style={{
                        top: `${((hour - TIMELINE_START_HOUR) / TIMELINE_HOURS) * TIMELINE_HEIGHT}px`,
                      }}
                    />
                  ))}

                  {/* Loading skeletons */}
                  {isLoading && (
                    <>
                      <div
                        className="absolute left-1 right-1 rounded-md bg-gray-200 animate-pulse"
                        style={{ top: '80px', height: '72px' }}
                      />
                      <div
                        className="absolute left-1 right-1 rounded-md bg-gray-100 animate-pulse"
                        style={{ top: '200px', height: '56px' }}
                      />
                    </>
                  )}

                  {/* Schedule blocks */}
                  {!isLoading &&
                    blocks.map(({ schedule, col, totalCols }) => (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        isAdmin={isAdmin}
                        onEdit={onEditSchedule}
                        onDelete={onDeleteSchedule}
                        col={col}
                        totalCols={totalCols}
                        containerHeight={TIMELINE_HEIGHT}
                      />
                    ))}

                  {/* Empty state */}
                  {!isLoading && daySchedules.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-gray-200/80 font-medium">비어있음</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTimeline;

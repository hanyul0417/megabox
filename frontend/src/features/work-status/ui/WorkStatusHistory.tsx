import { Clock, Coffee, LogIn, LogOut, RefreshCcw } from 'lucide-react';
import { memo } from 'react';

import type { WorkStatusResponseDTO } from '@/entities/work-status/api/dto';

import { cn } from '@/shared/lib/utils';

// ── 유틸 ──────────────────────────────────────────────────────────────────
// 백엔드에서 "HH:MM:SS" 형식으로 반환됨
function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return '-';
  return timeString.slice(0, 5); // "HH:MM"
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

// ── 타임라인 아이템 ────────────────────────────────────────────────────────
interface TimelineItem {
  icon: typeof LogIn;
  label: string;
  time: string | null | undefined;
  color: string;
  iconBg: string;
}

interface WorkStatusHistoryProps {
  record: WorkStatusResponseDTO | null | undefined;
  isLoading?: boolean;
}

export const WorkStatusHistory = memo(({ record, isLoading }: WorkStatusHistoryProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  const items: TimelineItem[] = [
    {
      icon: LogIn,
      label: '출근',
      time: record?.check_in,
      color: 'text-green-700',
      iconBg: 'bg-green-50 text-green-600',
    },
    {
      icon: Coffee,
      label: '휴식 시작',
      time: record?.break_start,
      color: 'text-amber-700',
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      icon: RefreshCcw,
      label: '복귀',
      time: record?.break_end,
      color: 'text-blue-700',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      icon: LogOut,
      label: '퇴근',
      time: record?.check_out,
      color: 'text-slate-700',
      iconBg: 'bg-slate-100 text-slate-600',
    },
  ];

  const hasAnyRecord =
    record && (record.check_in || record.break_start || record.break_end || record.check_out);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
        <Clock className="size-4" />
        오늘의 근무 기록
      </h3>

      {!hasAnyRecord ? (
        <div className="flex items-center justify-center py-6 rounded-xl border-2 border-dashed border-gray-100">
          <p className="text-sm text-gray-400">아직 기록된 근태가 없습니다.</p>
        </div>
      ) : (
        <div>
          {/* 타임라인 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
            {items.map((item, idx) => {
              const Icon = item.icon;
              const hasTime = !!item.time;
              const isLast = idx === items.length - 1;

              return (
                <div
                  key={item.label}
                  className="flex sm:flex-col sm:flex-1 items-center gap-2 sm:gap-1"
                >
                  <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-1 flex-1">
                    {/* 아이콘 + 시간 */}
                    <div
                      className={cn(
                        'flex items-center justify-center w-9 h-9 rounded-xl shrink-0',
                        hasTime ? item.iconBg : 'bg-gray-50 text-gray-300',
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="sm:text-center">
                      <p
                        className={cn(
                          'text-xs font-medium',
                          hasTime ? item.color : 'text-gray-300',
                        )}
                      >
                        {item.label}
                      </p>
                      <p
                        className={cn(
                          'text-sm font-bold',
                          hasTime ? 'text-gray-900' : 'text-gray-300',
                        )}
                      >
                        {hasTime ? formatTime(item.time) : '-'}
                      </p>
                    </div>
                  </div>

                  {/* 세로 연결선 (모바일) */}
                  {!isLast && <div className="sm:hidden self-center w-px h-4 bg-gray-200 ml-4" />}
                </div>
              );
            })}
          </div>

          {/* 근무 요약 */}
          {record && (record.total_work_hours != null || (record.total_work_minutes ?? 0) > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6">
              <div>
                <p className="text-xs text-gray-400">총 근무 시간</p>
                <p className="text-sm font-bold text-gray-800">
                  {record.total_work_hours != null
                    ? `${record.total_work_hours.toFixed(2)}h`
                    : formatMinutes(record.total_work_minutes ?? 0)}
                </p>
              </div>
              {record.night_hours != null && record.night_hours > 0 && (
                <div>
                  <p className="text-xs text-gray-400">야간 시간</p>
                  <p className="text-sm font-bold text-indigo-600">
                    {record.night_hours.toFixed(2)}h
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

WorkStatusHistory.displayName = 'WorkStatusHistory';

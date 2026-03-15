import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { ScheduleResponse } from '@/features/schedule/model/type';

import { formatDate, WEEKDAY_KO } from '@/features/schedule/model/weekUtils';
import { getPositionBadgeStyle, getPositionBgColor } from '@/entities/user/model/position';
import ConfirmDialog from '@/shared/components/ui/confirm-dialog';
import { cn } from '@/shared/lib/utils';

// ─── 데이터 변환 ──────────────────────────────────────────

const POSITION_ORDER: Record<string, number> = {
  관리자: 0,
  리더: 1,
  크루: 2,
  미화: 3,
  시스템: 4,
};

type RosterRow = {
  userId: number;
  userName: string;
  userPosition: string;
  schedulesByDate: Record<string, ScheduleResponse[]>;
};

function buildRosterRows(schedules: ScheduleResponse[]): RosterRow[] {
  const map = new Map<number, RosterRow>();
  for (const s of schedules) {
    if (!map.has(s.user_id)) {
      map.set(s.user_id, {
        userId: s.user_id,
        userName: s.user_name,
        userPosition: s.user_position,
        schedulesByDate: {},
      });
    }
    const row = map.get(s.user_id)!;
    if (!row.schedulesByDate[s.work_date]) {
      row.schedulesByDate[s.work_date] = [];
    }
    row.schedulesByDate[s.work_date].push(s);
  }
  return [...map.values()].sort(
    (a, b) =>
      (POSITION_ORDER[a.userPosition] ?? 99) - (POSITION_ORDER[b.userPosition] ?? 99) ||
      a.userName.localeCompare(b.userName, 'ko'),
  );
}

function isToday(date: Date): boolean {
  const t = new Date();
  return (
    date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate()
  );
}

// ─── 셀 컴포넌트 ──────────────────────────────────────────

type ScheduleCellProps = {
  schedules: ScheduleResponse[];
  isAdmin: boolean;
  onEdit: (s: ScheduleResponse) => void;
  onDelete: (id: number) => void;
};

const ScheduleCell = ({ schedules, isAdmin, onEdit, onDelete }: ScheduleCellProps) => {
  const [deleteTarget, setDeleteTarget] = useState<ScheduleResponse | null>(null);

  if (schedules.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[36px]">
        <span className="text-gray-200 text-[10px]">—</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 py-1.5 px-0.5">
      {schedules.map((s) => {
        const isOvernight = s.end_time <= s.start_time;
        return (
          <div key={s.id} className="relative group">
            <div
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold text-white text-center leading-tight',
                getPositionBgColor(s.user_position),
              )}
            >
              {s.start_time.slice(0, 5)}~{s.end_time.slice(0, 5)}
              {isOvernight && (
                <span className="ml-0.5 text-[8px] opacity-80">+1</span>
              )}
            </div>

            {isAdmin && (
              <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-0.5 bg-black/30 rounded">
                <button
                  type="button"
                  className="p-0.5 rounded bg-white/20 hover:bg-white/50 transition-colors"
                  onClick={() => onEdit(s)}
                  aria-label="수정"
                >
                  <Pencil className="size-2.5 text-white" />
                </button>
                <button
                  type="button"
                  className="p-0.5 rounded bg-white/20 hover:bg-red-500/80 transition-colors"
                  onClick={() => setDeleteTarget(s)}
                  aria-label="삭제"
                >
                  <Trash2 className="size-2.5 text-white" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      <ConfirmDialog
        open={!!deleteTarget}
        title="스케줄 삭제"
        description={
          deleteTarget
            ? `${deleteTarget.user_name}님의 ${deleteTarget.work_date} ${deleteTarget.start_time}~${deleteTarget.end_time} 스케줄을 삭제하시겠습니까? 관련된 근무교대 신청도 함께 삭제됩니다.`
            : ''
        }
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

// ─── 로스터 뷰 ────────────────────────────────────────────

type RosterViewProps = {
  weekDates: Date[];
  schedules: ScheduleResponse[];
  isLoading: boolean;
  isAdmin: boolean;
  onEditSchedule: (schedule: ScheduleResponse) => void;
  onDeleteSchedule: (id: number) => void;
};

const RosterView = ({
  weekDates,
  schedules,
  isLoading,
  isAdmin,
  onEditSchedule,
  onDeleteSchedule,
}: RosterViewProps) => {
  const rows = buildRosterRows(schedules);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          {/* ── 헤더 ── */}
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              {/* 이름 열 헤더 */}
              <th className="sticky left-0 z-10 bg-gray-50/70 border-r border-gray-100 w-[110px] px-3 py-3 text-left">
                <span className="text-[11px] font-semibold text-gray-400">직원</span>
              </th>

              {weekDates.map((date, idx) => {
                const isTodayDate = isToday(date);
                const isSat = idx === 5;
                const isSun = idx === 6;
                return (
                  <th
                    key={formatDate(date)}
                    className={cn(
                      'border-r border-gray-100 last:border-r-0 py-3 text-center',
                      isTodayDate && 'bg-mega-secondary/5',
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          'text-[11px] font-semibold leading-none',
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
                          'w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all',
                          isTodayDate
                            ? 'bg-mega-secondary text-white shadow-md shadow-mega-secondary/30'
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
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── 바디 ── */}
          <tbody>
            {/* 로딩 스켈레톤 */}
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="sticky left-0 bg-white border-r border-gray-100 px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="h-3.5 w-14 bg-gray-200 animate-pulse rounded" />
                      <div className="h-3 w-8 bg-gray-100 animate-pulse rounded-full" />
                    </div>
                  </td>
                  {weekDates.map((d) => (
                    <td key={formatDate(d)} className="border-r border-gray-50 px-1 py-2">
                      {Math.random() > 0.45 && (
                        <div className="h-5 bg-gray-100 animate-pulse rounded mx-1" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}

            {/* 빈 상태 */}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-12 text-sm text-gray-300 font-medium"
                >
                  이번 주 스케줄이 없습니다
                </td>
              </tr>
            )}

            {/* 직원 행 */}
            {!isLoading &&
              rows.map((row) => (
                <tr
                  key={row.userId}
                  className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/40 transition-colors"
                >
                  {/* 이름 셀 - sticky */}
                  <td className="sticky left-0 bg-white border-r border-gray-100 px-3 py-2 z-10">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] font-semibold text-gray-800 truncate max-w-[85px]">
                        {row.userName}
                      </span>
                      <span
                        className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded-full border font-medium w-fit whitespace-nowrap',
                          getPositionBadgeStyle(row.userPosition),
                        )}
                      >
                        {row.userPosition}
                      </span>
                    </div>
                  </td>

                  {/* 요일 셀 */}
                  {weekDates.map((date, idx) => {
                    const key = formatDate(date);
                    const daySchedules = row.schedulesByDate[key] ?? [];
                    const isTodayDate = isToday(date);
                    const isSat = idx === 5;
                    const isSun = idx === 6;
                    return (
                      <td
                        key={key}
                        className={cn(
                          'border-r border-gray-50 last:border-r-0 px-1 align-top',
                          isTodayDate && 'bg-mega-secondary/[0.03]',
                          isSat && !isTodayDate && 'bg-blue-50/20',
                          isSun && !isTodayDate && 'bg-red-50/20',
                        )}
                      >
                        <ScheduleCell
                          schedules={daySchedules}
                          isAdmin={isAdmin}
                          onEdit={onEditSchedule}
                          onDelete={onDeleteSchedule}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RosterView;

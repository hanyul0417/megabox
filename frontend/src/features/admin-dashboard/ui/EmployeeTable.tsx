import { AlertCircle, CalendarOff } from 'lucide-react';

import type { EmployeeDetail } from '../model/type';

import { getPositionBadgeStyle, getAvatarBg } from '@/entities/user/model/position';
import { getProfileImageUrl } from '@/shared/lib/avatar';
import { cn } from '@/shared/lib/utils';

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('ko-KR');
const fmtH = (h: number) => `${h.toFixed(1)}h`;

/** 이름 첫 글자 */
const initials = (name: string) => name.slice(0, 1);

/** 실제/예정 시간 비율로 색상 결정 */
function hoursColor(actual: number, scheduled: number): string {
  if (scheduled === 0) return 'text-gray-400';
  const ratio = actual / scheduled;
  if (ratio >= 0.9) return 'text-emerald-600';
  if (ratio >= 0.5) return 'text-amber-500';
  return 'text-red-500';
}

/** 예정 대비 실제 차이 표시 */
function HoursDiff({ actual, scheduled }: { actual: number; scheduled: number }) {
  if (scheduled === 0 && actual === 0) return <span className="text-gray-300">—</span>;
  const diff = actual - scheduled;
  if (diff === 0) return null;
  return (
    <span
      className={cn(
        'ml-1 text-[10px] font-medium',
        diff > 0 ? 'text-emerald-500' : 'text-red-400',
      )}
    >
      {diff > 0 ? '+' : ''}
      {diff.toFixed(1)}h
    </span>
  );
}

// ─── 스켈레톤 ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="h-4 w-24 bg-gray-100 animate-pulse rounded" />
        <div className="h-3 w-36 bg-gray-100 animate-pulse rounded mt-1.5" />
      </div>
      <div className="p-4 space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <div className="size-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3.5 w-20 bg-gray-100 animate-pulse rounded" />
              <div className="h-3 w-12 bg-gray-100 animate-pulse rounded" />
            </div>
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="hidden sm:block h-3.5 w-16 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface EmployeeTableProps {
  employees: EmployeeDetail[];
  isLoading?: boolean;
}

const EmployeeTable = ({ employees, isLoading }: EmployeeTableProps) => {
  if (isLoading) return <TableSkeleton />;

  if (employees.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <p className="text-sm text-gray-400">해당 월에 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 패널 헤더 */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">직원별 상세</h3>
          <p className="text-xs text-gray-400 mt-0.5">스케줄 vs 실제 근태 비교</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-400 inline-block" />
            90%↑
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-400 inline-block" />
            50~90%
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-red-400 inline-block" />
            50%↓
          </span>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm border-collapse">
          <thead>
            <tr className="bg-nav-bg text-white text-xs">
              <th className="px-5 py-3 text-left font-semibold min-w-[150px]">직원</th>
              <th className="px-4 py-3 text-right font-semibold">
                <div className="flex flex-col items-end leading-tight">
                  <span>근무시간</span>
                  <span className="text-white/50 font-normal text-[10px]">실제 / 예정</span>
                </div>
              </th>
              <th className="px-4 py-3 text-right font-semibold">
                <div className="flex flex-col items-end leading-tight">
                  <span>급여</span>
                  <span className="text-white/50 font-normal text-[10px]">실제 / 예정</span>
                </div>
              </th>
              <th className="px-4 py-3 text-center font-semibold w-20">휴무</th>
              <th className="px-4 py-3 text-center font-semibold w-20">미출근</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const hasAbsent = emp.absent_days > 0;
              const avatarCls = getAvatarBg(emp.position);
              const badgeCls = getPositionBadgeStyle(emp.position);
              const actualHoursColor = hoursColor(emp.actual_hours, emp.scheduled_hours);

              return (
                <tr
                  key={emp.user_id}
                  className={cn(
                    'border-t border-gray-50 transition-colors',
                    hasAbsent
                      ? 'bg-red-50/40 hover:bg-red-50/60'
                      : 'hover:bg-gray-50/60',
                  )}
                >
                  {/* 직원 이름 + 직급 */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      {getProfileImageUrl(emp.profile_image) ? (
                        <img
                          src={getProfileImageUrl(emp.profile_image)}
                          alt={emp.name}
                          className="size-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className={cn(
                            'size-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                            avatarCls,
                          )}
                        >
                          {initials(emp.name)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 leading-none">{emp.name}</p>
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full border font-medium mt-0.5 inline-block',
                            badgeCls,
                          )}
                        >
                          {emp.position}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 근무시간: 실제 / 예정 */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center">
                        <span className={cn('font-bold text-sm', actualHoursColor)}>
                          {fmtH(emp.actual_hours)}
                        </span>
                        <HoursDiff actual={emp.actual_hours} scheduled={emp.scheduled_hours} />
                      </div>
                      <span className="text-[11px] text-gray-400">
                        예정 {fmtH(emp.scheduled_hours)}
                      </span>
                    </div>
                  </td>

                  {/* 급여: 실제 / 예정 */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-bold text-sm text-gray-900">
                        {fmt(emp.actual_gross)}원
                      </span>
                      <span className="text-[11px] text-gray-400">
                        예정 {fmt(emp.scheduled_gross)}원
                      </span>
                    </div>
                  </td>

                  {/* 휴무 */}
                  <td className="px-4 py-3 text-center">
                    {emp.dayoff_count > 0 ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200">
                        <CalendarOff className="size-3 text-sky-500" />
                        <span className="text-xs font-semibold text-sky-600">
                          {emp.dayoff_count}일
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  {/* 미출근 */}
                  <td className="px-4 py-3 text-center">
                    {emp.absent_days > 0 ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200">
                        <AlertCircle className="size-3 text-red-400" />
                        <span className="text-xs font-semibold text-red-600">
                          {emp.absent_days}일
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeTable;

import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  LayoutDashboard,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

import type { PendingUserDTO } from '@/features/admin/api/dto';
import type { DashboardResponse, EmployeeDetail } from '@/features/admin-dashboard/model/type';
import type { PayrollData } from '@/features/pay/model/type';
import type { DayOffResponse, ShiftRequestResponse } from '@/features/schedule/model/type';

import {
  useApproveUserMutation,
  usePendingUsersQuery,
  useRejectUserMutation,
} from '@/features/admin/api/queries';
import { useAdminDashboardQuery } from '@/features/admin-dashboard';
import { usePayrollQuery } from '@/features/pay/api/queries';
import {
  useAdminDayOffsQuery,
  useAdminShiftRequestsQuery,
  useApproveDayOffMutation,
  useApproveShiftMutation,
  useRejectDayOffMutation,
  useRejectShiftMutation,
} from '@/features/schedule/api/queries';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

// ── 타입 ──────────────────────────────────────────────────────────────────────

type MainTab = 'payroll' | 'approvals';

type RejectTarget =
  | { kind: 'user'; id: number; name: string }
  | { kind: 'dayoff'; id: number; name: string }
  | { kind: 'shift'; id: number; name: string };

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString();
}

// ── 스타일 상수 ───────────────────────────────────────────────────────────────

const mainTabCls = (active: boolean) =>
  cn(
    'relative flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
    active
      ? 'bg-mega text-white shadow-sm'
      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/80',
  );

// ── KPI 카드 ──────────────────────────────────────────────────────────────────

type KpiCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  onClick?: () => void;
};

function KpiCard({ icon, label, value, sub, accent, onClick }: KpiCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3',
        onClick &&
          'cursor-pointer hover:shadow-md hover:border-gray-200 active:scale-[0.99] transition-all duration-150',
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-xl',
            accent ?? 'bg-gray-50',
          )}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {onClick && <p className="text-[11px] text-mega/50 mt-1.5 font-medium">상세 보기 →</p>}
      </div>
    </div>
  );
}

// ── 월 선택기 ─────────────────────────────────────────────────────────────────

type MonthSelectorProps = {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
};

function MonthSelector({ year, month, onPrev, onNext }: MonthSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrev}
        className="h-8 w-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
        aria-label="이전 월"
      >
        <ChevronLeft className="size-4 text-gray-500" />
      </button>
      <div className="px-4 py-1.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900 min-w-[110px] text-center">
        {year}년 {month}월
      </div>
      <button
        type="button"
        onClick={onNext}
        className="h-8 w-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
        aria-label="다음 월"
      >
        <ChevronRight className="size-4 text-gray-500" />
      </button>
    </div>
  );
}

// ── 급여 상세 슬라이드 패널 ───────────────────────────────────────────────────

type PayslipRowProps = { label: string; value: number; bold?: boolean };

function PayslipRow({ label, value, bold = false }: PayslipRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-1.5', bold && 'font-semibold')}>
      <span className={cn('text-sm', bold ? 'text-gray-900' : 'text-gray-600')}>{label}</span>
      <span className={cn('text-sm tabular-nums', bold ? 'text-gray-900' : 'text-gray-700')}>
        {fmt(value)}원
      </span>
    </div>
  );
}

type PayslipPanelProps = {
  employee: PayrollData | null;
  open: boolean;
  onClose: () => void;
};

function PayslipPanel({ employee, open, onClose }: PayslipPanelProps) {
  if (!employee) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0 overflow-hidden">
        {/* 헤더 */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-lg font-bold text-gray-900 truncate">
                {employee.name}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                  {employee.position ?? '직급 없음'}
                </span>
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  근태기록 기반
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="닫기"
            >
              <X className="size-4 text-gray-400" />
            </button>
          </div>
        </SheetHeader>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* 지급 항목 */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              지급 항목
            </h3>
            <div className="bg-gray-50 rounded-xl px-4 py-1 divide-y divide-gray-100">
              <PayslipRow label="주간급" value={employee.day_wage} />
              <PayslipRow label="야간급" value={employee.night_wage} />
              <PayslipRow label="주휴수당" value={employee.weekly_allowance_pay} />
              <PayslipRow label="공휴일수당" value={employee.holiday_pay} />
              <PayslipRow label="연차수당" value={employee.annual_leave_pay} />
              <PayslipRow label="총급여" value={employee.gross_pay} bold />
            </div>
          </div>

          {/* 공제 항목 */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              공제 항목
            </h3>
            <div className="bg-gray-50 rounded-xl px-4 py-1 divide-y divide-gray-100">
              <PayslipRow label="건강보험" value={employee.insurance_health} />
              <PayslipRow label="장기요양" value={employee.insurance_care} />
              <PayslipRow label="고용보험" value={employee.insurance_employment} />
              <PayslipRow label="국민연금" value={employee.insurance_pension} />
              <PayslipRow label="공제 합계" value={employee.total_deduction} bold />
            </div>
          </div>

          {/* 실수령액 */}
          <div className="rounded-2xl bg-mega/5 border border-mega/15 px-5 py-4">
            <p className="text-xs font-semibold text-mega/60 mb-1">실수령액</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {fmt(employee.net_pay)}
              <span className="text-base font-normal text-gray-500 ml-1">원</span>
            </p>
          </div>

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            근태기록 기반 급여입니다. 최종 확정 전 변경될 수 있습니다.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── 인건비 상세 공통 유틸 ─────────────────────────────────────────────────────

function fmtH(h: number): string {
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(2)}h`;
}

// ── 이번달 인건비 상세 패널 ───────────────────────────────────────────────────

type ActualLaborDetailSheetProps = {
  open: boolean;
  onClose: () => void;
  employees: PayrollData[];
  year: number;
  month: number;
};

function ActualLaborDetailSheet({
  open,
  onClose,
  employees,
  year,
  month,
}: ActualLaborDetailSheetProps) {
  const totalGross = employees.reduce((s, e) => s + e.gross_pay, 0);

  const colSum = (key: keyof PayrollData) => employees.reduce((s, e) => s + (e[key] as number), 0);

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:w-[640px] flex flex-col p-0 overflow-hidden">
        {/* 헤더 */}
        <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-lg font-bold text-gray-900">
                이번달 인건비 상세
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  근태기록 기반
                </span>
                <span className="text-xs text-gray-500">
                  {year}년 {month}월
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="닫기"
            >
              <X className="size-4 text-gray-400" />
            </button>
          </div>

          {/* 요약 */}
          <div className="mt-4 mb-4 bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">급여총액 합계 (세전)</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums mt-0.5">
              {fmt(totalGross)}
              <span className="text-base font-normal text-gray-500 ml-1">원</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">직원 {employees.length}명</p>
          </div>
        </SheetHeader>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto border-t border-gray-100">
          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <Users className="size-8 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">급여 데이터가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[580px]">
                <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      이름
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      직급
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      주간급
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      야간급
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      주휴수당
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      공휴일
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      연차
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      총급여
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.map((emp) => (
                    <tr key={emp.user_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {emp.name}
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {emp.position ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">
                        {fmt(emp.day_wage)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">
                        {fmt(emp.night_wage)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">
                        {fmt(emp.weekly_allowance_pay)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">
                        {fmt(emp.holiday_pay)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">
                        {fmt(emp.annual_leave_pay)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap">
                        {fmt(emp.gross_pay)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={2} className="px-4 py-3 font-bold text-gray-700 text-sm">
                      합계
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-gray-700 whitespace-nowrap">
                      {fmt(colSum('day_wage'))}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-gray-700 whitespace-nowrap">
                      {fmt(colSum('night_wage'))}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-gray-700 whitespace-nowrap">
                      {fmt(colSum('weekly_allowance_pay'))}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-gray-700 whitespace-nowrap">
                      {fmt(colSum('holiday_pay'))}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-gray-700 whitespace-nowrap">
                      {fmt(colSum('annual_leave_pay'))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-900 whitespace-nowrap">
                      {fmt(totalGross)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <p className="text-xs text-gray-400 text-center">
            급여명세서에 등록된 총급여(세전)의 합계입니다. 공제 전 금액입니다.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── 예상 인건비 상세 패널 ─────────────────────────────────────────────────────

type FormulaRowProps = {
  label: string;
  formula: string;
  result: number;
  highlight?: boolean;
  dimmed?: boolean;
};

function FormulaRow({
  label,
  formula,
  result,
  highlight = false,
  dimmed = false,
}: FormulaRowProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 py-1', dimmed && 'opacity-40')}>
      <div className="flex flex-col min-w-0">
        <span className={cn('text-xs font-medium', highlight ? 'text-gray-900' : 'text-gray-600')}>
          {label}
        </span>
        {formula && <span className="text-[11px] text-gray-400 mt-0.5">{formula}</span>}
      </div>
      <span
        className={cn(
          'text-xs tabular-nums shrink-0 whitespace-nowrap',
          highlight ? 'font-bold text-gray-900' : 'font-medium text-gray-700',
        )}
      >
        {fmt(result)}원
      </span>
    </div>
  );
}

type ScheduledLaborDetailSheetProps = {
  open: boolean;
  onClose: () => void;
  perEmployee: EmployeeDetail[];
  year: number;
  month: number;
  isLoading: boolean;
};

function ScheduledLaborDetailSheet({
  open,
  onClose,
  perEmployee,
  year,
  month,
  isLoading,
}: ScheduledLaborDetailSheetProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalGross = perEmployee.reduce((s, e) => s + e.scheduled_gross, 0);
  const totalHours = perEmployee.reduce((s, e) => s + e.scheduled_hours, 0);

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:w-[520px] flex flex-col p-0 overflow-hidden">
        {/* 헤더 */}
        <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-lg font-bold text-gray-900">예상 인건비 상세</SheetTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  스케줄 기반
                </span>
                <span className="text-xs text-gray-500">
                  {year}년 {month}월
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="닫기"
            >
              <X className="size-4 text-gray-400" />
            </button>
          </div>

          {/* 요약 */}
          <div className="mt-4 bg-amber-50 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700/70">예상 총인건비</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums mt-0.5">
              {fmt(totalGross)}
              <span className="text-base font-normal text-gray-500 ml-1">원</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              직원 {perEmployee.length}명 · 총 {totalHours.toFixed(1)}h
            </p>
          </div>

          {/* 계산 방식 안내 */}
          <div className="mt-3 mb-4 bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-gray-600 mb-1.5">계산 방식</p>
            <ul className="space-y-1 text-[11px] text-gray-500 leading-relaxed">
              <li>
                • <span className="font-medium text-gray-700">주간급</span> = 시급 × 주간시간
                (06~22시)
              </li>
              <li>
                • <span className="font-medium text-gray-700">야간급</span> = 시급 × 야간시간
                (22~06시) × <span className="text-amber-600 font-semibold">1.5배</span>
              </li>
              <li>
                • <span className="font-medium text-gray-700">주휴수당</span> = 시급 × (주 근무합계
                ÷ 5) — 주 15h 이상 시
              </li>
              <li>
                • <span className="font-medium text-gray-700">공휴일수당</span> = 시급 ×
                공휴일근무시간 × <span className="text-amber-600 font-semibold">1.5배</span>
              </li>
              <li>
                • <span className="font-medium text-gray-700">연차수당</span> = 시급 × 연차시간
                (미설정 시 5.5h 기본값)
              </li>
            </ul>
          </div>
        </SheetHeader>

        {/* 직원별 아코디언 */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2 border-t border-gray-100">
          {isLoading ? (
            <div className="space-y-2 pt-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : perEmployee.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <Users className="size-8 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">스케줄 데이터가 없습니다.</p>
            </div>
          ) : (
            perEmployee.map((emp) => {
              const isExpanded = expandedIds.has(emp.user_id);
              const hasNight = emp.scheduled_night_hours > 0;
              const hasWeekly = emp.scheduled_weekly_allowance_hours > 0;
              const hasHoliday = emp.scheduled_holiday_hours > 0;

              return (
                <div
                  key={emp.user_id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* 직원 행 */}
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                    onClick={() => toggle(emp.user_id)}
                  >
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900 text-sm truncate">
                        {emp.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                        {emp.position}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0">
                      {fmt(emp.scheduled_gross)}원
                    </span>
                    <ChevronDown
                      className={cn(
                        'size-4 text-gray-400 shrink-0 transition-transform duration-200',
                        isExpanded && 'rotate-180',
                      )}
                    />
                  </button>

                  {/* 확장 상세 */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        계산 상세
                      </p>

                      {/* 시급 */}
                      <div className="flex items-center justify-between py-1 mb-1">
                        <span className="text-xs font-semibold text-gray-700">시급</span>
                        <span className="text-xs font-bold text-mega tabular-nums">
                          {fmt(emp.wage)}원
                        </span>
                      </div>

                      <div className="divide-y divide-gray-100 rounded-lg bg-white border border-gray-100 px-3 py-1 mb-3">
                        <FormulaRow
                          label="주간급"
                          formula={`${fmtH(emp.scheduled_day_hours)} × ${fmt(emp.wage)}원`}
                          result={emp.scheduled_day_wage}
                        />
                        <FormulaRow
                          label="야간급"
                          formula={`${fmtH(emp.scheduled_night_hours)} × ${fmt(emp.wage)}원 × 1.5`}
                          result={emp.scheduled_night_wage}
                          dimmed={!hasNight}
                        />
                        <FormulaRow
                          label={
                            hasWeekly
                              ? `주휴수당 (${fmtH(emp.scheduled_weekly_allowance_hours)})`
                              : '주휴수당 (주 15h 미만)'
                          }
                          formula={
                            hasWeekly
                              ? `${fmtH(emp.scheduled_weekly_allowance_hours)} × ${fmt(emp.wage)}원`
                              : '미발생'
                          }
                          result={emp.scheduled_weekly_allowance_pay}
                          dimmed={!hasWeekly}
                        />
                        <FormulaRow
                          label={hasHoliday ? '공휴일수당' : '공휴일수당 (없음)'}
                          formula={
                            hasHoliday
                              ? `${fmtH(emp.scheduled_holiday_hours)} × ${fmt(emp.wage)}원 × 1.5`
                              : '해당 없음'
                          }
                          result={emp.scheduled_holiday_pay}
                          dimmed={!hasHoliday}
                        />
                        <FormulaRow
                          label={`연차수당 (${fmtH(emp.scheduled_annual_leave_hours)})`}
                          formula={`${fmtH(emp.scheduled_annual_leave_hours)} × ${fmt(emp.wage)}원`}
                          result={emp.scheduled_annual_leave_pay}
                        />
                      </div>

                      {/* 소계 */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-bold text-gray-700">예상 총급여</span>
                        <span className="text-sm font-bold text-gray-900 tabular-nums">
                          {fmt(emp.scheduled_gross)}원
                        </span>
                      </div>

                      {/* 총 예상 시간 */}
                      <p className="text-[11px] text-gray-400 mt-1.5 text-right">
                        스케줄 총 {fmtH(emp.scheduled_hours)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 합계 푸터 */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-amber-50/50 shrink-0 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-600">전체 합계</span>
          <span className="text-sm font-bold text-gray-900 tabular-nums">{fmt(totalGross)}원</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── 직원 테이블 ───────────────────────────────────────────────────────────────

type EmployeeTableProps = {
  employees: PayrollData[];
  isLoading: boolean;
  onRowClick: (emp: PayrollData) => void;
};

function EmployeeTable({ employees, isLoading, onRowClick }: EmployeeTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded-full w-16" />
              <div className="h-4 bg-gray-100 rounded-full w-12" />
              <div className="flex-1 h-4 bg-gray-100 rounded-full" />
              <div className="h-4 bg-gray-100 rounded-full w-20" />
              <div className="h-5 bg-gray-100 rounded-full w-14" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-md flex flex-col items-center justify-center py-16 text-center">
        <Users className="size-8 text-gray-200 mb-3" />
        <p className="font-semibold text-gray-400">급여 데이터가 없습니다</p>
        <p className="text-sm text-gray-300 mt-1">해당 월의 급여 데이터가 존재하지 않습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">이름</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">직급</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">총급여</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">실수령액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {employees.map((emp) => (
              <tr
                key={emp.user_id}
                onClick={() => onRowClick(emp)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3.5 font-medium text-gray-900">{emp.name}</td>
                <td className="px-5 py-3.5 text-gray-500">{emp.position ?? '-'}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-gray-800">
                  {fmt(emp.gross_pay)}원
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-gray-900">
                  {fmt(emp.net_pay)}원
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 승인 섹션 공통 헤더 ───────────────────────────────────────────────────────

type ApprovalSectionProps = {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  emptyMessage: string;
  isLoading: boolean;
};

function ApprovalSection({
  title,
  icon,
  count,
  children,
  emptyMessage,
  isLoading,
}: ApprovalSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-xs">
          {icon}
        </div>
        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
        {count > 0 && (
          <span className="ml-auto inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-bold rounded-full bg-red-500 text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </div>
      <div className="px-5 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="flex-1 h-4 bg-gray-100 rounded-full" />
                <div className="h-7 w-14 bg-gray-100 rounded-lg" />
                <div className="h-7 w-14 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        ) : count === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col gap-2">{children}</div>
        )}
      </div>
    </div>
  );
}

// ── 승인 아이템 행 ────────────────────────────────────────────────────────────

type ApprovalRowProps = {
  label: string;
  sub?: string;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
};

function ApprovalRow({ label, sub, onApprove, onReject, isLoading }: ApprovalRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400 truncate mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          className="h-7 px-3 text-xs rounded-lg bg-mega hover:bg-mega-hover text-white shadow-sm"
          onClick={onApprove}
          disabled={isLoading}
        >
          <CheckCircle2 className="size-3 mr-1" />
          승인
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          onClick={onReject}
          disabled={isLoading}
        >
          <XCircle className="size-3 mr-1" />
          거절
        </Button>
      </div>
    </div>
  );
}

// ── 거절 사유 모달 ────────────────────────────────────────────────────────────

type RejectModalProps = {
  target: RejectTarget | null;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
};

function RejectModal({
  target,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
  isLoading,
}: RejectModalProps) {
  const reasonRequired = target?.kind === 'dayoff' || target?.kind === 'shift';

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
    >
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
              <XCircle className="size-4 text-red-500" />
            </div>
            거절 사유 입력
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{target?.name}</span>
            {target?.kind === 'user' && '님의 가입 신청을 거절합니다.'}
            {target?.kind === 'dayoff' && '님의 휴무 신청을 반려합니다.'}
            {target?.kind === 'shift' && '님의 근무교대 신청을 반려합니다.'}
          </p>
          <Textarea
            placeholder={
              reasonRequired ? '반려 사유를 입력하세요.' : '거절 사유를 입력하세요. (선택)'
            }
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            maxLength={300}
            className="rounded-xl resize-none text-sm border-gray-200 focus-visible:ring-red-200 focus-visible:border-red-300"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="rounded-xl flex-1 h-9 text-sm border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading || (reasonRequired && !reason.trim())}
            className="rounded-xl flex-1 h-9 text-sm bg-red-500 hover:bg-red-600"
          >
            {isLoading ? '처리 중...' : '거절 확인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 급여현황 탭 ───────────────────────────────────────────────────────────────

type PayrollTabProps = {
  year: number;
  month: number;
  dashboardData: DashboardResponse | undefined;
  isDashboardLoading: boolean;
};

function PayrollTab({ year, month, dashboardData, isDashboardLoading }: PayrollTabProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollData | null>(null);
  const [activeDetailPanel, setActiveDetailPanel] = useState<'actual' | 'scheduled' | null>(null);
  const { data: rawPayroll, isLoading: isPayrollLoading } = usePayrollQuery({ year, month });

  const employees: PayrollData[] = useMemo(() => {
    if (!rawPayroll) return [];
    const list = Array.isArray(rawPayroll) ? rawPayroll : [rawPayroll];
    return [...list].sort((a, b) => {
      if (!a.join_date) return 1;
      if (!b.join_date) return -1;
      return a.join_date.localeCompare(b.join_date);
    });
  }, [rawPayroll]);

  const totalActualGross = useMemo(
    () => employees.reduce((sum, emp) => sum + emp.gross_pay, 0),
    [employees],
  );
  const totalScheduledGross = dashboardData?.payroll_summary.total_scheduled_gross ?? 0;
  const totalCount = employees.length;

  return (
    <div className="flex flex-col gap-5">
      {/* KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<DollarSign className="size-4 text-mega-secondary" />}
          label="이번달 인건비 (근태기록 기반)"
          value={isPayrollLoading ? '-' : `${fmt(totalActualGross)}원`}
          sub="실제 출근 기록 기반 세전 합계"
          accent="bg-mega-secondary/10"
          onClick={isPayrollLoading ? undefined : () => setActiveDetailPanel('actual')}
        />
        <KpiCard
          icon={<DollarSign className="size-4 text-amber-500" />}
          label="예상 인건비 (스케줄 기반)"
          value={isDashboardLoading ? '-' : `${fmt(totalScheduledGross)}원`}
          sub="등록된 스케줄 기반 예상 합계"
          accent="bg-amber-50"
          onClick={isDashboardLoading ? undefined : () => setActiveDetailPanel('scheduled')}
        />
        <KpiCard
          icon={<Users className="size-4 text-blue-500" />}
          label="급여 데이터"
          value={isPayrollLoading ? '-' : `${totalCount}명`}
          sub="근태기록 기반 명세 확인 가능"
          accent="bg-blue-50"
        />
      </div>

      {/* 직원 테이블 */}
      <EmployeeTable
        employees={employees}
        isLoading={isPayrollLoading}
        onRowClick={setSelectedEmployee}
      />

      {/* 급여명세 상세 패널 */}
      <PayslipPanel
        employee={selectedEmployee}
        open={selectedEmployee !== null}
        onClose={() => setSelectedEmployee(null)}
      />

      {/* 이번달 인건비 상세 패널 */}
      <ActualLaborDetailSheet
        open={activeDetailPanel === 'actual'}
        onClose={() => setActiveDetailPanel(null)}
        employees={employees}
        year={year}
        month={month}
      />

      {/* 예상 인건비 상세 패널 */}
      <ScheduledLaborDetailSheet
        open={activeDetailPanel === 'scheduled'}
        onClose={() => setActiveDetailPanel(null)}
        perEmployee={dashboardData?.per_employee ?? []}
        year={year}
        month={month}
        isLoading={isDashboardLoading}
      />
    </div>
  );
}

// ── 승인대기 탭 ───────────────────────────────────────────────────────────────

function ApprovalsTab() {
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: pendingData, isLoading: isLoadingUsers } = usePendingUsersQuery();
  const { data: dayoffs = [], isLoading: isLoadingDayoffs } = useAdminDayOffsQuery();
  const { data: shifts = [], isLoading: isLoadingShifts } = useAdminShiftRequestsQuery();

  const { mutate: approveUser, isPending: isApprovingUser } = useApproveUserMutation();
  const { mutate: rejectUser, isPending: isRejectingUser } = useRejectUserMutation();
  const { mutate: approveDayOff, isPending: isApprovingDayOff } = useApproveDayOffMutation();
  const { mutate: rejectDayOff, isPending: isRejectingDayOff } = useRejectDayOffMutation();
  const { mutate: approveShift, isPending: isApprovingShift } = useApproveShiftMutation();
  const { mutate: rejectShift, isPending: isRejectingShift } = useRejectShiftMutation();

  const pendingUsers: PendingUserDTO[] = pendingData?.items ?? [];
  const pendingDayoffs: DayOffResponse[] = dayoffs.filter((d) => d.status === 'PENDING');
  const pendingShifts: ShiftRequestResponse[] = shifts.filter((s) => s.status === 'PENDING');

  const isRejectMutating = isRejectingUser || isRejectingDayOff || isRejectingShift;

  const handleRejectConfirm = () => {
    if (!rejectTarget) return;
    const onSettled = () => {
      setRejectTarget(null);
      setRejectReason('');
    };
    if (rejectTarget.kind === 'user') {
      rejectUser(
        { memberId: rejectTarget.id, data: { reason: rejectReason || undefined } },
        { onSettled },
      );
    } else if (rejectTarget.kind === 'dayoff') {
      rejectDayOff({ id: rejectTarget.id, reason: rejectReason }, { onSettled });
    } else {
      rejectShift({ id: rejectTarget.id, reason: rejectReason }, { onSettled });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 가입 승인 */}
      <ApprovalSection
        title="가입 승인"
        icon={<Users className="size-4 text-amber-500" />}
        count={pendingUsers.length}
        emptyMessage="대기 중인 가입 신청이 없습니다."
        isLoading={isLoadingUsers}
      >
        {pendingUsers.map((u) => (
          <ApprovalRow
            key={u.id}
            label={u.name}
            sub={`@${u.username}`}
            onApprove={() => approveUser(u.id)}
            onReject={() => setRejectTarget({ kind: 'user', id: u.id, name: u.name })}
            isLoading={isApprovingUser || isRejectingUser}
          />
        ))}
      </ApprovalSection>

      {/* 휴무 신청 */}
      <ApprovalSection
        title="휴무 신청"
        icon={
          <svg
            className="size-4 text-sky-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        }
        count={pendingDayoffs.length}
        emptyMessage="대기 중인 휴무 신청이 없습니다."
        isLoading={isLoadingDayoffs}
      >
        {pendingDayoffs.map((d) => (
          <ApprovalRow
            key={d.id}
            label={d.user_name}
            sub={`${d.request_date}${d.reason ? ` · ${d.reason}` : ''}`}
            onApprove={() => approveDayOff(d.id)}
            onReject={() => setRejectTarget({ kind: 'dayoff', id: d.id, name: d.user_name })}
            isLoading={isApprovingDayOff || isRejectingDayOff}
          />
        ))}
      </ApprovalSection>

      {/* 근무교대 */}
      <ApprovalSection
        title="근무교대"
        icon={
          <svg
            className="size-4 text-violet-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M7 16V4m0 0L3 8m4-4l4 4" />
            <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        }
        count={pendingShifts.length}
        emptyMessage="대기 중인 근무교대 신청이 없습니다."
        isLoading={isLoadingShifts}
      >
        {pendingShifts.map((s) => (
          <ApprovalRow
            key={s.id}
            label={`${s.requester_name} → ${s.target_user_name}`}
            sub={s.requester_work_date ?? undefined}
            onApprove={() => approveShift(s.id)}
            onReject={() => setRejectTarget({ kind: 'shift', id: s.id, name: s.requester_name })}
            isLoading={isApprovingShift || isRejectingShift}
          />
        ))}
      </ApprovalSection>

      <RejectModal
        target={rejectTarget}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onConfirm={handleRejectConfirm}
        onCancel={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
        isLoading={isRejectMutating}
      />
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const AdminDashboardPage = () => {
  const today = new Date();
  const [activeTab, setActiveTab] = useState<MainTab>('payroll');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data: dashboardData, isLoading: isDashboardLoading } = useAdminDashboardQuery(
    year,
    month,
  );

  // 승인 배지 카운트
  const { data: pendingData } = usePendingUsersQuery();
  const { data: dayoffs = [] } = useAdminDayOffsQuery();
  const { data: shifts = [] } = useAdminShiftRequestsQuery();

  const totalPendingCount =
    (pendingData?.total ?? 0) +
    dayoffs.filter((d) => d.status === 'PENDING').length +
    shifts.filter((s) => s.status === 'PENDING').length;

  const handlePrev = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const handleNext = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={<LayoutDashboard className="size-5 text-mega" />}
        iconBg="bg-mega/10"
        title="관리자 대시보드"
        description="급여 현황과 승인 대기 항목을 한눈에 확인하세요"
      />

      {/* 메인 탭 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5">
        <div className="flex gap-1">
          <button
            type="button"
            className={mainTabCls(activeTab === 'payroll')}
            onClick={() => setActiveTab('payroll')}
          >
            급여현황
          </button>
          <button
            type="button"
            className={mainTabCls(activeTab === 'approvals')}
            onClick={() => setActiveTab('approvals')}
          >
            승인대기
            {totalPendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
                {totalPendingCount > 9 ? '9+' : totalPendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'payroll' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500">
              직원별 급여 현황을 확인하고 상세 명세서를 조회하세요.
            </p>
            <MonthSelector year={year} month={month} onPrev={handlePrev} onNext={handleNext} />
          </div>
          <PayrollTab
            year={year}
            month={month}
            dashboardData={dashboardData}
            isDashboardLoading={isDashboardLoading}
          />
        </div>
      )}

      {activeTab === 'approvals' && <ApprovalsTab />}
    </div>
  );
};

export default AdminDashboardPage;

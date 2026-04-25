/**
 * 직원 급여 명세서 — 실제 서비스 수준 UI
 * - 근무 요약 / 급여 항목 / 공제 항목 섹션 분리
 * - 근로자의날 포함 전체 수당 표시
 */
import { Clock, TrendingUp, Minus, Wallet } from 'lucide-react';

import type { UserPositionProps } from '../model/user/type';

import { cn } from '@/shared/lib/utils';

const POSITION_LABEL: Record<string, string> = {
  관리자: '관리자',
  리더: '리더',
  크루: '크루',
  미화: '미화',
};

function fmt(n: number | null | undefined, suffix = '원'): string {
  if (n == null || n === 0) return '-';
  return `${n.toLocaleString()} ${suffix}`;
}

function fmtH(n: number | null | undefined): string {
  if (n == null) return '-';
  return `${n.toFixed(2)}h`;
}

interface RowProps {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
  sub?: boolean;
}

function Row({ label, value, highlight, danger, sub }: RowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2.5 px-1',
        sub ? 'border-b border-gray-50' : 'border-b border-gray-100',
      )}
    >
      <span
        className={cn(
          'text-sm',
          sub ? 'text-gray-400 pl-3' : 'text-gray-600',
          highlight && 'font-semibold text-gray-800',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-medium tabular-nums',
          highlight && 'text-base font-bold text-mega',
          danger && 'text-red-600',
          !highlight && !danger && 'text-gray-800',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 mb-1', color)}>
      {icon}
      <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
    </div>
  );
}

export default function UserPosition({ data }: UserPositionProps) {
  const hasHoliday = (data.holiday_hours ?? 0) > 0 || (data.holiday_pay ?? 0) > 0;

  return (
    <div className="space-y-4">
      {/* ── 요약 카드 3열 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">실 수령액</p>
          <p className="text-xl font-bold text-emerald-700 tabular-nums">
            {data.net_pay != null ? `${data.net_pay.toLocaleString()}원` : '-'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">이번 달 급여</p>
          <p className="text-xl font-bold text-mega tabular-nums">
            {data.gross_pay != null ? `${data.gross_pay.toLocaleString()}원` : '-'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">총 공제액</p>
          <p className="text-xl font-bold text-red-600 tabular-nums">
            {data.total_deduction != null ? `${data.total_deduction.toLocaleString()}원` : '-'}
          </p>
        </div>
      </div>

      {/* ── 헤더 ── */}
      <div className="bg-gradient-to-br from-nav-bg to-mega text-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-1">
            급여 명세서
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {data.name ?? '-'}
            <span className="ml-2 text-sm font-normal text-white/60">
              {POSITION_LABEL[data.position ?? ''] ?? data.position ?? ''}
            </span>
          </h2>
        </div>

        {/* 기본 정보 */}
        <div className="grid grid-cols-3 border-t border-white/10">
          <div className="px-5 py-4 border-r border-white/10">
            <p className="text-xs text-white/50 mb-0.5">시급</p>
            <p className="text-lg font-bold">
              {data.wage ? `${data.wage.toLocaleString()}원` : '-'}
            </p>
          </div>
          <div className="px-5 py-4 border-r border-white/10">
            <p className="text-xs text-white/50 mb-0.5">총 근무일</p>
            <p className="text-lg font-bold">
              {data.total_work_days != null ? `${data.total_work_days}일` : '-'}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-white/50 mb-0.5">지급일</p>
            <p className="text-lg font-bold">{data.pay_date ?? '-'}</p>
          </div>
        </div>
      </div>

      {/* ── 근무 시간 요약 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <SectionTitle icon={<Clock className="size-4" />} title="근무 시간" color="text-blue-600" />
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '총 근무시간', value: fmtH(data.total_work_hours), main: true },
            { label: '일 평균', value: fmtH(data.avg_daily_hours), main: false },
            { label: '주간시간', value: fmtH(data.day_hours), main: false },
            { label: '야간시간', value: fmtH(data.night_hours), main: false },
            { label: '주휴시간', value: fmtH(data.weekly_allowance_hours), main: false },
            { label: '연차시간', value: fmtH(data.annual_leave_hours), main: false },
            ...(hasHoliday
              ? [{ label: '공휴일시간', value: fmtH(data.holiday_hours), main: false }]
              : []),
          ].map(({ label, value, main }) => (
            <div
              key={label}
              className={cn(
                'rounded-xl px-4 py-3 text-center',
                main ? 'bg-mega/8 col-span-2 sm:col-span-1' : 'bg-gray-50',
              )}
            >
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p
                className={cn(
                  'font-bold tabular-nums',
                  main ? 'text-mega text-base' : 'text-gray-800 text-sm',
                )}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 급여 항목 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <SectionTitle
          icon={<TrendingUp className="size-4" />}
          title="급여 항목"
          color="text-mega"
        />
        <div className="mt-2 divide-y divide-gray-50">
          <Row label="주간급여" value={fmt(data.day_wage)} />
          <Row label="야간급여 (1.5배)" value={fmt(data.night_wage)} />
          <Row label="주휴수당" value={fmt(data.weekly_allowance_pay)} />
          <Row label="연차수당" value={fmt(data.annual_leave_pay)} />
          {hasHoliday && <Row label="공휴일수당 (1.5배)" value={fmt(data.holiday_pay)} />}
          <Row label="급여총액" value={fmt(data.gross_pay)} highlight />
        </div>
      </div>

      {/* ── 공제 항목 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <SectionTitle icon={<Minus className="size-4" />} title="공제 항목" color="text-red-500" />
        <div className="mt-2 divide-y divide-gray-50">
          <Row label="건강보험" value={fmt(data.insurance_health)} danger sub />
          <Row label="장기요양보험" value={fmt(data.insurance_care)} danger sub />
          <Row label="고용보험" value={fmt(data.insurance_employment)} danger sub />
          <Row label="국민연금" value={fmt(data.insurance_pension)} danger sub />
          <Row label="공제계" value={fmt(data.total_deduction)} danger highlight />
        </div>
      </div>

      {/* ── 실수령액 ── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-white/70" />
            <span className="text-sm font-semibold text-white/80">실수령액</span>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums">
              {data.net_pay != null ? data.net_pay.toLocaleString() : '-'}
            </p>
            <p className="text-xs text-white/60 mt-0.5">원</p>
          </div>
        </div>
      </div>
    </div>
  );
}

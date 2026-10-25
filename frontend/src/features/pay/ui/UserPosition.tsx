/**
 * 직원 급여 명세서
 * - 상단 요약(실수령액·급여총액·공제계) → 기본 정보 → 근무 시간 → 급여/공제 항목
 * - 금액은 숫자와 단위가 분리되지 않도록 nowrap + tabular-nums
 */
import { Clock, Minus, TrendingUp, Wallet } from 'lucide-react';

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

function fmtWon(n: number | null | undefined): string {
  return n != null ? `${n.toLocaleString()}원` : '-';
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
        'flex items-center justify-between gap-3 py-3',
        highlight && 'mt-1 border-t border-gray-200 pt-3.5',
      )}
    >
      <span
        className={cn(
          'min-w-0 text-sm',
          sub ? 'text-gray-500' : 'text-gray-600',
          highlight && 'font-semibold text-gray-900',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'shrink-0 whitespace-nowrap text-sm font-medium tabular-nums',
          highlight && 'text-base font-bold',
          highlight && !danger && 'text-mega',
          danger && 'text-red-600',
          !highlight && !danger && 'text-gray-900',
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
    <div className="mb-1 flex items-center gap-2">
      <span className={cn('flex size-7 items-center justify-center rounded-lg', color)}>
        {icon}
      </span>
      <h3 className="text-[15px] font-bold tracking-tight text-gray-900">{title}</h3>
    </div>
  );
}

export default function UserPosition({ data }: UserPositionProps) {
  const hasHoliday = (data.holiday_hours ?? 0) > 0 || (data.holiday_pay ?? 0) > 0;

  const infoItems = [
    { label: '시급', value: data.wage ? `${data.wage.toLocaleString()}원` : '-' },
    { label: '총 근무일', value: data.total_work_days != null ? `${data.total_work_days}일` : '-' },
    { label: '지급일', value: data.pay_date ?? '-' },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── 요약 ── */}
      <section className="relative overflow-hidden rounded-2xl bg-nav-bg text-white">
        <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-mega-secondary/45 blur-3xl" />

        <div className="relative px-5 pt-5 pb-5 sm:px-7 sm:pt-7">
          <p className="text-xs font-semibold tracking-wider text-white/50">급여 명세서</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
            {data.name ?? '-'}
            <span className="ml-2 text-sm font-medium text-white/55">
              {POSITION_LABEL[data.position ?? ''] ?? data.position ?? ''}
            </span>
          </h2>

          <div className="mt-5">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-white/60">
              <Wallet className="size-4" />
              실수령액
            </p>
            <p className="mt-1 whitespace-nowrap text-[32px] font-bold leading-tight tracking-tight tabular-nums sm:text-4xl">
              {data.net_pay != null ? data.net_pay.toLocaleString() : '-'}
              <span className="ml-1 text-lg font-medium text-white/65">원</span>
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-xl bg-white/8 px-3.5 py-3">
              <p className="text-xs text-white/55">이번 달 급여</p>
              <p className="mt-0.5 whitespace-nowrap text-[15px] font-bold tabular-nums sm:text-base">
                {fmtWon(data.gross_pay)}
              </p>
            </div>
            <div className="min-w-0 rounded-xl bg-white/8 px-3.5 py-3">
              <p className="text-xs text-white/55">총 공제액</p>
              <p className="mt-0.5 whitespace-nowrap text-[15px] font-bold tabular-nums text-red-300 sm:text-base">
                {fmtWon(data.total_deduction)}
              </p>
            </div>
          </div>
        </div>

        {/* 기본 정보: 좁은 화면에선 행, 넓으면 3열 */}
        <dl className="relative grid grid-cols-1 divide-y divide-white/10 border-t border-white/10 min-[400px]:grid-cols-3 min-[400px]:divide-x min-[400px]:divide-y-0">
          {infoItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 px-5 py-3 min-[400px]:block min-[400px]:px-4 min-[400px]:py-4 sm:px-6"
            >
              <dt className="text-xs text-white/50">{item.label}</dt>
              <dd className="whitespace-nowrap text-[15px] font-bold tabular-nums min-[400px]:mt-0.5 sm:text-lg">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 근무 시간 요약 ── */}
      <section className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm sm:p-6">
        <SectionTitle
          icon={<Clock className="size-4" />}
          title="근무 시간"
          color="bg-blue-50 text-blue-600"
        />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
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
                'min-w-0 rounded-xl px-3 py-3 text-center',
                main ? 'col-span-2 bg-mega-soft sm:col-span-1' : 'bg-gray-50',
              )}
            >
              <p className="text-xs text-gray-500">{label}</p>
              <p
                className={cn(
                  'mt-0.5 whitespace-nowrap font-bold tabular-nums',
                  main ? 'text-base text-mega' : 'text-sm text-gray-900',
                )}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        {/* ── 급여 항목 ── */}
        <section className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm sm:p-6">
          <SectionTitle
            icon={<TrendingUp className="size-4" />}
            title="급여 항목"
            color="bg-mega-soft text-mega"
          />
          <div className="mt-1 divide-y divide-gray-100">
            <Row label="주간급여" value={fmt(data.day_wage)} />
            <Row label="야간급여 (1.5배)" value={fmt(data.night_wage)} />
            <Row label="주휴수당" value={fmt(data.weekly_allowance_pay)} />
            <Row label="연차수당" value={fmt(data.annual_leave_pay)} />
            {hasHoliday && <Row label="공휴일수당 (1.5배)" value={fmt(data.holiday_pay)} />}
          </div>
          <Row label="급여총액" value={fmt(data.gross_pay)} highlight />
        </section>

        {/* ── 공제 항목 ── */}
        <section className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm sm:p-6">
          <SectionTitle
            icon={<Minus className="size-4" />}
            title="공제 항목"
            color="bg-red-50 text-red-500"
          />
          <div className="mt-1 divide-y divide-gray-100">
            <Row label="건강보험" value={fmt(data.insurance_health)} danger sub />
            <Row label="장기요양보험" value={fmt(data.insurance_care)} danger sub />
            <Row label="고용보험" value={fmt(data.insurance_employment)} danger sub />
            <Row label="국민연금" value={fmt(data.insurance_pension)} danger sub />
          </div>
          <Row label="공제계" value={fmt(data.total_deduction)} danger highlight />
        </section>
      </div>

      {/* ── 실수령액 ── */}
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 sm:px-6 sm:py-5">
        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <Wallet className="size-5 text-emerald-600" />
          실수령액
        </span>
        <p className="whitespace-nowrap text-2xl font-bold tracking-tight text-emerald-700 tabular-nums sm:text-3xl">
          {data.net_pay != null ? data.net_pay.toLocaleString() : '-'}
          <span className="ml-1 text-base font-semibold text-emerald-600">원</span>
        </p>
      </section>
    </div>
  );
}

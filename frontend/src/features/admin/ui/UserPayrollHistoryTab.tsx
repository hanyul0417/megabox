import { ChevronDown, Loader2, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { AdminUserDTO } from '../api/dto';
import { useAdminUsersQuery, useUserPayrollHistoryQuery } from '../api/queries';

import { getAvatarBg } from '@/entities/user/model/position';
import { cn } from '@/shared/lib/utils';

// ── 유틸 ──────────────────────────────────────────────────────────────────────

const won = (v?: number) => (v != null ? v.toLocaleString('ko-KR') + '원' : '-');
const h = (v?: number) => (v != null ? v.toFixed(2) + 'h' : '-');

// ── 헤더 그룹 정의 ────────────────────────────────────────────────────────────

const COL_GROUPS = [
  {
    label: '기본',
    cols: [
      { key: 'ym', label: '연월', className: 'text-left sticky left-0 bg-white z-10 min-w-[80px]' },
      { key: 'days', label: '근무일수', className: 'text-right min-w-[70px]' },
      { key: 'hours', label: '근무시간', className: 'text-right min-w-[80px]' },
      { key: 'wage', label: '시급', className: 'text-right min-w-[90px]' },
    ],
  },
  {
    label: '근무시간 항목',
    cols: [
      { key: 'day_hours', label: '주간', className: 'text-right min-w-[70px]' },
      { key: 'night_hours', label: '야간', className: 'text-right min-w-[70px]' },
      { key: 'weekly_allowance_hours', label: '주휴', className: 'text-right min-w-[70px]' },
      { key: 'annual_leave_hours', label: '연차', className: 'text-right min-w-[70px]' },
      { key: 'holiday_hours', label: '공휴일', className: 'text-right min-w-[70px]' },
    ],
  },
  {
    label: '급여 항목',
    cols: [
      { key: 'day_wage', label: '주간급여', className: 'text-right min-w-[90px]' },
      { key: 'night_wage', label: '야간급여', className: 'text-right min-w-[90px]' },
      { key: 'weekly_allowance_pay', label: '주휴수당', className: 'text-right min-w-[90px]' },
      { key: 'annual_leave_pay', label: '연차수당', className: 'text-right min-w-[90px]' },
      { key: 'holiday_pay', label: '공휴일수당', className: 'text-right min-w-[90px]' },
      { key: 'gross_pay', label: '총급여', className: 'text-right min-w-[100px] font-semibold' },
    ],
  },
  {
    label: '공제 항목',
    cols: [
      { key: 'insurance_health', label: '건강보험', className: 'text-right min-w-[90px]' },
      { key: 'insurance_care', label: '요양보험', className: 'text-right min-w-[90px]' },
      { key: 'insurance_employment', label: '고용보험', className: 'text-right min-w-[90px]' },
      { key: 'insurance_pension', label: '국민연금', className: 'text-right min-w-[90px]' },
      { key: 'total_deduction', label: '공제계', className: 'text-right min-w-[90px] font-semibold' },
    ],
  },
  {
    label: '실수령',
    cols: [
      { key: 'net_pay', label: '실수령액', className: 'text-right min-w-[100px] font-bold text-emerald-700' },
    ],
  },
];

const ALL_COLS = COL_GROUPS.flatMap((g) => g.cols);

// ── 직원 선택기 ──────────────────────────────────────────────────────────────

interface EmployeeSelectorProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const EmployeeSelector = ({ selectedId, onSelect }: EmployeeSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserDTO | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const { data, isFetching } = useAdminUsersQuery(
    debouncedQ ? { q: debouncedQ, limit: 100 } : { limit: 100 },
  );
  const users = data?.items ?? [];

  return (
    <div className="relative w-full sm:w-64">
      <button
        type="button"
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all',
          open
            ? 'border-mega ring-2 ring-mega/20 bg-white'
            : 'border-gray-200 bg-white hover:border-gray-300',
        )}
        onClick={() => setOpen((v) => !v)}
      >
        {selectedUser ? (
          <>
            <span
              className={cn(
                'size-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                getAvatarBg(selectedUser.position),
              )}
            >
              {selectedUser.name.slice(0, 1)}
            </span>
            <span className="font-medium text-gray-800 flex-1 text-left truncate">{selectedUser.name}</span>
            <span className="text-xs text-gray-400">{selectedUser.position}</span>
          </>
        ) : (
          <>
            <User className="size-4 text-gray-400 shrink-0" />
            <span className="text-gray-400 flex-1 text-left">직원 선택</span>
          </>
        )}
        <ChevronDown className={cn('size-4 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 w-full z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50">
              {isFetching ? (
                <Loader2 className="size-3.5 text-gray-400 shrink-0 animate-spin" />
              ) : (
                <Search className="size-3.5 text-gray-400 shrink-0" />
              )}
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="이름 검색"
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto">
            {!isFetching && users.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">결과 없음</li>
            )}
            {users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors',
                    u.id === selectedId && 'bg-mega/5 text-mega',
                  )}
                  onClick={() => {
                    setSelectedUser(u);
                    onSelect(u.id);
                    setOpen(false);
                    setQ('');
                    setDebouncedQ('');
                  }}
                >
                  <span
                    className={cn(
                      'size-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                      getAvatarBg(u.position),
                    )}
                  >
                    {u.name.slice(0, 1)}
                  </span>
                  <span className="font-medium text-gray-800 flex-1 text-left">{u.name}</span>
                  <span className="text-xs text-gray-400">{u.position}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ── 급여 이력 테이블 ──────────────────────────────────────────────────────────

const PayrollTable = ({ userId }: { userId: number }) => {
  const { data: history, isLoading } = useUserPayrollHistoryQuery(userId, true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">급여 이력 불러오는 중...</span>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        급여 이력이 없습니다
      </div>
    );
  }

  const getCellValue = (p: (typeof history)[0], key: string): string => {
    switch (key) {
      case 'ym': return `${p.year}년 ${p.month}월`;
      case 'days': return p.total_work_days != null ? `${p.total_work_days}일` : '-';
      case 'hours': return p.total_work_hours != null ? `${p.total_work_hours.toFixed(1)}h` : '-';
      case 'wage': return won(p.wage);
      case 'day_hours': return h(p.day_hours);
      case 'night_hours': return h(p.night_hours);
      case 'weekly_allowance_hours': return h(p.weekly_allowance_hours);
      case 'annual_leave_hours': return h(p.annual_leave_hours);
      case 'holiday_hours': return h(p.holiday_hours);
      case 'day_wage': return won(p.day_wage);
      case 'night_wage': return won(p.night_wage);
      case 'weekly_allowance_pay': return won(p.weekly_allowance_pay);
      case 'annual_leave_pay': return won(p.annual_leave_pay);
      case 'holiday_pay': return won(p.holiday_pay);
      case 'gross_pay': return won(p.gross_pay);
      case 'insurance_health': return p.insurance_health != null ? `-${p.insurance_health.toLocaleString('ko-KR')}원` : '-';
      case 'insurance_care': return p.insurance_care != null ? `-${p.insurance_care.toLocaleString('ko-KR')}원` : '-';
      case 'insurance_employment': return p.insurance_employment != null ? `-${p.insurance_employment.toLocaleString('ko-KR')}원` : '-';
      case 'insurance_pension': return p.insurance_pension != null ? `-${p.insurance_pension.toLocaleString('ko-KR')}원` : '-';
      case 'total_deduction': return p.total_deduction != null ? `-${p.total_deduction.toLocaleString('ko-KR')}원` : '-';
      case 'net_pay': return won(p.net_pay);
      default: return '-';
    }
  };

  const isDeductionCol = (key: string) =>
    ['insurance_health', 'insurance_care', 'insurance_employment', 'insurance_pension', 'total_deduction'].includes(key);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="text-xs border-collapse" style={{ minWidth: '1200px' }}>
        {/* 그룹 헤더 */}
        <thead>
          <tr className="bg-nav-bg">
            {COL_GROUPS.map((g) => (
              <th
                key={g.label}
                colSpan={g.cols.length}
                className={cn(
                  'px-3 py-2 text-center text-[10px] font-bold text-white/70 uppercase tracking-widest border-r border-white/10 last:border-r-0',
                  g.label === '기본' && 'text-left',
                )}
              >
                {g.label}
              </th>
            ))}
          </tr>
          {/* 컬럼 헤더 */}
          <tr className="bg-gray-50 border-b border-gray-200">
            {ALL_COLS.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 py-2 font-semibold text-gray-500 whitespace-nowrap',
                  col.className,
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-50">
          {history.map((p) => (
            <tr key={p.payroll_id} className="hover:bg-mega/[0.02] transition-colors">
              {ALL_COLS.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-3 py-2.5 whitespace-nowrap tabular-nums',
                    col.className,
                    col.key === 'ym' && 'font-semibold text-gray-800',
                    col.key === 'net_pay' && 'font-bold text-emerald-700',
                    col.key === 'gross_pay' && 'text-gray-700 font-semibold',
                    col.key === 'total_deduction' && 'text-red-600 font-semibold',
                    isDeductionCol(col.key) && col.key !== 'total_deduction' && 'text-red-400',
                  )}
                >
                  {getCellValue(p, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── 메인 탭 컴포넌트 ──────────────────────────────────────────────────────────

const UserPayrollHistoryTab = () => {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <EmployeeSelector selectedId={selectedUserId} onSelect={setSelectedUserId} />
        {selectedUserId && (
          <span className="text-xs text-gray-400">입사일부터 현재까지 월별 급여 이력</span>
        )}
      </div>

      {selectedUserId ? (
        <PayrollTable userId={selectedUserId} />
      ) : (
        <div className="flex items-center justify-center py-24 text-gray-300 text-sm">
          위에서 직원을 선택하면 급여 이력을 확인할 수 있습니다
        </div>
      )}
    </div>
  );
};

export default UserPayrollHistoryTab;

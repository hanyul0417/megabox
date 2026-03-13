import {
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import type { DayOffResponse, ShiftRequestResponse } from '@/features/schedule';

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
import { cn } from '@/shared/lib/utils';

type RequestStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type TabType = 'dayoff' | 'shift';

// ─── 상태 Badge ───────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    PENDING: {
      label: '대기 중',
      cls: 'bg-amber-50 text-amber-700 border border-amber-200',
      dot: 'bg-amber-400',
    },
    APPROVED: {
      label: '승인됨',
      cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      dot: 'bg-emerald-400',
    },
    REJECTED: {
      label: '반려됨',
      cls: 'bg-red-50 text-red-700 border border-red-200',
      dot: 'bg-red-400',
    },
  };
  const info = map[status] ?? {
    label: status,
    cls: 'bg-gray-100 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        info.cls,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', info.dot)} />
      {info.label}
    </span>
  );
}

// ─── 교대 유형 Badge ──────────────────────────────────────

function ShiftTypeBadge({ type }: { type: string }) {
  return type === 'EXCHANGE' ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
      <ArrowLeftRight className="size-3" />
      근무교대
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
      <UserCheck className="size-3" />
      대타
    </span>
  );
}

// ─── 통계 칩 ──────────────────────────────────────────────

interface StatChipProps {
  label: string;
  count: number;
  colorCls: string;
  bgCls: string;
}

function StatChip({ label, count, colorCls, bgCls }: StatChipProps) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border', bgCls)}>
      <span className={cn('text-lg font-bold tabular-nums', colorCls)}>{count}</span>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  );
}

// ─── 휴무 신청 카드 ───────────────────────────────────────

interface DayOffCardProps {
  item: DayOffResponse;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}

function DayOffCard({ item, onApprove, onReject, isLoading }: DayOffCardProps) {
  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-50 transition-all duration-200">
      {/* Icon */}
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:from-emerald-100 group-hover:to-emerald-150 transition-colors">
        <Calendar className="size-5 text-emerald-600" />
      </div>

      {/* Center content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-sm text-gray-900">{item.user_name}</span>
          <StatusBadge status={item.status} />
          {item.is_weekend_or_holiday && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full font-semibold">
              <span className="w-1 h-1 rounded-full bg-orange-400" />
              주말/공휴일
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            <Calendar className="size-3" />
            {item.request_date}
          </span>
          {item.reason && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-gray-500 truncate max-w-[180px]" title={item.reason}>
                {item.reason}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
          <Clock className="size-3" />
          신청일 {new Date(item.created_at).toLocaleDateString('ko-KR')}
        </div>
      </div>

      {/* Right: actions — always visible for PENDING */}
      <div className="flex items-center gap-1.5 shrink-0">
        {item.status === 'PENDING' ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
              onClick={onReject}
              disabled={isLoading}
            >
              <XCircle className="size-3.5 mr-1" />
              반려
            </Button>
            <Button
              size="sm"
              className="h-8 px-3 text-xs rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200 transition-colors"
              onClick={onApprove}
              disabled={isLoading}
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              승인
            </Button>
          </>
        ) : (
          <div className="w-[80px]" />
        )}
      </div>
    </div>
  );
}

// ─── 근무교대 카드 ─────────────────────────────────────────

interface ShiftCardProps {
  item: ShiftRequestResponse;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}

function ShiftCard({ item, onApprove, onReject, isLoading }: ShiftCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      <div className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-sky-200 hover:shadow-md hover:shadow-sky-50 transition-all duration-200">
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-100 flex items-center justify-center shrink-0 group-hover:from-sky-100 group-hover:to-sky-150 transition-colors">
          <ArrowLeftRight className="size-5 text-sky-600" />
        </div>

        {/* Center content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-sm text-gray-900">{item.requester_name}</span>
            <ShiftTypeBadge type={item.type} />
            <StatusBadge status={item.status} />
          </div>

          {/* Requester → Target visual */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-sky-50 border border-sky-100 rounded-md px-2 py-0.5">
              <span className="font-semibold text-sky-700">{item.requester_name}</span>
              {item.requester_work_date && (
                <span className="text-sky-500">
                  {item.requester_work_date} {item.requester_start_time?.slice(0, 5)}–
                  {item.requester_end_time?.slice(0, 5)}
                </span>
              )}
            </div>
            <ArrowLeftRight className="size-3 text-gray-400 shrink-0" />
            <div className="flex items-center gap-1 bg-violet-50 border border-violet-100 rounded-md px-2 py-0.5">
              <span className="font-semibold text-violet-700">{item.target_user_name}</span>
              {item.target_work_date && (
                <span className="text-violet-500">
                  {item.target_work_date} {item.target_start_time?.slice(0, 5)}–
                  {item.target_end_time?.slice(0, 5)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
            <Clock className="size-3" />
            신청일 {new Date(item.created_at).toLocaleDateString('ko-KR')}
            {item.note && (
              <>
                <span className="text-gray-300">·</span>
                <span className="truncate max-w-[120px]" title={item.note}>
                  {item.note}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: actions — always visible */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs rounded-lg text-gray-500 hover:text-sky-700 hover:bg-sky-50 transition-colors"
            onClick={() => setDetailOpen(true)}
          >
            상세
          </Button>
          {item.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                onClick={onReject}
                disabled={isLoading}
              >
                <XCircle className="size-3.5 mr-1" />
                반려
              </Button>
              <Button
                size="sm"
                className="h-8 px-3 text-xs rounded-lg bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-200 transition-colors"
                onClick={onApprove}
                disabled={isLoading}
              >
                <CheckCircle2 className="size-3.5 mr-1" />
                승인
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center">
                <ArrowLeftRight className="size-4 text-sky-600" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">근무교대 신청 상세</p>
                <p className="text-xs text-gray-400 font-normal">
                  신청일: {new Date(item.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Status & Type row */}
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <ShiftTypeBadge type={item.type} />
              <StatusBadge status={item.status} />
            </div>

            {/* 2-column schedule cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Requester */}
              <div className="rounded-xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-4">
                <p className="text-[10px] font-semibold text-sky-500 uppercase tracking-wider mb-2">
                  신청자
                </p>
                <p className="font-bold text-sm text-gray-900 mb-3">{item.requester_name}</p>
                {item.requester_work_date ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Calendar className="size-3 text-sky-400" />
                      <span>{item.requester_work_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock className="size-3 text-sky-400" />
                      <span>
                        {item.requester_start_time?.slice(0, 5)} –{' '}
                        {item.requester_end_time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">스케줄 정보 없음</p>
                )}
              </div>

              {/* Target */}
              <div className="rounded-xl border border-violet-100 bg-gradient-to-b from-violet-50 to-white p-4">
                <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-2">
                  대상자
                </p>
                <p className="font-bold text-sm text-gray-900 mb-3">{item.target_user_name}</p>
                {item.target_work_date ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Calendar className="size-3 text-violet-400" />
                      <span>{item.target_work_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock className="size-3 text-violet-400" />
                      <span>
                        {item.target_start_time?.slice(0, 5)} –{' '}
                        {item.target_end_time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">스케줄 정보 없음</p>
                )}
              </div>
            </div>

            {/* Exchange arrow visual */}
            <div className="flex items-center justify-center gap-3 py-1">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-500 font-medium">
                <ArrowLeftRight className="size-3" />
                {item.type === 'EXCHANGE' ? '상호 교대' : '대타 요청'}
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
            </div>

            {/* Note */}
            {item.note && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  메모
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{item.note}</p>
              </div>
            )}
          </div>

          {item.status === 'PENDING' && (
            <DialogFooter className="gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                onClick={() => {
                  onReject();
                  setDetailOpen(false);
                }}
                disabled={isLoading}
              >
                <XCircle className="size-3.5 mr-1.5" />
                반려
              </Button>
              <Button
                size="sm"
                className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-200 transition-colors"
                onClick={() => {
                  onApprove();
                  setDetailOpen(false);
                }}
                disabled={isLoading}
              >
                <CheckCircle2 className="size-3.5 mr-1.5" />
                승인
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── 필터 바 ──────────────────────────────────────────────

interface FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  statusFilter: RequestStatus;
  onStatusFilter: (v: RequestStatus) => void;
  pending: number;
}

function FilterBar({ search, onSearch, statusFilter, onStatusFilter, pending }: FilterBarProps) {
  const filters: { value: RequestStatus; label: string }[] = [
    { value: 'ALL', label: '전체' },
    { value: 'PENDING', label: '대기 중' },
    { value: 'APPROVED', label: '승인됨' },
    { value: 'REJECTED', label: '반려됨' },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Search */}
      <div className="relative w-full sm:w-56">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="이름으로 검색..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 pr-4 h-9 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Status filter pills */}
      <div className="flex items-center bg-gray-100/80 rounded-xl p-1 gap-0.5">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onStatusFilter(f.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
              statusFilter === f.value
                ? 'bg-white shadow-sm text-gray-900 shadow-gray-200/80'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
            )}
          >
            {f.label}
            {f.value === 'PENDING' && pending > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
                {pending > 9 ? '9+' : pending}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 스켈레톤 로더 ─────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-20 rounded-full bg-gray-100" />
          <div className="h-5 w-14 rounded-full bg-gray-100" />
        </div>
        <div className="h-3 w-48 rounded-full bg-gray-100" />
        <div className="h-2.5 w-28 rounded-full bg-gray-100" />
      </div>
      <div className="flex gap-1.5 shrink-0">
        <div className="h-8 w-14 rounded-lg bg-gray-100" />
        <div className="h-8 w-14 rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}

// ─── 빈 상태 ──────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-gray-600">{title}</p>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export function LeaveShiftApprovalTab() {
  const [activeTab, setActiveTab] = useState<TabType>('dayoff');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus>('ALL');

  const {
    data: dayoffs = [],
    isLoading: isDayoffsLoading,
    refetch: refetchDayoffs,
  } = useAdminDayOffsQuery();
  const {
    data: shifts = [],
    isLoading: isShiftsLoading,
    refetch: refetchShifts,
  } = useAdminShiftRequestsQuery();

  const { mutate: approveDayOff, isPending: isApprovingDayOff } = useApproveDayOffMutation();
  const { mutate: rejectDayOff, isPending: isRejectingDayOff } = useRejectDayOffMutation();
  const { mutate: approveShift, isPending: isApprovingShift } = useApproveShiftMutation();
  const { mutate: rejectShift, isPending: isRejectingShift } = useRejectShiftMutation();

  const pendingDayoffs = useMemo(() => dayoffs.filter((d) => d.status === 'PENDING'), [dayoffs]);
  const pendingShifts = useMemo(() => shifts.filter((s) => s.status === 'PENDING'), [shifts]);

  const filteredDayoffs = useMemo(() => {
    let list = dayoffs;
    if (statusFilter !== 'ALL') list = list.filter((d) => d.status === statusFilter);
    if (search) list = list.filter((d) => d.user_name.includes(search));
    return list;
  }, [dayoffs, statusFilter, search]);

  const filteredShifts = useMemo(() => {
    let list = shifts;
    if (statusFilter !== 'ALL') list = list.filter((s) => s.status === statusFilter);
    if (search)
      list = list.filter(
        (s) => s.requester_name.includes(search) || s.target_user_name.includes(search),
      );
    return list;
  }, [shifts, statusFilter, search]);

  const isLoading = activeTab === 'dayoff' ? isDayoffsLoading : isShiftsLoading;
  const isMutating =
    activeTab === 'dayoff'
      ? isApprovingDayOff || isRejectingDayOff
      : isApprovingShift || isRejectingShift;

  const handleRefetch = () => {
    if (activeTab === 'dayoff') void refetchDayoffs();
    else void refetchShifts();
  };

  const activeDayoffs = activeTab === 'dayoff';
  const currentList = activeDayoffs ? dayoffs : shifts;
  const approvedCount = currentList.filter((i) => i.status === 'APPROVED').length;
  const rejectedCount = currentList.filter((i) => i.status === 'REJECTED').length;
  const pendingCount = activeDayoffs ? pendingDayoffs.length : pendingShifts.length;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Tab Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Pill tab switcher */}
        <div className="flex items-center bg-gray-100/80 rounded-xl p-1 gap-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('dayoff');
              setSearch('');
              setStatusFilter('ALL');
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
              activeTab === 'dayoff'
                ? 'bg-white shadow-sm shadow-gray-200/80 text-emerald-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
            )}
          >
            <Calendar className="size-3.5" />
            휴무 신청
            {pendingDayoffs.length > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full transition-colors',
                  activeTab === 'dayoff'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-500 text-white',
                )}
              >
                {pendingDayoffs.length > 9 ? '9+' : pendingDayoffs.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('shift');
              setSearch('');
              setStatusFilter('ALL');
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
              activeTab === 'shift'
                ? 'bg-white shadow-sm shadow-gray-200/80 text-sky-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
            )}
          >
            <ArrowLeftRight className="size-3.5" />
            근무교대 신청
            {pendingShifts.length > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full transition-colors',
                  activeTab === 'shift' ? 'bg-sky-100 text-sky-700' : 'bg-red-500 text-white',
                )}
              >
                {pendingShifts.length > 9 ? '9+' : pendingShifts.length}
              </span>
            )}
          </button>
        </div>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-auto"
          onClick={handleRefetch}
          disabled={isLoading}
          title="새로고침"
        >
          <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* ── Stats Row ──────────────────────────────────────── */}
      {!isLoading && (
        <div className="flex items-center gap-2 flex-wrap">
          <StatChip
            label="대기 중"
            count={pendingCount}
            colorCls="text-amber-600"
            bgCls="bg-amber-50 border-amber-100"
          />
          <StatChip
            label="승인됨"
            count={approvedCount}
            colorCls="text-emerald-600"
            bgCls="bg-emerald-50 border-emerald-100"
          />
          <StatChip
            label="반려됨"
            count={rejectedCount}
            colorCls="text-red-500"
            bgCls="bg-red-50 border-red-100"
          />
          <span className="ml-auto text-xs text-gray-400 tabular-nums">
            전체 {currentList.length}건
          </span>
        </div>
      )}

      {/* ── Filter Bar ─────────────────────────────────────── */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        pending={pendingCount}
      />

      {/* ── Content ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : activeTab === 'dayoff' ? (
        filteredDayoffs.length === 0 ? (
          <EmptyState
            icon={<Calendar className="size-7 text-gray-300" />}
            title="휴무 신청 내역 없음"
            description={
              statusFilter === 'PENDING'
                ? '대기 중인 휴무 신청이 없습니다.'
                : search
                  ? `"${search}"에 해당하는 내역이 없습니다.`
                  : '조건에 맞는 내역이 없습니다.'
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filteredDayoffs.map((item) => (
              <DayOffCard
                key={item.id}
                item={item}
                onApprove={() => approveDayOff(item.id)}
                onReject={() => rejectDayOff(item.id)}
                isLoading={isMutating}
              />
            ))}
          </div>
        )
      ) : filteredShifts.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="size-7 text-gray-300" />}
          title="근무교대 신청 내역 없음"
          description={
            statusFilter === 'PENDING'
              ? '대기 중인 근무교대 신청이 없습니다.'
              : search
                ? `"${search}"에 해당하는 내역이 없습니다.`
                : '조건에 맞는 내역이 없습니다.'
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filteredShifts.map((item) => (
            <ShiftCard
              key={item.id}
              item={item}
              onApprove={() => approveShift(item.id)}
              onReject={() => rejectShift(item.id)}
              isLoading={isMutating}
            />
          ))}
        </div>
      )}
    </div>
  );
}

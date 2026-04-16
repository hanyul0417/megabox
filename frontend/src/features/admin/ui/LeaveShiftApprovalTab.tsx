import {
  ArrowDownAZ,
  ArrowLeftRight,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Trash2,
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
  useDeleteApprovedDayOffMutation,
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
type SortKey = 'newest' | 'oldest' | 'name';

// ─── 상태 Badge ───────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    PENDING: {
      label: '대기 중',
      cls: 'bg-blue-50 text-blue-700 border border-blue-200',
      dot: 'bg-blue-400',
    },
    APPROVED: {
      label: '승인됨',
      cls: 'bg-mega/8 text-mega border border-mega/25',
      dot: 'bg-mega',
    },
    REJECTED: {
      label: '반려됨',
      cls: 'bg-gray-100 text-gray-500 border border-gray-200',
      dot: 'bg-gray-400',
    },
  };
  const info = map[status] ?? {
    label: status,
    cls: 'bg-gray-100 text-gray-500 border border-gray-200',
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

// ─── 통계 칩 (클릭 → 필터) ────────────────────────────────

interface StatChipProps {
  label: string;
  count: number;
  status: RequestStatus;
  activeStatus: RequestStatus;
  onFilter: (s: RequestStatus) => void;
}

function StatChip({ label, count, status, activeStatus, onFilter }: StatChipProps) {
  const isActive = activeStatus === status;
  const styles: Record<RequestStatus, { base: string; active: string; num: string }> = {
    PENDING: {
      base: 'border-blue-100 bg-blue-50 hover:border-blue-200',
      active: 'border-blue-300 bg-blue-100 ring-2 ring-blue-200/50',
      num: 'text-blue-700',
    },
    APPROVED: {
      base: 'border-mega/15 bg-mega/5 hover:border-mega/30',
      active: 'border-mega/30 bg-mega/10 ring-2 ring-mega/15',
      num: 'text-mega',
    },
    REJECTED: {
      base: 'border-gray-200 bg-gray-50 hover:border-gray-300',
      active: 'border-gray-300 bg-gray-100 ring-2 ring-gray-200/50',
      num: 'text-gray-600',
    },
    ALL: {
      base: 'border-gray-200 bg-white hover:border-gray-300',
      active: 'border-gray-300 bg-gray-50',
      num: 'text-gray-700',
    },
  };
  const s = styles[status];
  return (
    <button
      type="button"
      onClick={() => onFilter(isActive ? 'ALL' : status)}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer',
        isActive ? s.active : s.base,
      )}
    >
      <span className={cn('text-lg font-bold tabular-nums', s.num)}>{count}</span>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </button>
  );
}

// ─── 휴무 신청 카드 ───────────────────────────────────────

interface DayOffCardProps {
  item: DayOffResponse;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  isLoading: boolean;
}

function DayOffCard({ item, onApprove, onReject, onDelete, isLoading }: DayOffCardProps) {
  const isPending = item.status === 'PENDING';
  const isApproved = item.status === 'APPROVED';

  return (
    <div
      className={cn(
        'group flex items-center gap-4 p-4 rounded-xl border bg-white transition-all duration-200',
        isPending
          ? 'border-blue-100 hover:border-blue-200 hover:shadow-md hover:shadow-blue-50'
          : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
          isPending
            ? 'bg-blue-50 border-blue-100'
            : isApproved
              ? 'bg-mega/8 border-mega/15'
              : 'bg-gray-50 border-gray-100',
        )}
      >
        <Calendar
          className={cn(
            'size-4',
            isPending ? 'text-blue-500' : isApproved ? 'text-mega' : 'text-gray-400',
          )}
        />
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
          <span
            className={cn(
              'flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md',
              isPending ? 'text-blue-700 bg-blue-50' : 'text-gray-600 bg-gray-50',
            )}
          >
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

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isPending ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs rounded-lg border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              onClick={onReject}
              disabled={isLoading}
            >
              <XCircle className="size-3.5 mr-1" />
              반려
            </Button>
            <Button
              size="sm"
              className="h-8 px-3 text-xs rounded-lg bg-mega-secondary hover:bg-mega text-white shadow-sm transition-colors"
              onClick={onApprove}
              disabled={isLoading}
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              승인
            </Button>
          </>
        ) : isApproved ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs rounded-lg border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            onClick={onDelete}
            disabled={isLoading}
          >
            <Trash2 className="size-3.5 mr-1" />
            삭제
          </Button>
        ) : (
          <div className="w-[72px]" />
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
  const isPending = item.status === 'PENDING';

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-4 p-4 rounded-xl border bg-white transition-all duration-200',
          isPending
            ? 'border-blue-100 hover:border-blue-200 hover:shadow-md hover:shadow-blue-50'
            : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
            isPending ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100',
          )}
        >
          <ArrowLeftRight
            className={cn('size-4', isPending ? 'text-blue-500' : 'text-gray-400')}
          />
        </div>

        {/* Center content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-sm text-gray-900">{item.requester_name}</span>
            <ShiftTypeBadge type={item.type} />
            <StatusBadge status={item.status} />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-md px-2 py-0.5">
              <span className="font-semibold text-gray-700">{item.requester_name}</span>
              {item.requester_work_date && (
                <span className="text-gray-400">
                  {item.requester_work_date} {item.requester_start_time?.slice(0, 5)}–
                  {item.requester_end_time?.slice(0, 5)}
                </span>
              )}
            </div>
            <ArrowLeftRight className="size-3 text-gray-300 shrink-0" />
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-md px-2 py-0.5">
              <span className="font-semibold text-gray-700">{item.target_user_name}</span>
              {item.target_work_date && (
                <span className="text-gray-400">
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

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs rounded-lg text-gray-400 hover:text-mega hover:bg-mega/8 transition-colors"
            onClick={() => setDetailOpen(true)}
          >
            상세
          </Button>
          {isPending && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs rounded-lg border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                onClick={onReject}
                disabled={isLoading}
              >
                <XCircle className="size-3.5 mr-1" />
                반려
              </Button>
              <Button
                size="sm"
                className="h-8 px-3 text-xs rounded-lg bg-mega-secondary hover:bg-mega text-white shadow-sm transition-colors"
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
              <div className="w-8 h-8 rounded-lg bg-mega/8 border border-mega/15 flex items-center justify-center">
                <ArrowLeftRight className="size-4 text-mega" />
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
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <ShiftTypeBadge type={item.type} />
              <StatusBadge status={item.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  신청자
                </p>
                <p className="font-bold text-sm text-gray-900 mb-3">{item.requester_name}</p>
                {item.requester_work_date ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Calendar className="size-3 text-gray-400" />
                      <span>{item.requester_work_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock className="size-3 text-gray-400" />
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

              <div className="rounded-xl border border-mega/15 bg-mega/5 p-4">
                <p className="text-[10px] font-semibold text-mega/60 uppercase tracking-wider mb-2">
                  대상자
                </p>
                <p className="font-bold text-sm text-gray-900 mb-3">{item.target_user_name}</p>
                {item.target_work_date ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Calendar className="size-3 text-mega/50" />
                      <span>{item.target_work_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock className="size-3 text-mega/50" />
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

            <div className="flex items-center justify-center gap-3 py-1">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-500 font-medium">
                <ArrowLeftRight className="size-3" />
                {item.type === 'EXCHANGE' ? '상호 교대' : '대타 요청'}
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
            </div>

            {item.note && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  메모
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{item.note}</p>
              </div>
            )}
          </div>

          {isPending && (
            <DialogFooter className="gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
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
                className="flex-1 rounded-xl bg-mega-secondary hover:bg-mega text-white shadow-sm transition-colors"
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

// ─── 스켈레톤 ─────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
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

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
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
  const [statusFilter, setStatusFilter] = useState<RequestStatus>('PENDING');
  const [sortKey, setSortKey] = useState<SortKey>('newest');

  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    type: 'dayoff' | 'shift';
    id: number;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number } | null>(null);

  const { data: dayoffs = [], isLoading: isDayoffsLoading, refetch: refetchDayoffs } = useAdminDayOffsQuery();
  const { data: shifts = [], isLoading: isShiftsLoading, refetch: refetchShifts } = useAdminShiftRequestsQuery();

  const { mutate: approveDayOff, isPending: isApprovingDayOff } = useApproveDayOffMutation();
  const { mutate: rejectDayOff, isPending: isRejectingDayOff } = useRejectDayOffMutation();
  const { mutate: deleteDayOff, isPending: isDeletingDayOff } = useDeleteApprovedDayOffMutation();
  const { mutate: approveShift, isPending: isApprovingShift } = useApproveShiftMutation();
  const { mutate: rejectShift, isPending: isRejectingShift } = useRejectShiftMutation();

  const handleRejectConfirm = () => {
    if (!rejectModal || !rejectReason.trim()) return;
    if (rejectModal.type === 'dayoff') rejectDayOff({ id: rejectModal.id, reason: rejectReason.trim() });
    else rejectShift({ id: rejectModal.id, reason: rejectReason.trim() });
    setRejectModal(null);
    setRejectReason('');
  };

  const pendingDayoffs = useMemo(() => dayoffs.filter((d) => d.status === 'PENDING'), [dayoffs]);
  const pendingShifts = useMemo(() => shifts.filter((s) => s.status === 'PENDING'), [shifts]);

  const sortFn = <T extends { created_at: string }>(list: T[], getName: (i: T) => string): T[] => {
    return [...list].sort((a, b) => {
      if (sortKey === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortKey === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return getName(a).localeCompare(getName(b), 'ko');
    });
  };

  const filteredDayoffs = useMemo(() => {
    let list = dayoffs;
    if (statusFilter !== 'ALL') list = list.filter((d) => d.status === statusFilter);
    if (search) list = list.filter((d) => d.user_name.includes(search));
    return sortFn(list, (i) => i.user_name);
  }, [dayoffs, statusFilter, search, sortKey]);

  const filteredShifts = useMemo(() => {
    let list = shifts;
    if (statusFilter !== 'ALL') list = list.filter((s) => s.status === statusFilter);
    if (search) list = list.filter((s) => s.requester_name.includes(search) || s.target_user_name.includes(search));
    return sortFn(list, (i) => i.requester_name);
  }, [shifts, statusFilter, search, sortKey]);

  const handleDeleteConfirm = () => {
    if (!deleteModal) return;
    deleteDayOff(deleteModal.id, { onSettled: () => setDeleteModal(null) });
  };

  const isLoading = activeTab === 'dayoff' ? isDayoffsLoading : isShiftsLoading;
  const isMutating = activeTab === 'dayoff'
    ? isApprovingDayOff || isRejectingDayOff || isDeletingDayOff
    : isApprovingShift || isRejectingShift;

  const currentList = activeTab === 'dayoff' ? dayoffs : shifts;
  const pendingCount = activeTab === 'dayoff' ? pendingDayoffs.length : pendingShifts.length;
  const approvedCount = currentList.filter((i) => i.status === 'APPROVED').length;
  const rejectedCount = currentList.filter((i) => i.status === 'REJECTED').length;

  const SORT_OPTIONS: { value: SortKey; label: string; icon: React.ReactNode }[] = [
    { value: 'newest', label: '최신순', icon: <ArrowUpDown className="size-3" /> },
    { value: 'oldest', label: '과거순', icon: <ArrowUpDown className="size-3 rotate-180" /> },
    { value: 'name', label: '이름순', icon: <ArrowDownAZ className="size-3" /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* ── Tab + Refresh ──────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-gray-100/80 rounded-xl p-1 gap-0.5">
          <button
            type="button"
            onClick={() => { setActiveTab('dayoff'); setSearch(''); setStatusFilter('PENDING'); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
              activeTab === 'dayoff'
                ? 'bg-white shadow-sm shadow-gray-200/80 text-mega'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
            )}
          >
            <Calendar className="size-3.5" />
            휴무 신청
            {pendingDayoffs.length > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full',
                activeTab === 'dayoff' ? 'bg-mega/15 text-mega' : 'bg-blue-500 text-white',
              )}>
                {pendingDayoffs.length > 9 ? '9+' : pendingDayoffs.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('shift'); setSearch(''); setStatusFilter('PENDING'); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
              activeTab === 'shift'
                ? 'bg-white shadow-sm shadow-gray-200/80 text-mega'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
            )}
          >
            <ArrowLeftRight className="size-3.5" />
            근무교대 신청
            {pendingShifts.length > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full',
                activeTab === 'shift' ? 'bg-mega/15 text-mega' : 'bg-blue-500 text-white',
              )}>
                {pendingShifts.length > 9 ? '9+' : pendingShifts.length}
              </span>
            )}
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 ml-auto"
          onClick={() => { if (activeTab === 'dayoff') void refetchDayoffs(); else void refetchShifts(); }}
          disabled={isLoading}
          title="새로고침"
        >
          <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* ── Stats (클릭 필터) ──────────────────────────────── */}
      {!isLoading && (
        <div className="flex items-center gap-2 flex-wrap">
          <StatChip label="대기 중" count={pendingCount} status="PENDING" activeStatus={statusFilter} onFilter={setStatusFilter} />
          <StatChip label="승인됨" count={approvedCount} status="APPROVED" activeStatus={statusFilter} onFilter={setStatusFilter} />
          <StatChip label="반려됨" count={rejectedCount} status="REJECTED" activeStatus={statusFilter} onFilter={setStatusFilter} />
          <span className="ml-auto text-xs text-gray-400 tabular-nums">전체 {currentList.length}건</span>
        </div>
      )}

      {/* ── 검색 + 정렬 ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* 검색 */}
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="이름으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-9 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-mega/40 focus:bg-white focus:ring-2 focus:ring-mega/10 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* 상태 필터 */}
        <div className="flex items-center bg-gray-100/80 rounded-xl p-1 gap-0.5">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as RequestStatus[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                statusFilter === f
                  ? 'bg-white shadow-sm text-gray-900 shadow-gray-200/80'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
              )}
            >
              {{ ALL: '전체', PENDING: '대기 중', APPROVED: '승인됨', REJECTED: '반려됨' }[f]}
            </button>
          ))}
        </div>

        {/* 정렬 */}
        <div className="flex items-center bg-gray-100/80 rounded-xl p-1 gap-0.5 sm:ml-auto">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortKey(opt.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                sortKey === opt.value
                  ? 'bg-white shadow-sm text-mega shadow-gray-200/80'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : activeTab === 'dayoff' ? (
        filteredDayoffs.length === 0 ? (
          <EmptyState
            icon={<Calendar className="size-7 text-gray-300" />}
            title="휴무 신청 내역 없음"
            description={
              statusFilter === 'PENDING' ? '대기 중인 휴무 신청이 없습니다.'
              : search ? `"${search}"에 해당하는 내역이 없습니다.`
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
                onReject={() => setRejectModal({ open: true, type: 'dayoff', id: item.id })}
                onDelete={() => setDeleteModal({ open: true, id: item.id })}
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
            statusFilter === 'PENDING' ? '대기 중인 근무교대 신청이 없습니다.'
            : search ? `"${search}"에 해당하는 내역이 없습니다.`
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
              onReject={() => setRejectModal({ open: true, type: 'shift', id: item.id })}
              isLoading={isMutating}
            />
          ))}
        </div>
      )}

      {/* ── 삭제 확인 모달 ─────────────────────────────────── */}
      <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
                <Trash2 className="size-4 text-red-500" />
              </div>
              승인된 휴무 삭제
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 py-2">
            승인된 휴무를 삭제하면 되돌릴 수 없습니다. 해당 직원에게 알림이 발송됩니다.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteModal(null)} className="rounded-xl">취소</Button>
            <Button
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDeleteConfirm}
              disabled={isDeletingDayOff}
            >
              <Trash2 className="size-3.5 mr-1.5" />삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 반려 사유 모달 ─────────────────────────────────── */}
      <Dialog open={!!rejectModal} onOpenChange={() => { setRejectModal(null); setRejectReason(''); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                <XCircle className="size-4 text-gray-500" />
              </div>
              반려 사유 입력
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-gray-500">
              반려 사유를 입력해주세요. 해당 내용이 게시글 댓글로 자동 등록됩니다.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요..."
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mega/20 focus:border-mega/30"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectModal(null); setRejectReason(''); }} className="rounded-xl">취소</Button>
            <Button
              disabled={!rejectReason.trim()}
              className="rounded-xl bg-gray-700 hover:bg-gray-800 text-white"
              onClick={handleRejectConfirm}
            >
              <XCircle className="size-3.5 mr-1.5" />반려 확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

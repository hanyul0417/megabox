import {
  Briefcase,
  Calendar,
  CheckCircle2,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shield,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import {
  useApproveUserMutation,
  usePendingUsersQuery,
  useRejectUserMutation,
} from '../api/queries';

import type { PendingUserDTO } from '../api/dto';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_REASON_LENGTH = 300;

// ─── 아바타 ───────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-blue-500 to-indigo-700',
  'from-emerald-500 to-teal-700',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-700',
  'from-cyan-500 to-blue-600',
];

function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initial = name.charAt(0);
  const gradient = AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
  const sizeClasses = {
    sm: 'w-9 h-9 text-sm rounded-xl',
    md: 'w-12 h-12 text-base rounded-2xl',
    lg: 'w-16 h-16 text-xl rounded-2xl',
  };
  return (
    <div
      className={cn(
        'flex items-center justify-center text-white font-bold shadow-md bg-gradient-to-br shrink-0 select-none',
        gradient,
        sizeClasses[size],
      )}
    >
      {initial}
    </div>
  );
}

// ─── 통계 카드 ────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  bg: string;
}

function StatCard({ label, value, icon, accent, bg }: StatCardProps) {
  return (
    <div className={cn('flex items-center gap-3.5 px-5 py-4 rounded-2xl border', bg)}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', accent)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── 정보 칩 ──────────────────────────────────────────────

function InfoChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-xs font-medium max-w-[220px] truncate">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

// ─── 로딩 스켈레톤 ────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 bg-white overflow-hidden">
      {/* Left border accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-100 rounded-l-2xl" />
      {/* Avatar */}
      <div className="w-12 h-12 rounded-2xl bg-gray-100 animate-pulse shrink-0" />
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        <div className="space-y-1.5">
          <div className="h-4 w-32 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-3 w-20 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-40 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-6 w-28 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-6 w-32 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
      {/* Buttons */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="h-8 w-16 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-8 w-16 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

// ─── 가입 신청 카드 ───────────────────────────────────────

interface PendingUserCardProps {
  user: PendingUserDTO;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}

function PendingUserCard({ user, onApprove, onReject, isLoading }: PendingUserCardProps) {
  return (
    <div className="group relative flex items-start gap-4 p-5 rounded-2xl border border-gray-100 bg-white hover:border-amber-200 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] transition-all duration-200 overflow-hidden">
      {/* Amber left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-400 rounded-l-2xl" />

      {/* Avatar */}
      <UserAvatar name={user.name} size="md" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h4 className="font-bold text-gray-900 text-[15px]">{user.name}</h4>
          <span className="text-xs text-gray-400 font-mono bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
            @{user.username}
          </span>
          <Badge className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 font-semibold gap-1 rounded-lg">
            <Clock className="size-2.5" />
            승인 대기
          </Badge>
        </div>

        {/* Info chips */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {user.email && <InfoChip icon={<Mail className="size-3" />} label={user.email} />}
          {user.phone && <InfoChip icon={<Phone className="size-3" />} label={user.phone} />}
          {user.birth_date && (
            <InfoChip icon={<Calendar className="size-3" />} label={user.birth_date} />
          )}
          {user.hire_date && (
            <InfoChip
              icon={<Briefcase className="size-3" />}
              label={`입사 예정 ${user.hire_date}`}
            />
          )}
          {user.health_cert_expire && (
            <InfoChip
              icon={<Shield className="size-3" />}
              label={`보건증 ${user.health_cert_expire}`}
            />
          )}
          {user.unavailable_days && user.unavailable_days.length > 0 && (
            <InfoChip
              icon={<Calendar className="size-3" />}
              label={`근무 불가: ${user.unavailable_days.map((d) => DAYS[d]).join(', ')}`}
            />
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 shrink-0 pt-0.5">
        <Button
          size="sm"
          className="h-8 px-4 text-xs rounded-xl bg-mega hover:bg-mega-hover active:scale-95 text-white shadow-sm transition-all font-semibold"
          onClick={onApprove}
          disabled={isLoading}
        >
          <CheckCircle2 className="size-3.5 mr-1.5" />
          승인
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-4 text-xs rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all font-semibold"
          onClick={onReject}
          disabled={isLoading}
        >
          <XCircle className="size-3.5 mr-1.5" />
          거절
        </Button>
      </div>
    </div>
  );
}

// ─── 메인 탭 컴포넌트 ─────────────────────────────────────

export function PendingUsersTab() {
  const { data, isLoading, refetch } = usePendingUsersQuery();
  const { mutate: approve, isPending: isApproving } = useApproveUserMutation();
  const { mutate: reject, isPending: isRejecting } = useRejectUserMutation();

  const [rejectTarget, setRejectTarget] = useState<PendingUserDTO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch] = useState('');

  const handleApprove = (user: PendingUserDTO) => {
    approve(user.id);
  };

  const handleRejectConfirm = () => {
    if (!rejectTarget) return;
    reject(
      { memberId: rejectTarget.id, data: { reason: rejectReason || undefined } },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectReason('');
        },
      },
    );
  };

  const handleDialogClose = () => {
    setRejectTarget(null);
    setRejectReason('');
  };

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const filtered = search
    ? items.filter((u) => u.name.includes(search) || u.username.includes(search))
    : items;

  return (
    <div className="flex flex-col gap-6">
      {/* ── 통계 배너 ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="승인 대기"
          value={total}
          icon={<Clock className="size-5 text-amber-600" />}
          accent="bg-amber-50"
          bg="bg-white border-amber-100"
        />
        <StatCard
          label="오늘 승인"
          value={0}
          icon={<CheckCircle className="size-5 text-mega" />}
          accent="bg-mega-light"
          bg="bg-white border-gray-100"
        />
        <StatCard
          label="오늘 거절"
          value={0}
          icon={<XCircle className="size-5 text-red-500" />}
          accent="bg-red-50"
          bg="bg-white border-gray-100"
        />
      </div>

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Clock className="size-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">가입 승인 대기</h3>
            <p className="text-xs text-gray-400 mt-0.5">승인 전까지 서비스 이용이 제한됩니다</p>
          </div>
          {total > 0 && (
            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-[11px] font-bold rounded-full bg-red-500 text-white shadow-sm">
              {total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 검색창 */}
          {items.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="이름 또는 아이디 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 h-9 w-52 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-mega/40 focus:bg-white focus:ring-2 focus:ring-mega/10 transition-all placeholder:text-gray-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}

          {/* 새로고침 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* ── 콘텐츠 ── */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative">
              <CardSkeleton />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-5 py-20">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center shadow-inner">
              <UserX className="size-9 text-gray-300" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Clock className="size-3.5 text-amber-400" />
            </div>
          </div>
          <div className="text-center max-w-xs">
            <p className="font-bold text-gray-700 text-base">
              {search ? '검색 결과 없음' : '모든 신청 처리 완료'}
            </p>
            <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
              {search
                ? `"${search}"에 해당하는 신청자가 없습니다.`
                : '현재 가입 승인 대기 중인 신청이 없습니다. 새로운 신청이 들어오면 여기에 표시됩니다.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((user) => (
            <PendingUserCard
              key={user.id}
              user={user}
              onApprove={() => handleApprove(user)}
              onReject={() => setRejectTarget(user)}
              isLoading={isApproving || isRejecting}
            />
          ))}
          {filtered.length > 0 && (
            <p className="text-xs text-gray-400 text-center pt-1">
              총 {filtered.length}명의 신청자
            </p>
          )}
        </div>
      )}

      {/* ── 거절 사유 Dialog ── */}
      <Dialog open={rejectTarget !== null} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden gap-0">
          {/* Dialog top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-red-400 to-rose-500" />

          <div className="p-6">
            <DialogHeader className="space-y-0">
              <div className="flex items-start gap-4">
                {/* 대상 아바타 */}
                {rejectTarget && <UserAvatar name={rejectTarget.name} size="lg" />}
                <div className="flex-1 min-w-0 pt-1">
                  <DialogTitle className="text-gray-900 text-base font-bold leading-none">
                    가입 신청 거절
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-2 leading-relaxed">
                    <span className="font-semibold text-gray-800">{rejectTarget?.name}</span>{' '}
                    <span className="text-gray-400 font-mono text-xs">
                      @{rejectTarget?.username}
                    </span>{' '}
                    님의 가입 신청을 거절합니다.
                    <br />
                    거절 사유는 선택 사항이며 감사 로그에 기록됩니다.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* 구분선 */}
            <div className="my-5 h-px bg-gray-100" />

            {/* 거절 사유 입력 */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                거절 사유 <span className="text-gray-400 font-normal normal-case">(선택)</span>
              </label>
              <Textarea
                placeholder="거절 사유를 입력하세요. 입력하지 않아도 거절 처리됩니다."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={MAX_REASON_LENGTH}
                rows={3}
                className="rounded-xl resize-none text-sm border-gray-200 focus-visible:ring-red-200 focus-visible:border-red-300 placeholder:text-gray-400"
              />
              <div className="flex justify-end">
                <span
                  className={cn(
                    'text-xs font-mono tabular-nums',
                    rejectReason.length > MAX_REASON_LENGTH * 0.9
                      ? 'text-red-500'
                      : 'text-gray-400',
                  )}
                >
                  {rejectReason.length} / {MAX_REASON_LENGTH}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 mt-5">
              <Button
                variant="outline"
                onClick={handleDialogClose}
                className="rounded-xl flex-1 h-10 text-sm font-semibold border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={isRejecting}
                className="rounded-xl flex-1 h-10 text-sm font-semibold bg-red-500 hover:bg-red-600 shadow-sm shadow-red-200"
              >
                {isRejecting ? (
                  <>
                    <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <XCircle className="size-3.5 mr-1.5" />
                    거절 확인
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

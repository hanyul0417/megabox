import { CheckCircle, XCircle, Clock, UserX } from 'lucide-react';
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
import { Input } from '@/shared/components/ui/input';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function PendingUsersTab() {
  const { data, isLoading } = usePendingUsersQuery();
  const { mutate: approve, isPending: isApproving } = useApproveUserMutation();
  const { mutate: reject, isPending: isRejecting } = useRejectUserMutation();

  const [rejectTarget, setRejectTarget] = useState<PendingUserDTO | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-mega-gray">
        <div className="w-6 h-6 border-2 border-mega border-t-transparent rounded-full animate-spin mr-2" />
        불러오는 중...
      </div>
    );
  }

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Clock size={18} className="text-mega" />
        <h3 className="font-semibold text-sm">가입 승인 대기</h3>
        {total > 0 && (
          <Badge variant="destructive" className="text-xs px-2">
            {total}명
          </Badge>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-mega-gray">
          <UserX size={36} />
          <p className="text-sm">승인 대기중인 가입 신청이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((user) => (
            <PendingUserCard
              key={user.id}
              user={user}
              onApprove={() => handleApprove(user)}
              onReject={() => setRejectTarget(user)}
              isLoading={isApproving || isRejecting}
            />
          ))}
        </div>
      )}

      {/* 거절 사유 Dialog */}
      <Dialog open={rejectTarget !== null} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>가입 거절</DialogTitle>
            <DialogDescription>
              <strong>{rejectTarget?.name}</strong> 님의 가입 신청을 거절합니다. 거절 사유를
              입력하면 추후 감사 로그에 기록됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="거절 사유 (선택)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={isRejecting}>
              {isRejecting ? '처리 중...' : '거절 확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PendingUserCardProps {
  user: PendingUserDTO;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}

function PendingUserCard({ user, onApprove, onReject, isLoading }: PendingUserCardProps) {
  return (
    <div className="border rounded-lg p-4 bg-card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-mega-gray">@{user.username}</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          승인 대기
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs text-mega-gray">
        {user.email && <span>📧 {user.email}</span>}
        {user.phone && <span>📱 {user.phone}</span>}
        {user.birth_date && <span>🎂 {user.birth_date}</span>}
        {user.gender && <span>👤 {user.gender === '남' ? '남성' : '여성'}</span>}
        {user.hire_date && <span>📅 입사 예정: {user.hire_date}</span>}
        {user.health_cert_expire && <span>🏥 보건증: {user.health_cert_expire}</span>}
        {user.unavailable_days && user.unavailable_days.length > 0 && (
          <span className="col-span-2">
            🚫 불가 요일: {user.unavailable_days.map((d) => DAYS[d]).join(', ')}
          </span>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          className="text-destructive border-destructive hover:bg-destructive hover:text-white"
          onClick={onReject}
          disabled={isLoading}
        >
          <XCircle size={14} className="mr-1" />
          거절
        </Button>
        <Button
          size="sm"
          className="bg-mega hover:bg-mega/90"
          onClick={onApprove}
          disabled={isLoading}
        >
          <CheckCircle size={14} className="mr-1" />
          승인
        </Button>
      </div>
    </div>
  );
}

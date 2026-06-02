import { useState } from 'react';
import { AlertTriangle, RotateCcw, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useDeletedUsersQuery, usePurgeUserMutation, useRestoreUserMutation } from '../api/queries';
import type { DeletedUserDTO } from '../api/dto';
import type { PurgeUserResultDTO } from '../api/dto';

import PurgeUserDialog from './PurgeUserDialog';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

const DeletedUsersPanel = () => {
  const { data, isLoading } = useDeletedUsersQuery();
  const restoreMutation = useRestoreUserMutation();
  const purgeMutation = usePurgeUserMutation();

  const [purgeTarget, setPurgeTarget] = useState<DeletedUserDTO | null>(null);

  const items = data?.items ?? [];

  const handleRestore = (userId: number) => {
    restoreMutation.mutate(userId, {
      onError: (err: unknown) => {
        const msg =
          err instanceof Error ? err.message : '복구에 실패했습니다. 복구 기간이 만료되었을 수 있습니다.';
        toast.error(msg);
      },
    });
  };

  const handlePurgeConfirm = (adminPassword: string) => {
    if (!purgeTarget) return;
    purgeMutation.mutate(
      { memberId: purgeTarget.id, admin_password: adminPassword },
      {
        onSuccess: (result: PurgeUserResultDTO) => {
          setPurgeTarget(null);
          const c = result.deleted_counts;
          const parts: string[] = [];
          if (c.schedules)         parts.push(`스케줄 ${c.schedules}건`);
          if (c.attendance_events) parts.push(`출퇴근 ${c.attendance_events}건`);
          if (c.payrolls)          parts.push(`급여 ${c.payrolls}건`);
          if (c.posts)             parts.push(`게시글 ${c.posts}건`);
          if (c.comments)          parts.push(`댓글 ${c.comments}건`);
          if (c.day_off_requests)  parts.push(`휴무신청 ${c.day_off_requests}건`);
          if (c.shift_requests)    parts.push(`시프트요청 ${c.shift_requests}건`);
          const detail = parts.length > 0 ? `\n삭제 내역: ${parts.join(', ')}` : '\n관련 데이터 없음';
          toast.success(`${result.name} 직원이 영구 삭제되었습니다.${detail}`, {
            duration: 6000,
          });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '영구 삭제에 실패했습니다.';
          toast.error(msg);
        },
      },
    );
  };

  const getDaysBadgeVariant = (days: number) => {
    if (days <= 3) return 'destructive' as const;
    if (days <= 10) return 'secondary' as const;
    return 'outline' as const;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        복구 가능한 삭제된 직원이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 mb-3">
          <AlertTriangle className="size-3.5 text-amber-500" />
          <p className="text-xs text-muted-foreground">
            삭제 후 30일이 지나면 영구 삭제됩니다. 필요한 경우 빠르게 복구하세요.
          </p>
        </div>

        {items.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Users className="size-4 text-gray-400" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.position}</span>
                  {user.hire_date && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      입사 {user.hire_date}
                    </span>
                  )}
                </div>
                {user.delete_reason && (
                  <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                    사유: {user.delete_reason}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <Badge variant={getDaysBadgeVariant(user.days_remaining)} className="text-xs">
                D-{user.days_remaining}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400"
                onClick={() => handleRestore(user.id)}
                disabled={restoreMutation.isPending || purgeMutation.isPending}
              >
                <RotateCcw className="size-3 mr-1" />
                복구
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/5 hover:border-destructive/60"
                onClick={() => setPurgeTarget(user)}
                disabled={restoreMutation.isPending || purgeMutation.isPending}
              >
                <Trash2 className="size-3 mr-1" />
                영구삭제
              </Button>
            </div>
          </div>
        ))}
      </div>

      {purgeTarget && (
        <PurgeUserDialog
          open={!!purgeTarget}
          onClose={() => setPurgeTarget(null)}
          onConfirm={handlePurgeConfirm}
          isPending={purgeMutation.isPending}
          userName={purgeTarget.name}
          username={purgeTarget.username}
        />
      )}
    </>
  );
};

export default DeletedUsersPanel;

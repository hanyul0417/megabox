import { AlertTriangle, RotateCcw, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useDeletedUsersQuery, useRestoreUserMutation } from '../api/queries';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

const DeletedUsersPanel = () => {
  const { data, isLoading } = useDeletedUsersQuery();
  const restoreMutation = useRestoreUserMutation();

  const items = data?.items ?? [];

  const handleRestore = (userId: number, name: string) => {
    restoreMutation.mutate(userId, {
      onError: (err: unknown) => {
        const msg =
          err instanceof Error ? err.message : '복구에 실패했습니다. 복구 기간이 만료되었을 수 있습니다.';
        toast.error(msg);
      },
    });
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
            {/* 아이콘 */}
            <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Users className="size-4 text-gray-400" />
            </div>

            {/* 정보 */}
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

          {/* 우측: 잔여일 + 복구 버튼 */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <Badge variant={getDaysBadgeVariant(user.days_remaining)} className="text-xs">
              D-{user.days_remaining}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400"
              onClick={() => handleRestore(user.id, user.name)}
              disabled={restoreMutation.isPending}
            >
              <RotateCcw className="size-3 mr-1" />
              복구
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DeletedUsersPanel;

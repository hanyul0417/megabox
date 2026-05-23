import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { AdminUserDTO } from '../api/dto';

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
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

type Props = {
  open: boolean;
  user: AdminUserDTO | null;
  isPending: boolean;
  onConfirm: (adminPassword: string, deleteReason?: string) => void;
  onCancel: () => void;
};

const DeleteWithPasswordDialog = ({ open, user, isPending, onConfirm, onCancel }: Props) => {
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 다이얼로그 닫힐 때 초기화
  useEffect(() => {
    if (!open) {
      setAdminPassword('');
      setDeleteReason('');
      setShowPassword(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!adminPassword.trim()) return;
    onConfirm(adminPassword, deleteReason || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isPending && adminPassword.trim()) {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-4" />
            직원 삭제
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">{user?.name}</span> 직원을
                삭제하시겠습니까?
              </p>
              <p className="text-xs text-emerald-600 font-medium">
                ✓ 삭제 후 30일 이내에 복구할 수 있습니다.
              </p>
              <p className="text-xs text-muted-foreground">
                30일이 지나면 모든 관련 데이터가 영구 삭제됩니다.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 관리자 비밀번호 */}
          <div className="space-y-1.5">
            <Label htmlFor="admin-password" className="text-sm font-medium">
              관리자 비밀번호 <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="현재 관리자 비밀번호 입력"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isPending}
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* 삭제 사유 (선택) */}
          <div className="space-y-1.5">
            <Label htmlFor="delete-reason" className="text-sm font-medium">
              삭제 사유{' '}
              <span className="text-xs text-muted-foreground font-normal">(선택)</span>
            </Label>
            <Textarea
              id="delete-reason"
              placeholder="삭제 사유를 입력하세요 (이력에 기록됩니다)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              disabled={isPending}
              className="resize-none h-20 text-sm"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!adminPassword.trim() || isPending}
          >
            {isPending ? '삭제 중...' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteWithPasswordDialog;

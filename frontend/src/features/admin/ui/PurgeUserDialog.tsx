import { useState } from 'react';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

interface PurgeUserDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (adminPassword: string) => void;
  isPending: boolean;
  userName: string;
  username: string;
}

const PURGE_DATA_LIST = [
  '개인정보 (이름, 연락처, 주민번호, 계좌 등)',
  '스케줄 및 시프트 교환 기록',
  '출퇴근 기록',
  '급여 기록',
  '커뮤니티 게시글 및 댓글',
  '휴무 신청 기록',
  '로그인 토큰 및 알림',
];

const PurgeUserDialog = ({
  open,
  onClose,
  onConfirm,
  isPending,
  userName,
  username,
}: PurgeUserDialogProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleClose = () => {
    setPassword('');
    setShowPassword(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!password) return;
    onConfirm(password);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password) handleConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            영구 삭제 확인
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm">
            <span className="font-semibold">{userName}</span>
            <span className="text-muted-foreground ml-1">({username})</span> 직원을 영구 삭제합니다.
          </p>

          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-destructive">삭제되는 데이터 (복구 불가)</p>
            <ul className="space-y-0.5">
              {PURGE_DATA_LIST.map((item) => (
                <li key={item} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="mt-0.5 text-destructive/60">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purge-password" className="text-sm">
              관리자 비밀번호
            </Label>
            <div className="relative">
              <Input
                id="purge-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-10"
                autoComplete="current-password"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!password || isPending}
          >
            {isPending ? '삭제 중...' : '영구 삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurgeUserDialog;

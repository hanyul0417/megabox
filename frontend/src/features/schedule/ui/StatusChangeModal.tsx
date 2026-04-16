import { AlertTriangle, CheckCircle2, PenLine, ShieldCheck, X } from 'lucide-react';

import type { ScheduleStatus } from '../model/type';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface StatusChangeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
  currentStatus?: ScheduleStatus;
  year: number;
  week: number;
}

const StatusChangeModal = ({
  open,
  onClose,
  onConfirm,
  isPending = false,
  currentStatus,
  year,
  week,
}: StatusChangeModalProps) => {
  const isConfirming = currentStatus !== 'CONFIRMED';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-md rounded-2xl">
        {/* Header */}
        <div
          className={
            isConfirming
              ? 'bg-gradient-to-r from-mega-secondary to-mega px-6 py-5 flex items-center gap-3'
              : 'bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-5 flex items-center gap-3'
          }
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {isConfirming ? (
              <ShieldCheck className="text-white size-5" />
            ) : (
              <PenLine className="text-white size-5" />
            )}
          </div>
          <DialogTitle className="text-white font-bold">
            {isConfirming ? '스케줄 확정' : '초안으로 변경'}
          </DialogTitle>
          <DialogClose
            className="ml-auto text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 p-1"
            onClick={onClose}
          >
            <X className="size-5" />
          </DialogClose>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Info box */}
          <div
            className={
              isConfirming
                ? 'bg-mega/5 border border-mega/15 rounded-xl p-4'
                : 'bg-amber-50 border border-amber-100 rounded-xl p-4'
            }
          >
            <div className="flex items-start gap-3">
              {isConfirming ? (
                <CheckCircle2 className="size-5 text-mega mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
              )}
              <div>
                <p
                  className={`font-semibold text-sm mb-1 ${isConfirming ? 'text-mega' : 'text-amber-700'}`}
                >
                  {isConfirming
                    ? `${year}년 ${week}주차 스케줄을 확정합니다`
                    : `${year}년 ${week}주차 스케줄을 초안으로 변경합니다`}
                </p>
                <p
                  className={`text-xs leading-relaxed ${isConfirming ? 'text-mega/70' : 'text-amber-600'}`}
                >
                  {isConfirming
                    ? '확정된 스케줄은 모든 직원이 확인할 수 있습니다. 확정 후에도 수정은 가능합니다.'
                    : '초안으로 변경 시 직원들에게 임시 상태로 표시됩니다. 다시 확정하면 최종 확정됩니다.'}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 text-center">계속 진행하시겠습니까?</p>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-6 gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl h-10"
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            className={
              isConfirming
                ? 'flex-1 bg-mega hover:bg-mega-secondary text-white rounded-xl h-10 shadow-sm'
                : 'flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-10 shadow-sm'
            }
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? '처리 중...' : isConfirming ? '확정하기' : '초안으로 변경'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatusChangeModal;

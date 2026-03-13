import { AlertCircle, Calendar, X } from 'lucide-react';
import { useState } from 'react';

import type { DayOffCreateDTO } from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

interface DayoffModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: DayOffCreateDTO) => void;
  isPending?: boolean;
}

function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay(); // 0=일, 6=토
  return day === 0 || day === 6;
}

const DayoffModal = ({ open, onClose, onSubmit, isPending = false }: DayoffModalProps) => {
  const [requestDate, setRequestDate] = useState('');
  const [reason, setReason] = useState('');

  const isWeekendDate = isWeekend(requestDate);
  const isFormValid = requestDate.trim() !== '' && reason.trim() !== '';

  const handleSubmit = () => {
    if (!isFormValid) return;
    onSubmit({ request_date: requestDate, reason: reason.trim() });
  };

  const handleClose = () => {
    setRequestDate('');
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-md rounded-2xl">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Calendar className="text-white size-5" />
          </div>
          <DialogTitle className="text-white font-bold">휴무 신청</DialogTitle>
          <DialogClose
            className="ml-auto text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 p-1"
            onClick={handleClose}
          >
            <X className="size-5" />
          </DialogClose>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Info alert */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="font-semibold text-emerald-700 text-sm mb-1">휴무 신청 안내</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              승인은 관리자가 검토 후 처리됩니다. 긴급한 경우 관리자에게 직접 연락해주세요.
            </p>
          </div>

          {/* Request date */}
          <div className="space-y-2">
            <Label htmlFor="dayoff-date" className="text-sm font-semibold text-gray-700">
              신청일
            </Label>
            <Input
              id="dayoff-date"
              type="date"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>

          {/* 주말/공휴일 경고 */}
          {isWeekendDate && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-amber-500" />
              <span>주말/공휴일은 월 2회 제한이 적용됩니다.</span>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="dayoff-reason" className="text-sm font-semibold text-gray-700">
              사유
            </Label>
            <Textarea
              id="dayoff-reason"
              placeholder="휴무 신청 사유를 상세히 입력해주세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-6 gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 rounded-xl h-10"
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-10 shadow-sm"
            onClick={handleSubmit}
            disabled={isPending || !isFormValid}
          >
            {isPending ? '신청 중...' : '신청하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DayoffModal;

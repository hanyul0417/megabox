import { ArrowLeftRight, Calendar, MessageSquare, User, X } from 'lucide-react';
import { useState } from 'react';

import type { ScheduleUserOption } from '../model/type';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    requester_schedule_date: string;
    target_user_id: number;
    target_schedule_date: string;
    reason: string;
  }) => void;
  employees: ScheduleUserOption[];
  isPending?: boolean;
}

const ShiftModal = ({ open, onClose, onSubmit: _onSubmit, employees, isPending = false }: ShiftModalProps) => {
  const [myDate, setMyDate] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [targetDate, setTargetDate] = useState('');
  const [reason, setReason] = useState('');

  const isValid =
    myDate.trim() !== '' && targetUserId !== '' && targetDate.trim() !== '' && reason.trim() !== '';

  const handleClose = () => {
    setMyDate('');
    setTargetUserId('');
    setTargetDate('');
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-md">
        {/* Header */}
        <div className="bg-sky-500 px-6 py-4 flex items-center gap-3">
          <ArrowLeftRight className="text-white size-5 shrink-0" />
          <DialogTitle className="text-white">근무교대 신청</DialogTitle>
          <DialogClose
            className="ml-auto text-white/80 hover:text-white transition-colors"
            onClick={handleClose}
          >
            <X className="size-5" />
          </DialogClose>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Info alert */}
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm">
            <p className="text-sky-700 text-xs leading-relaxed">
              다른 직원과 근무 일정을 교대할 수 있습니다. 신청 후 상대방의 승인이 필요합니다.
            </p>
          </div>

          {/* My work date */}
          <div className="space-y-1.5">
            <Label htmlFor="shift-my-date" className="flex items-center gap-1.5">
              <Calendar className="size-4 text-muted-foreground" />내 근무일 (양도할 날짜)
            </Label>
            <Input
              id="shift-my-date"
              type="date"
              value={myDate}
              onChange={(e) => setMyDate(e.target.value)}
            />
          </div>

          {/* Swap icon divider */}
          <div className="flex items-center justify-center">
            <div className="flex items-center justify-center size-9 rounded-full bg-sky-500 shadow-sm">
              <ArrowLeftRight className="size-4 text-white" />
            </div>
          </div>

          {/* Target employee select */}
          <div className="space-y-1.5">
            <Label htmlFor="shift-target-user" className="flex items-center gap-1.5">
              <User className="size-4 text-muted-foreground" />
              교대 요청 직원
            </Label>
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger id="shift-target-user" className="w-full">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.name}
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({employee.username})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target work date */}
          <div className="space-y-1.5">
            <Label htmlFor="shift-target-date" className="flex items-center gap-1.5">
              <Calendar className="size-4 text-muted-foreground" />
              받을 근무일
            </Label>
            <Input
              id="shift-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="shift-reason" className="flex items-center gap-1.5">
              <MessageSquare className="size-4 text-muted-foreground" />
              사유
            </Label>
            <Textarea
              id="shift-reason"
              placeholder="교대 신청 사유를 입력해주세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-6 gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            취소
          </Button>
          <Button
            className="flex-1 bg-sky-500 hover:bg-sky-500/90 text-white"
            // onClick={handleSubmit}
            disabled={isPending || !isValid}
          >
            {isPending ? '신청 중...' : '신청하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftModal;

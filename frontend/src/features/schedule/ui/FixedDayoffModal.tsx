import { CalendarCheck, X } from 'lucide-react';
import { useState } from 'react';

import type { FixedDayOffCreateDTO } from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

const DAYS = [
  { label: '일', value: 0 },
  { label: '월', value: 1 },
  { label: '화', value: 2 },
  { label: '수', value: 3 },
  { label: '목', value: 4 },
  { label: '금', value: 5 },
  { label: '토', value: 6 },
];

interface FixedDayoffModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FixedDayOffCreateDTO) => void;
  isPending?: boolean;
  currentDays?: number[];
}

const FixedDayoffModal = ({
  open,
  onClose,
  onSubmit,
  isPending = false,
  currentDays = [],
}: FixedDayoffModalProps) => {
  const [selectedDays, setSelectedDays] = useState<number[]>(currentDays);
  const [reason, setReason] = useState('');

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleClose = () => {
    setSelectedDays(currentDays);
    setReason('');
    onClose();
  };

  const handleSubmit = () => {
    onSubmit({ requested_days: selectedDays, reason: reason.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-md rounded-2xl">
        <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <CalendarCheck className="text-white size-5" />
          </div>
          <DialogTitle className="text-white font-bold">고정휴무 신청</DialogTitle>
          <DialogClose
            className="ml-auto text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 p-1"
            onClick={handleClose}
          >
            <X className="size-5" />
          </DialogClose>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
            <p className="font-semibold text-violet-700 text-sm mb-1">고정휴무 신청 안내</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              매주 특정 요일을 고정 휴무로 신청합니다. 관리자 승인 후 스케줄 배정에 반영됩니다.
              기존 고정휴무 요일은 승인 시 신청한 요일로 변경됩니다.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">휴무 요일 선택</Label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`
                      flex flex-col items-center justify-center h-12 rounded-xl text-sm font-semibold transition-all
                      ${isSelected
                        ? 'bg-violet-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                      ${day.value === 0 ? (isSelected ? '' : 'text-red-500') : ''}
                      ${day.value === 6 ? (isSelected ? '' : 'text-blue-500') : ''}
                    `}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            {selectedDays.length > 0 && (
              <p className="text-xs text-violet-600 font-medium">
                선택: {selectedDays.sort((a, b) => a - b).map((d) => DAYS[d].label + '요일').join(', ')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fixed-dayoff-reason" className="text-sm font-semibold text-gray-700">
              사유 <span className="text-gray-400 font-normal">(선택)</span>
            </Label>
            <Textarea
              id="fixed-dayoff-reason"
              placeholder="고정휴무 신청 사유를 입력해주세요 (선택사항)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>
        </div>

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
            className="flex-1 bg-violet-500 hover:bg-violet-600 text-white rounded-xl h-10 shadow-sm"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? '신청 중...' : '신청하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FixedDayoffModal;

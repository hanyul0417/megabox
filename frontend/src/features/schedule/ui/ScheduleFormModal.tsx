import { isAxiosError } from 'axios';
import { CalendarPlus, Clock, Moon, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ScheduleCreateDTO, ScheduleUpdateDTO } from '../api/dto';
import type { ScheduleResponse, ScheduleUserOption } from '../model/type';

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
import { cn } from '@/shared/lib/utils';
import TimeInput from '@/shared/ui/TimeInput';

export interface ShiftPresetItem {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  border_color: string;
  font_color: string;
}

interface ScheduleFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (scheduleWeekId: number, data: ScheduleCreateDTO) => void | Promise<void>;
  onUpdate?: (id: number, data: ScheduleUpdateDTO) => void;
  isPending?: boolean;
  employees: ScheduleUserOption[];
  scheduleWeekId: number;
  initialData?: ScheduleResponse;
  shiftPresets?: ShiftPresetItem[];
}

const ScheduleFormModal = ({
  open,
  onClose,
  onSubmit,
  onUpdate,
  isPending = false,
  employees,
  scheduleWeekId,
  initialData,
  shiftPresets = [],
}: ScheduleFormModalProps) => {
  const [userId, setUserId] = useState<string>('');
  const [workDate, setWorkDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const isEditMode = Boolean(initialData);

  const isOvernight =
    startTime !== '' && endTime !== '' && endTime <= startTime && endTime !== startTime;

  useEffect(() => {
    if (open) {
      if (initialData) {
        setUserId(String(initialData.user_id));
        setWorkDate(initialData.work_date);
        setStartTime(initialData.start_time);
        setEndTime(initialData.end_time);
      } else {
        setUserId('');
        setWorkDate('');
        setStartTime('');
        setEndTime('');
      }
      setActivePreset(null);
    }
  }, [open, initialData]);

  const resetForm = () => {
    setUserId('');
    setWorkDate('');
    setStartTime('');
    setEndTime('');
    setActivePreset(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const applyPreset = (preset: { id: number; start_time: string; end_time: string }) => {
    setStartTime(preset.start_time);
    setEndTime(preset.end_time);
    setActivePreset(preset.id);
  };

  const isFormValid =
    userId !== '' && workDate.trim() !== '' && startTime.trim() !== '' && endTime.trim() !== '';

  const handleSubmit = async () => {
    if (!isFormValid) return;

    if (isEditMode && initialData && onUpdate) {
      onUpdate(initialData.id, {
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
      });
    } else {
      try {
        await onSubmit(scheduleWeekId, {
          user_id: Number(userId),
          work_date: workDate,
          start_time: startTime,
          end_time: endTime,
        });
      } catch (err: unknown) {
        if (isAxiosError(err) && err.response?.status === 409) {
          const detail = err.response.data?.detail;
          if (typeof detail === 'object' && detail !== null && 'message' in detail) {
            toast.error(detail.message as string);
          } else if (typeof detail === 'string') {
            toast.error(detail);
          } else {
            toast.error('해당 날짜에 충돌하는 일정이 있습니다.');
          }
          return;
        }
        throw err;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-md rounded-2xl">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-mega-secondary to-mega px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <CalendarPlus className="text-white size-5" />
          </div>
          <DialogTitle className="text-white font-bold">
            스케줄 {isEditMode ? '수정' : '생성'}
          </DialogTitle>
          <DialogClose
            className="ml-auto text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 p-1"
            onClick={handleClose}
            aria-label="닫기"
          >
            <X className="size-5" />
          </DialogClose>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Employee select */}
          <div className="space-y-2">
            <Label
              htmlFor="schedule-user"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
            >
              <User className="size-3.5 text-mega-secondary" />
              직원 선택
            </Label>
            <Select value={userId} onValueChange={setUserId} disabled={isEditMode}>
              <SelectTrigger
                id="schedule-user"
                className="w-full rounded-xl h-11 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <SelectValue placeholder="직원을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.name}
                    <span className="text-muted-foreground ml-1 text-xs">({emp.position})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Work date */}
          <div className="space-y-2">
            <Label
              htmlFor="schedule-date"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
            >
              <CalendarPlus className="size-3.5 text-mega-secondary" />
              근무 날짜
            </Label>
            <Input
              id="schedule-date"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>

          {/* Shift presets */}
          {shiftPresets.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <Clock className="size-3.5 text-mega-secondary" />
                시프트 빠른 선택
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {shiftPresets.map((preset) => {
                  const isActive = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={cn(
                        'flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                        isActive && 'ring-2',
                      )}
                      style={{
                        borderColor: preset.border_color,
                        color: preset.font_color,
                        ...(isActive ? { boxShadow: `0 0 0 2px ${preset.border_color}40` } : {}),
                      }}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[9px] font-normal opacity-70 leading-none">
                        {preset.start_time}~{preset.end_time}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="schedule-start-time"
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
              >
                <Clock className="size-3.5 text-mega-secondary" />
                시작 시간
              </Label>
              <TimeInput
                id="schedule-start-time"
                value={startTime}
                onChange={(v) => {
                  setStartTime(v);
                  setActivePreset(null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="schedule-end-time"
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
              >
                <Clock className="size-3.5 text-mega-secondary" />
                종료 시간
              </Label>
              <TimeInput
                id="schedule-end-time"
                value={endTime}
                onChange={(v) => {
                  setEndTime(v);
                  setActivePreset(null);
                }}
              />
            </div>
          </div>

          {/* Overnight indicator */}
          {isOvernight && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-700">
              <Moon className="size-3.5 shrink-0 text-indigo-500" />
              <span>
                야간 근무입니다. 종료 시간이 다음 날 <strong>{endTime}</strong>으로 처리됩니다.
              </span>
            </div>
          )}
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
            className="flex-1 bg-mega-secondary hover:bg-mega text-white rounded-xl h-10 shadow-sm"
            onClick={() => void handleSubmit()}
            disabled={isPending || !isFormValid}
          >
            {isPending
              ? isEditMode
                ? '수정 중...'
                : '생성 중...'
              : isEditMode
                ? '수정하기'
                : '생성하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleFormModal;

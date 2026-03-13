import { ArrowLeftRight, UserCheck, X } from 'lucide-react';
import { useState } from 'react';

import type { ShiftRequestCreateDTO } from '../api/dto';
import type { ScheduleResponse, ScheduleUserOption, ShiftType } from '../model/type';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/utils';

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ShiftRequestCreateDTO) => void;
  mySchedules: ScheduleResponse[];
  allSchedules: ScheduleResponse[];
  employees: ScheduleUserOption[];
  isPending?: boolean;
}

function formatScheduleLabel(s: ScheduleResponse): string {
  return `${s.work_date} ${s.start_time}~${s.end_time}`;
}

type TabType = 'EXCHANGE' | 'SUBSTITUTE';

const ShiftModal = ({
  open,
  onClose,
  onSubmit,
  mySchedules,
  allSchedules,
  employees,
  isPending = false,
}: ShiftModalProps) => {
  const [tab, setTab] = useState<TabType>('EXCHANGE');

  // 공통
  const [myScheduleId, setMyScheduleId] = useState<string>('');

  // 교대(EXCHANGE) 전용
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [targetScheduleId, setTargetScheduleId] = useState<string>('');

  // 대타(SUBSTITUTE) 전용
  const [substituteUserId, setSubstituteUserId] = useState<string>('');

  const resetForm = () => {
    setMyScheduleId('');
    setTargetUserId('');
    setTargetScheduleId('');
    setSubstituteUserId('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTabChange = (newTab: TabType) => {
    setTab(newTab);
    resetForm();
  };

  // 선택된 상대방의 스케줄 목록
  const targetUserSchedules = allSchedules.filter((s) => s.user_id === Number(targetUserId));

  const isExchangeValid = myScheduleId !== '' && targetUserId !== '' && targetScheduleId !== '';

  const isSubstituteValid = myScheduleId !== '' && substituteUserId !== '';

  const isValid = tab === 'EXCHANGE' ? isExchangeValid : isSubstituteValid;

  const handleSubmit = () => {
    if (!isValid) return;

    const shiftType: ShiftType = tab;

    if (shiftType === 'EXCHANGE') {
      onSubmit({
        type: shiftType,
        requester_schedule_id: Number(myScheduleId),
        target_user_id: Number(targetUserId),
        target_schedule_id: Number(targetScheduleId),
      });
    } else {
      onSubmit({
        type: shiftType,
        requester_schedule_id: Number(myScheduleId),
        target_user_id: Number(substituteUserId),
      });
    }
  };

  const isExchange = tab === 'EXCHANGE';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-md rounded-2xl">
        {/* Header with gradient */}
        <div
          className={cn(
            'px-6 py-5 flex items-center gap-3',
            isExchange
              ? 'bg-gradient-to-r from-sky-500 to-blue-500'
              : 'bg-gradient-to-r from-violet-500 to-purple-500',
          )}
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {isExchange ? (
              <ArrowLeftRight className="text-white size-5" />
            ) : (
              <UserCheck className="text-white size-5" />
            )}
          </div>
          <DialogTitle className="text-white font-bold">
            {isExchange ? '근무교대 신청' : '대타 신청'}
          </DialogTitle>
          <DialogClose
            className="ml-auto text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 p-1"
            onClick={handleClose}
          >
            <X className="size-5" />
          </DialogClose>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={() => handleTabChange('EXCHANGE')}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition-all border-b-2',
              tab === 'EXCHANGE'
                ? 'border-sky-500 text-sky-600 bg-sky-50/50'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            )}
          >
            근무교대
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('SUBSTITUTE')}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition-all border-b-2',
              tab === 'SUBSTITUTE'
                ? 'border-violet-500 text-violet-600 bg-violet-50/50'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            )}
          >
            대타
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* 안내 */}
          {isExchange ? (
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-xs text-sky-700 leading-relaxed">
              다른 직원과 근무 일정을 교대합니다. 신청 후 상대방 승인이 필요합니다.
            </div>
          ) : (
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-xs text-violet-700 leading-relaxed">
              내 근무를 다른 직원이 대신 근무하도록 신청합니다.
            </div>
          )}

          {/* 내 근무 선택 */}
          <div className="space-y-2">
            <Label htmlFor="shift-my-schedule" className="text-sm font-semibold text-gray-700">
              내 근무 선택
            </Label>
            {mySchedules.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-center">
                이번 주 등록된 내 근무가 없습니다.
              </p>
            ) : (
              <Select value={myScheduleId} onValueChange={setMyScheduleId}>
                <SelectTrigger id="shift-my-schedule" className="w-full rounded-xl h-11">
                  <SelectValue placeholder="근무 일정을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {mySchedules.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {formatScheduleLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 근무교대: 상대방 직원 + 상대방 근무 선택 */}
          {isExchange && (
            <>
              <div className="space-y-2">
                <Label htmlFor="shift-target-user" className="text-sm font-semibold text-gray-700">
                  교대 요청 직원
                </Label>
                <Select
                  value={targetUserId}
                  onValueChange={(v) => {
                    setTargetUserId(v);
                    setTargetScheduleId('');
                  }}
                >
                  <SelectTrigger id="shift-target-user" className="w-full rounded-xl h-11">
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

              {targetUserId !== '' && (
                <div className="space-y-2">
                  <Label
                    htmlFor="shift-target-schedule"
                    className="text-sm font-semibold text-gray-700"
                  >
                    상대방 근무 선택
                  </Label>
                  {targetUserSchedules.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-center">
                      해당 직원의 이번 주 근무가 없습니다.
                    </p>
                  ) : (
                    <Select value={targetScheduleId} onValueChange={setTargetScheduleId}>
                      <SelectTrigger id="shift-target-schedule" className="w-full rounded-xl h-11">
                        <SelectValue placeholder="교대할 근무를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetUserSchedules.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {formatScheduleLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </>
          )}

          {/* 대타: 대타 직원 선택 */}
          {!isExchange && (
            <div className="space-y-2">
              <Label
                htmlFor="shift-substitute-user"
                className="text-sm font-semibold text-gray-700"
              >
                대타 직원 선택
              </Label>
              <Select value={substituteUserId} onValueChange={setSubstituteUserId}>
                <SelectTrigger id="shift-substitute-user" className="w-full rounded-xl h-11">
                  <SelectValue placeholder="대타 직원을 선택하세요" />
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
            className={cn(
              'flex-1 rounded-xl h-10 shadow-sm',
              isExchange
                ? 'bg-sky-500 hover:bg-sky-600 text-white'
                : 'bg-violet-500 hover:bg-violet-600 text-white',
            )}
            onClick={handleSubmit}
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

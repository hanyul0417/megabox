import { ArrowLeftRight, PlusCircle } from 'lucide-react';
import { useState } from 'react';

import {
  ShiftModal,
  getISOWeek,
  useCreateShiftRequestMutation,
  useMyShiftRequestsQuery,
  useScheduleUsersQuery,
  useWeekScheduleQuery,
} from '@/features/schedule';
import type { ShiftRequestCreateDTO } from '@/features/schedule/api/dto';
import { useUserQuery } from '@/entities/user/api/queries';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

const STATUS_MAP = {
  PENDING: { label: '검토중', class: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: '승인', class: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '반려', class: 'bg-red-100 text-red-700' },
} as const;

const TYPE_MAP = {
  EXCHANGE: '근무교대',
  SUBSTITUTE: '대타',
} as const;

export default function ApplyShiftTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: myShifts = [], isLoading } = useMyShiftRequestsQuery();
  const { mutate: createShift, isPending } = useCreateShiftRequestMutation();
  const { data: user } = useUserQuery();

  const today = new Date();
  const { year, week } = getISOWeek(today);
  const { data: weekData } = useWeekScheduleQuery(year, week);
  const { data: employees = [] } = useScheduleUsersQuery();

  const allSchedules = weekData?.schedules ?? [];
  const mySchedules = allSchedules.filter((s) => s.user_id === user?.id);

  const handleSubmit = (data: ShiftRequestCreateDTO) => {
    createShift(data, { onSuccess: () => setModalOpen(false) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">총 {myShifts.length}건</p>
        <Button
          size="sm"
          className="bg-mega hover:bg-mega/90 text-white rounded-xl gap-1.5"
          onClick={() => setModalOpen(true)}
        >
          <PlusCircle className="size-4" />
          근무교대 신청
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
      )}

      {!isLoading && myShifts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ArrowLeftRight className="size-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">신청 내역이 없습니다.</p>
        </div>
      )}

      <div className="space-y-3">
        {myShifts.map((shift) => {
          const status = STATUS_MAP[shift.status] ?? STATUS_MAP.PENDING;
          const typeLabel = TYPE_MAP[shift.type] ?? shift.type;

          return (
            <div
              key={shift.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {typeLabel}
                    </span>
                    <span className="font-semibold text-gray-800 text-sm">
                      {shift.requester_work_date ?? '날짜 미정'}{' '}
                      {shift.requester_start_time && shift.requester_end_time
                        ? `${shift.requester_start_time}~${shift.requester_end_time}`
                        : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    대상:{' '}
                    <span className="font-medium text-gray-700">{shift.target_user_name}</span>
                    {shift.target_work_date && ` (${shift.target_work_date})`}
                  </p>
                  {shift.note && (
                    <p className="text-xs text-gray-400 line-clamp-1">메모: {shift.note}</p>
                  )}
                  <p className="text-[11px] text-gray-400">
                    신청일: {new Date(shift.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full',
                    status.class,
                  )}
                >
                  {status.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <ShiftModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        mySchedules={mySchedules}
        allSchedules={allSchedules}
        employees={employees}
        isPending={isPending}
      />
    </div>
  );
}

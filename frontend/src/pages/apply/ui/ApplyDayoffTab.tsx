import { Calendar, PlusCircle } from 'lucide-react';
import { useState } from 'react';

import {
  DayoffModal,
  useCreateDayOffMutation,
  useMyDayOffsQuery,
} from '@/features/schedule';
import type { DayOffCreateDTO } from '@/features/schedule/api/dto';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

const STATUS_MAP = {
  PENDING: { label: '검토중', class: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: '승인', class: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '반려', class: 'bg-red-100 text-red-700' },
} as const;

export default function ApplyDayoffTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: myDayoffs = [], isLoading } = useMyDayOffsQuery();
  const { mutate: createDayOff, isPending } = useCreateDayOffMutation();

  const handleSubmit = (data: DayOffCreateDTO) => {
    createDayOff(data, { onSuccess: () => setModalOpen(false) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">총 {myDayoffs.length}건</p>
        <Button
          size="sm"
          className="bg-mega hover:bg-mega/90 text-white rounded-xl gap-1.5"
          onClick={() => setModalOpen(true)}
        >
          <PlusCircle className="size-4" />
          휴무 신청
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
      )}

      {!isLoading && myDayoffs.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="size-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">신청 내역이 없습니다.</p>
        </div>
      )}

      <div className="space-y-3">
        {myDayoffs.map((dayoff) => {
          const status = STATUS_MAP[dayoff.status] ?? STATUS_MAP.PENDING;
          const d = new Date(dayoff.request_date + 'T00:00:00');
          const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
          const dayLabel = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${dayNames[d.getDay()]})`;

          return (
            <div
              key={dayoff.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-sm">{dayLabel}</span>
                    {dayoff.is_weekend_or_holiday && (
                      <span className="text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md">
                        주말/공휴일
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{dayoff.reason}</p>
                  <p className="text-[11px] text-gray-400">
                    신청일: {new Date(dayoff.created_at).toLocaleDateString('ko-KR')}
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

      <DayoffModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isPending={isPending}
      />
    </div>
  );
}

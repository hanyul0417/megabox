import { CalendarCheck, PlusCircle } from 'lucide-react';
import { useState } from 'react';

import { useMyProfileQuery } from '@/features/mypage/api/queries';
import {
  useCreateFixedDayOffMutation,
  useMyFixedDayOffsQuery,
} from '@/features/schedule';
import type { FixedDayOffCreateDTO } from '@/features/schedule/api/dto';
import FixedDayoffModal from '@/features/schedule/ui/FixedDayoffModal';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

const STATUS_MAP = {
  PENDING: { label: '검토중', class: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: '승인', class: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '반려', class: 'bg-red-100 text-red-700' },
} as const;

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function ApplyFixedDayoffTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: myRequests = [], isLoading } = useMyFixedDayOffsQuery();
  const { mutate: createFixedDayOff, isPending } = useCreateFixedDayOffMutation();
  const { data: profile } = useMyProfileQuery();

  const currentDays = profile?.unavailable_days ?? [];
  const hasPending = myRequests.some((r) => r.status === 'PENDING');

  const handleSubmit = (data: FixedDayOffCreateDTO) => {
    createFixedDayOff(data, { onSuccess: () => setModalOpen(false) });
  };

  return (
    <div className="space-y-4">
      {/* 현재 고정휴무 */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          현재 고정 휴무 요일
        </p>
        {currentDays.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {currentDays
              .slice()
              .sort((a, b) => a - b)
              .map((d) => (
                <span
                  key={d}
                  className="px-3 py-1 rounded-full text-sm font-semibold bg-violet-100 text-violet-700"
                >
                  {DAY_LABELS[d]}요일
                </span>
              ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">설정된 고정 휴무 요일이 없습니다.</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">신청 내역 {myRequests.length}건</p>
        <Button
          size="sm"
          className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl gap-1.5"
          onClick={() => setModalOpen(true)}
          disabled={hasPending}
          title={hasPending ? '검토 중인 신청이 있습니다.' : undefined}
        >
          <PlusCircle className="size-4" />
          고정휴무 신청
        </Button>
      </div>

      {hasPending && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          검토 중인 신청이 있어 새로운 신청이 제한됩니다.
        </p>
      )}

      {isLoading && (
        <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
      )}

      {!isLoading && myRequests.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CalendarCheck className="size-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">신청 내역이 없습니다.</p>
        </div>
      )}

      <div className="space-y-3">
        {myRequests.map((req) => {
          const status = STATUS_MAP[req.status] ?? STATUS_MAP.PENDING;
          const daysStr = req.requested_days
            .slice()
            .sort((a, b) => a - b)
            .map((d) => DAY_LABELS[d] + '요일')
            .join(', ');

          return (
            <div
              key={req.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-800 text-sm">{daysStr || '요일 없음'}</p>
                  {req.reason && (
                    <p className="text-xs text-gray-500 line-clamp-1">사유: {req.reason}</p>
                  )}
                  {req.reject_reason && (
                    <p className="text-xs text-red-500">반려 사유: {req.reject_reason}</p>
                  )}
                  <p className="text-[11px] text-gray-400">
                    신청일: {new Date(req.created_at).toLocaleDateString('ko-KR')}
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

      <FixedDayoffModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isPending={isPending}
        currentDays={currentDays}
      />
    </div>
  );
}

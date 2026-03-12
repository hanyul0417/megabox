import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { WorkAction, WorkStatusResponseDTO } from '@/entities/work-status/api/dto';

import { workStatusService } from '@/entities/work-status/api/service';

// ── Query Keys ─────────────────────────────────────────────────────────────
const KEYS = {
  employees: ['work-status', 'employees'] as const,
  todayRecord: (userId: number) => ['work-status', 'today', userId] as const,
};

// ── Queries ────────────────────────────────────────────────────────────────

/** 근태 가능 직원 목록 */
export function useWorkStatusEmployeesQuery() {
  return useQuery({
    queryKey: KEYS.employees,
    queryFn: async () => {
      const res = await workStatusService.getEligibleEmployees();
      return res.items;
    },
    staleTime: 1000 * 60 * 5, // 5분 캐시
    gcTime: 1000 * 60 * 10,
    retry: 2,
  });
}

/** 특정 직원의 오늘 근태 기록 */
export function useTodayWorkRecordQuery(userId: number | null) {
  return useQuery({
    queryKey: KEYS.todayRecord(userId ?? 0),
    queryFn: () => workStatusService.getTodayRecord(userId!),
    enabled: userId !== null,
    staleTime: 1000 * 30, // 30초
    retry: 1,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

/** 근태 액션 실행 (user_id 기반) */
export function useWorkStatusActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, userId }: { action: WorkAction; userId: number }) =>
      workStatusService.changeStatusByUserId(action, { user_id: userId }),

    onSuccess: (data: WorkStatusResponseDTO, { userId }) => {
      // 해당 직원의 오늘 기록 캐시 업데이트
      queryClient.setQueryData<WorkStatusResponseDTO | null>(KEYS.todayRecord(userId), data);
    },

    onError: () => {
      toast.error('근태 기록에 실패했습니다. 다시 시도해주세요.');
    },
  });
}

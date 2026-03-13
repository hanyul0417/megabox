import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  approveDayOff,
  approveShiftRequest,
  createDayOff,
  createSchedule,
  createScheduleWeek,
  createShiftRequest,
  deleteSchedule,
  getAdminDayOffs,
  getAdminShiftRequests,
  getMyDayOffs,
  getMyShiftRequests,
  getScheduleUsers,
  getWeekOverlap,
  getWeekSchedule,
  rejectDayOff,
  rejectShiftRequest,
  updateSchedule,
  updateWeekStatus,
} from './service';

import type {
  DayOffCreateDTO,
  ScheduleCreateDTO,
  ScheduleUpdateDTO,
  ScheduleWeekCreateDTO,
  ScheduleWeekStatusUpdateDTO,
  ShiftRequestCreateDTO,
} from './dto';

import { QUERY_KEYS } from '@/shared/api/queryKeys';

const SK = QUERY_KEYS.schedule;

// ─── 주간 스케줄 ──────────────────────────────────────────

export function useWeekScheduleQuery(year: number, week: number) {
  return useQuery({
    queryKey: SK.week(year, week),
    queryFn: () => getWeekSchedule(year, week),
    staleTime: 1000 * 60 * 2,
  });
}

export function useWeekOverlapQuery(year: number, week: number) {
  return useQuery({
    queryKey: SK.overlap(year, week),
    queryFn: () => getWeekOverlap(year, week),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateScheduleWeekMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ScheduleWeekCreateDTO) => createScheduleWeek(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SK.base });
      toast.success('주차 스케줄이 생성되었습니다.');
    },
  });
}

export function useUpdateWeekStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      year,
      week,
      data,
    }: {
      year: number;
      week: number;
      data: ScheduleWeekStatusUpdateDTO;
    }) => updateWeekStatus(year, week, data),
    onSuccess: (_, { data }) => {
      void queryClient.invalidateQueries({ queryKey: SK.base });
      toast.success(
        data.status === 'CONFIRMED'
          ? '스케줄이 확정되었습니다. 직원들이 확인할 수 있습니다.'
          : '스케줄이 초안으로 변경되었습니다.',
      );
    },
  });
}

// ─── 스케줄 CRUD ──────────────────────────────────────────

export function useCreateScheduleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleWeekId, data }: { scheduleWeekId: number; data: ScheduleCreateDTO }) =>
      createSchedule(scheduleWeekId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SK.base });
      toast.success('스케줄이 생성되었습니다.');
    },
  });
}

export function useUpdateScheduleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ScheduleUpdateDTO }) => updateSchedule(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SK.base });
      toast.success('스케줄이 수정되었습니다.');
    },
  });
}

export function useDeleteScheduleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSchedule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SK.base });
      toast.success('스케줄이 삭제되었습니다.');
    },
  });
}

// ─── 직원 목록 ────────────────────────────────────────────

export function useScheduleUsersQuery() {
  return useQuery({
    queryKey: SK.users(),
    queryFn: getScheduleUsers,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── 휴무 신청 ────────────────────────────────────────────

export function useMyDayOffsQuery() {
  return useQuery({
    queryKey: SK.myDayoffs(),
    queryFn: getMyDayOffs,
  });
}

export function useAdminDayOffsQuery() {
  return useQuery({
    queryKey: SK.adminDayoffs(),
    queryFn: getAdminDayOffs,
  });
}

export function useCreateDayOffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DayOffCreateDTO) => createDayOff(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SK.dayoffsBase() });
      void queryClient.invalidateQueries({ queryKey: ['community'] });
      toast.success('휴무 신청이 완료되었습니다.');
    },
  });
}

export function useApproveDayOffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => approveDayOff(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SK.dayoffsBase() });
      toast.success('휴무 신청을 승인했습니다.');
    },
  });
}

export function useRejectDayOffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rejectDayOff(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SK.dayoffsBase() });
      toast.success('휴무 신청을 반려했습니다.');
    },
  });
}

// ─── 근무교대 ─────────────────────────────────────────────

export function useMyShiftRequestsQuery() {
  return useQuery({
    queryKey: SK.myShifts(),
    queryFn: getMyShiftRequests,
  });
}

export function useAdminShiftRequestsQuery() {
  return useQuery({
    queryKey: SK.adminShifts(),
    queryFn: getAdminShiftRequests,
  });
}

export function useCreateShiftRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ShiftRequestCreateDTO) => createShiftRequest(data),
    onSuccess: (_, data) => {
      void queryClient.invalidateQueries({ queryKey: SK.shiftsBase() });
      void queryClient.invalidateQueries({ queryKey: ['community'] });
      toast.success(
        data.type === 'EXCHANGE'
          ? '근무교대 신청이 완료되었습니다.'
          : '대타 신청이 완료되었습니다.',
      );
    },
  });
}

export function useApproveShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => approveShiftRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SK.base });
      toast.success('근무교대 신청이 승인되었습니다. 스케줄이 자동으로 변경됩니다.');
    },
  });
}

export function useRejectShiftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rejectShiftRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SK.shiftsBase() });
      toast.success('근무교대 신청을 반려했습니다.');
    },
  });
}

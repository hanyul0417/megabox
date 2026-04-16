import type {
  DayOffCreateDTO,
  ScheduleCreateDTO,
  ScheduleUpdateDTO,
  ScheduleWeekCreateDTO,
  ScheduleWeekStatusUpdateDTO,
  ShiftRequestCreateDTO,
} from './dto';
import type {
  DayOffResponse,
  ScheduleResponse,
  ScheduleUserOption,
  ScheduleWeekResponse,
  ShiftRequestResponse,
  WeekOverlapResponse,
  WeekScheduleResponse,
} from '../model/type';

import { apiClient } from '@/shared/api/apiClients';

// ─── 주간 스케줄 ──────────────────────────────────────────

export const getWeekSchedule = (year: number, weekNumber: number) =>
  apiClient.get<WeekScheduleResponse>({
    url: `/api/schedule/week/${year}/${weekNumber}`,
  });

export const createScheduleWeek = (data: ScheduleWeekCreateDTO) =>
  apiClient.post<ScheduleWeekResponse>({
    url: '/api/schedule/week',
    data,
  });

export const updateWeekStatus = (
  year: number,
  weekNumber: number,
  data: ScheduleWeekStatusUpdateDTO,
) =>
  apiClient.patch<ScheduleWeekResponse>({
    url: `/api/schedule/week/${year}/${weekNumber}/status`,
    data,
  });

export const getWeekOverlap = (year: number, weekNumber: number) =>
  apiClient.get<WeekOverlapResponse>({
    url: `/api/schedule/week/${year}/${weekNumber}/overlap`,
  });

// ─── 스케줄 CRUD ──────────────────────────────────────────

export const createSchedule = (scheduleWeekId: number, data: ScheduleCreateDTO) =>
  apiClient.post<ScheduleResponse>({
    url: '/api/schedule/',
    params: { schedule_week_id: scheduleWeekId },
    data,
  });

export const updateSchedule = (scheduleId: number, data: ScheduleUpdateDTO) =>
  apiClient.patch<ScheduleResponse>({
    url: `/api/schedule/${scheduleId}`,
    data,
  });

export const deleteSchedule = (scheduleId: number) =>
  apiClient.delete<void>({
    url: `/api/schedule/${scheduleId}`,
  });

// ─── 직원 목록 ────────────────────────────────────────────

export const getScheduleUsers = () =>
  apiClient.get<ScheduleUserOption[]>({
    url: '/api/schedule/users',
  });

// ─── 휴무 신청 ────────────────────────────────────────────

export const createDayOff = (data: DayOffCreateDTO) =>
  apiClient.post<DayOffResponse>({
    url: '/api/schedule/dayoff/',
    data,
  });

export const getMyDayOffs = () =>
  apiClient.get<DayOffResponse[]>({
    url: '/api/schedule/dayoff/my',
  });

export const getAdminDayOffs = () =>
  apiClient.get<DayOffResponse[]>({
    url: '/api/schedule/dayoff/admin',
  });

export const approveDayOff = (dayoffId: number) =>
  apiClient.patch<DayOffResponse>({
    url: `/api/schedule/dayoff/${dayoffId}/approve`,
    data: {},
  });

export const rejectDayOff = (dayoffId: number, reject_reason?: string) =>
  apiClient.patch<DayOffResponse>({
    url: `/api/schedule/dayoff/${dayoffId}/reject`,
    data: { reject_reason },
  });

export const deleteApprovedDayOff = (dayoffId: number) =>
  apiClient.delete<void>({
    url: `/api/schedule/dayoff/${dayoffId}`,
  });

// ─── 근무교대 ─────────────────────────────────────────────

export const createShiftRequest = (data: ShiftRequestCreateDTO) =>
  apiClient.post<ShiftRequestResponse>({
    url: '/api/schedule/shift/',
    data,
  });

export const getMyShiftRequests = () =>
  apiClient.get<ShiftRequestResponse[]>({
    url: '/api/schedule/shift/my',
  });

export const getAdminShiftRequests = () =>
  apiClient.get<ShiftRequestResponse[]>({
    url: '/api/schedule/shift/admin',
  });

export const approveShiftRequest = (shiftId: number) =>
  apiClient.patch<ShiftRequestResponse>({
    url: `/api/schedule/shift/${shiftId}/approve`,
    data: {},
  });

export const rejectShiftRequest = (shiftId: number, reject_reason?: string) =>
  apiClient.patch<ShiftRequestResponse>({
    url: `/api/schedule/shift/${shiftId}/reject`,
    data: { reject_reason },
  });

// ─── 상태 타입 ────────────────────────────────────────────

export type ScheduleStatus = 'DRAFT' | 'CONFIRMED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ShiftType = 'EXCHANGE' | 'SUBSTITUTE';

// 하위호환용 별칭
export type DayOffStatus = RequestStatus;

// ─── 주차 타입 ────────────────────────────────────────────

export interface ScheduleWeekResponse {
  id: number;
  year: number;
  week_number: number;
  status: ScheduleStatus;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// ─── 스케줄 타입 ──────────────────────────────────────────

export interface ScheduleResponse {
  id: number;
  schedule_week_id: number;
  user_id: number;
  user_name: string;
  user_position: string;
  work_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
}

export interface WeekScheduleResponse {
  week: ScheduleWeekResponse | null;
  schedules: ScheduleResponse[];
}

// ─── 시간 겹침 타입 ───────────────────────────────────────

export interface EmployeeOverlapInfo {
  user_id: number;
  name: string;
  position: string;
}

export interface TimeSlotOverlap {
  start_time: string;
  end_time: string;
  employees: EmployeeOverlapInfo[];
  count: number;
}

export interface DayOverlapResponse {
  work_date: string;
  slots: TimeSlotOverlap[];
}

export interface WeekOverlapResponse {
  year: number;
  week_number: number;
  days: DayOverlapResponse[];
}

// ─── 휴무 타입 ────────────────────────────────────────────

export interface DayOffResponse {
  id: number;
  user_id: number;
  user_name: string;
  request_date: string;
  reason: string;
  status: RequestStatus;
  is_weekend_or_holiday: boolean;
  processed_by: number | null;
  created_at: string;
}

// ─── 근무교대 타입 ────────────────────────────────────────

export interface ShiftRequestResponse {
  id: number;
  type: ShiftType;
  requester_id: number;
  requester_name: string;
  requester_schedule_id: number | null;
  requester_work_date: string | null;
  requester_start_time: string | null;
  requester_end_time: string | null;
  target_user_id: number;
  target_user_name: string;
  target_schedule_id: number | null;
  target_work_date: string | null;
  target_start_time: string | null;
  target_end_time: string | null;
  status: RequestStatus;
  note: string | null;
  created_at: string;
}

// ─── 고정휴무 타입 ────────────────────────────────────────

export type FixedDayOffStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface FixedDayOffResponse {
  id: number;
  user_id: number;
  user_name: string;
  requested_days: number[];
  reason: string | null;
  status: FixedDayOffStatus;
  processed_by: number | null;
  reject_reason: string | null;
  created_at: string;
}

// ─── 직원 옵션 ────────────────────────────────────────────

export interface ScheduleUserOption {
  id: number;
  username: string;
  name: string;
  position: string;
}

// 하위 호환용 (기존 ShiftResponse → ShiftRequestResponse)
export type ShiftResponse = ShiftRequestResponse;

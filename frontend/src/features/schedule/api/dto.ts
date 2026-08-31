import type { ScheduleStatus, ShiftType } from '../model/type';

// ─── 스케줄 주차 ──────────────────────────────────────────

export interface ScheduleWeekCreateDTO {
  year: number;
  week_number: number;
}

export interface ScheduleWeekStatusUpdateDTO {
  status: ScheduleStatus;
}

// ─── 스케줄 ──────────────────────────────────────────────

export interface ScheduleCreateDTO {
  user_id: number;
  work_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  force?: boolean; // true면 고정 불가 요일이어도 강제 등록
}

export interface ScheduleUpdateDTO {
  work_date?: string;
  start_time?: string;
  end_time?: string;
  force?: boolean; // true면 고정 불가 요일이어도 강제 등록
}

// ─── 휴무 신청 ────────────────────────────────────────────

export interface DayOffCreateDTO {
  request_date: string; // YYYY-MM-DD
  reason?: string;
}

// ─── 근무교대 신청 ────────────────────────────────────────

export interface ShiftRequestCreateDTO {
  type: ShiftType;
  requester_schedule_id: number;
  target_user_id: number;
  target_schedule_id?: number;
  note?: string;
}

// ─── 고정휴무 신청 ────────────────────────────────────────

export interface FixedDayOffCreateDTO {
  requested_days: number[]; // [0=일~6=토]
  reason?: string;
}

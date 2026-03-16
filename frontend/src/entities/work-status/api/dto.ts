// ── 기존 타입 (하위 호환 유지) ─────────────────────────────────────────
export type WorkAction = 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';

/** 기존 username+password 방식 (레거시) */
export interface WorkStatusRequestDTO {
  username: string;
  password: string;
}

/** 시스템 계정 대리 기록 방식 (키오스크) */
export interface WorkStatusKioskRequestDTO {
  user_id: number;
}

export interface WorkStatusResponseDTO {
  work_date: string; // YYYY-MM-DD
  check_in: string | null; // HH:MM:SS or null
  break_start: string | null;
  break_end: string | null;
  check_out: string | null;
  // 새 API: 시간 (소수점)
  total_work_hours?: number | null;
  day_hours?: number | null;
  night_hours?: number | null;
  // 구 API: 분 단위 (하위 호환)
  total_work_minutes?: number;
  total_break_minutes?: number;
  id?: number;
  user_id: number;
  user_name?: string | null;
}

// ── 키오스크 전용 타입 ──────────────────────────────────────────────────

/** 출퇴근 가능 직원 (approved + crew/leader/cleaning) */
export interface WorkStatusEmployee {
  id: number;
  name: string;
  position: string;
  username: string;
  profile_image?: string | null;
  /** 오늘의 현재 근태 기록 (없으면 null) */
  today_record?: WorkStatusResponseDTO | null;
}

export interface WorkStatusEmployeesResponseDTO {
  items: WorkStatusEmployee[];
}

/**
 * 근태 상태 머신
 *
 * idle → checked_in → on_break → returned → checked_out
 *                   ↘ (휴식 없이 바로 퇴근) ↗
 *
 * - returned: 복귀 완료 상태. 휴식은 하루 1회만 허용되므로 BREAK_START 불가.
 */
export type WorkCurrentStatus =
  | 'idle' // 미출근
  | 'checked_in' // 출근 후 (휴식 전)
  | 'on_break' // 휴식 중
  | 'returned' // 복귀 완료 (휴식 종료 후)
  | 'checked_out'; // 퇴근 완료

/** WorkStatusResponseDTO → WorkCurrentStatus 변환 (순수 함수) */
export function deriveCurrentStatus(
  record: WorkStatusResponseDTO | null | undefined,
): WorkCurrentStatus {
  if (!record || !record.check_in) return 'idle';
  if (record.check_out) return 'checked_out';
  if (record.break_start && record.break_end) return 'returned'; // 복귀 완료
  if (record.break_start && !record.break_end) return 'on_break'; // 휴식 중
  return 'checked_in'; // 출근 후 (휴식 전)
}

/** 상태별 한글 표시 */
export const STATUS_LABELS: Record<WorkCurrentStatus, string> = {
  idle: '미출근',
  checked_in: '근무중',
  on_break: '휴식중',
  returned: '근무중', // 복귀 후도 근무중으로 표시
  checked_out: '퇴근완료',
};

/** 상태별 색상 */
export const STATUS_COLORS: Record<WorkCurrentStatus, { bg: string; text: string; dot: string }> = {
  idle: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  checked_in: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  on_break: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  returned: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  checked_out: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

/**
 * 상태 머신 기반 버튼 활성화 테이블
 *
 * | 상태       | 출근 | 휴식 | 복귀 | 퇴근 |
 * |-----------|------|------|------|------|
 * | idle      |  ✓   |  ✗   |  ✗   |  ✗   |
 * | checked_in|  ✗   |  ✓   |  ✗   |  ✓   |
 * | on_break  |  ✗   |  ✗   |  ✓   |  ✗   |
 * | returned  |  ✗   |  ✗   |  ✗   |  ✓   | ← 핵심: 휴식 버튼 비활성
 * | checked_out|  ✗  |  ✗   |  ✗   |  ✗   |
 */
export const ACTION_ENABLED: Record<WorkCurrentStatus, Record<WorkAction, boolean>> = {
  idle: { CHECK_IN: true, BREAK_START: false, BREAK_END: false, CHECK_OUT: false },
  checked_in: { CHECK_IN: false, BREAK_START: true, BREAK_END: false, CHECK_OUT: true },
  on_break: { CHECK_IN: false, BREAK_START: false, BREAK_END: true, CHECK_OUT: false },
  returned: { CHECK_IN: false, BREAK_START: false, BREAK_END: false, CHECK_OUT: true },
  checked_out: { CHECK_IN: false, BREAK_START: false, BREAK_END: false, CHECK_OUT: false },
};

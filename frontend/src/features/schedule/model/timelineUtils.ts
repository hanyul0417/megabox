import type { ScheduleResponse } from './type';

// ─── 타임라인 상수 ────────────────────────────────────────

export const TIMELINE_START_HOUR = 6;
export const TIMELINE_END_HOUR = 30; // 다음날 06:00 (야간 근무 표시용)
export const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 24
export const TIMELINE_HEIGHT = 960; // px (40px per hour)

// ─── 타임라인 유틸 ────────────────────────────────────────

export function parseTimeToMinutes(t: string): number {
  const parts = t.split(':');
  return Number(parts[0]) * 60 + Number(parts[1] ?? 0);
}

export type ScheduleBlock = {
  schedule: ScheduleResponse;
  col: number;
  totalCols: number;
};

export function assignColumns(schedules: ScheduleResponse[]): ScheduleBlock[] {
  if (schedules.length === 0) return [];
  const sorted = [...schedules].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const colEnds: number[] = [];
  const assignments: Array<{ schedule: ScheduleResponse; col: number }> = [];

  for (const s of sorted) {
    const startMin = parseTimeToMinutes(s.start_time);
    let col = 0;
    while (col < colEnds.length && (colEnds[col] ?? 0) > startMin) {
      col++;
    }
    colEnds[col] = parseTimeToMinutes(s.end_time);
    assignments.push({ schedule: s, col });
  }

  const totalCols = colEnds.length > 0 ? colEnds.length : 1;
  return assignments.map((a) => ({ ...a, totalCols }));
}

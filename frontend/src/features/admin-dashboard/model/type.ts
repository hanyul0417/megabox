export interface HeadcountSummary {
  total_employees: number;
  scheduled_employees: number;
  absent_employees: number;
}

export interface WorkSummary {
  total_scheduled_hours: number;
  total_actual_hours: number;
  avg_scheduled_hours: number | null;
  avg_actual_hours: number | null;
}

export interface PayrollSummary {
  total_scheduled_gross: number;
  total_actual_gross: number;
}

export interface DayoffSummary {
  total_approved: number;
  total_pending: number;
}

export interface EmployeeDetail {
  user_id: number;
  name: string;
  position: string;
  /** "남" / "여" — 기본 프로필 아이콘용 */
  gender?: string | null;
  profile_image?: string | null;
  scheduled_hours: number;
  actual_hours: number;
  scheduled_gross: number;
  actual_gross: number;
  dayoff_count: number;
  absent_days: number;
  // 예상 급여 세부 항목
  wage: number;
  scheduled_day_hours: number;
  scheduled_night_hours: number;
  scheduled_weekly_allowance_hours: number;
  scheduled_holiday_hours: number;
  scheduled_annual_leave_hours: number;
  scheduled_day_wage: number;
  scheduled_night_wage: number;
  scheduled_weekly_allowance_pay: number;
  scheduled_holiday_pay: number;
  scheduled_annual_leave_pay: number;
}

export interface DashboardResponse {
  headcount_summary: HeadcountSummary;
  work_summary: WorkSummary;
  payroll_summary: PayrollSummary;
  dayoff_summary: DayoffSummary;
  per_employee: EmployeeDetail[];
}

/** 월별 관객수 (관리자 수동 입력) — 미입력 시 audience_count = null */
export interface MonthlyAudience {
  year: number;
  month: number;
  audience_count: number | null;
  updated_at: string | null;
}

export interface MonthlyAudienceUpsertRequest {
  year: number;
  month: number;
  audience_count: number;
}

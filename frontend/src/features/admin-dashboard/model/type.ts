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

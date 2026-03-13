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
  scheduled_hours: number;
  actual_hours: number;
  scheduled_gross: number;
  actual_gross: number;
  dayoff_count: number;
  absent_days: number;
}

export interface DashboardResponse {
  headcount_summary: HeadcountSummary;
  work_summary: WorkSummary;
  payroll_summary: PayrollSummary;
  dayoff_summary: DayoffSummary;
  per_employee: EmployeeDetail[];
}

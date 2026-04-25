export interface PayrollData {
  payroll_id: number;
  user_id: number;
  name: string;
  position: string | null;
  wage: number;

  birth_date?: string | null;
  pay_date?: string | null;
  join_date: string;
  resign_date: string | null;
  last_work_day: string | null;

  bank_name: string;
  bank_account: string;
  email: string;

  // 근무 요약
  total_work_days: number;
  total_work_hours: number;
  avg_daily_hours: number;

  // 시간 항목
  day_hours: number;
  night_hours: number;
  weekly_allowance_hours: number;
  annual_leave_hours: number;
  holiday_hours: number;

  // 급여 항목
  day_wage: number;
  night_wage: number;
  weekly_allowance_pay: number;
  annual_leave_pay: number;
  holiday_pay: number;
  gross_pay: number;

  // 공제
  insurance_health: number;
  insurance_care: number;
  insurance_employment: number;
  insurance_pension: number;
  total_deduction: number;
  net_pay: number;

  // 관리자용
  rrn: string;
}

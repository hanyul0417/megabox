export interface PayrollResponseDTO {
  payroll_id: number | null;
  user_id: number | null;
  name: string | null;
  position: string | null;
  wage: number | null;
  rrn: string | null;
  // 직원 급여 명세서용
  birth_date: string | null;
  pay_date: string | null;
  join_date: string | null;
  resign_date: string | null;
  last_work_day: string | null;
  bank_name: string | null;
  bank_account: string | null;
  email: string | null;

  total_work_days: number | null;
  total_work_hours: number | null;
  avg_daily_hours: number | null;

  day_hours: number | null;
  night_hours: number | null;
  weekly_allowance_hours: number | null;
  annual_leave_hours: number | null;
  holiday_hours: number | null;
  labor_day_hours: number | null;

  day_wage: number | null;
  night_wage: number | null;
  weekly_allowance_pay: number | null;
  annual_leave_pay: number | null;
  holiday_pay: number | null;
  labor_day_pay: number | null;
  gross_pay: number | null;

  insurance_health: number | null;
  insurance_care: number | null;
  insurance_employment: number | null;
  insurance_pension: number | null;

  total_deduction: number | null;
  net_pay: number | null;
}

/** 직원 본인 급여 명세서 DTO */
export interface PayrollPayResponseDTO {
  name: string | null;
  position: string | null;
  birth_date: string | null;
  pay_date: string | null;
  wage: number | null;

  total_work_days: number | null;
  total_work_hours: number | null;
  avg_daily_hours: number | null;

  day_hours: number | null;
  night_hours: number | null;
  weekly_allowance_hours: number | null;
  annual_leave_hours: number | null;
  holiday_hours: number | null;
  labor_day_hours: number | null;

  day_wage: number | null;
  night_wage: number | null;
  weekly_allowance_pay: number | null;
  annual_leave_pay: number | null;
  holiday_pay: number | null;
  labor_day_pay: number | null;
  gross_pay: number | null;

  insurance_health: number | null;
  insurance_care: number | null;
  insurance_employment: number | null;
  insurance_pension: number | null;

  total_deduction: number | null;
  net_pay: number | null;
}

export type PayrollResponse = PayrollResponseDTO | PayrollResponseDTO[];

/** 관리자 급여 수정 요청 */
export interface PayrollUpdateRequest {
  wage?: number;
  day_hours?: number;
  night_hours?: number;
  weekly_allowance_hours?: number;
  annual_leave_hours?: number;
  annual_leave_pay?: number | null;  // null → 자동계산 복원
  holiday_hours?: number;
  labor_day_hours?: number;
  insurance_health?: number;
  insurance_care?: number;
  insurance_employment?: number;
  insurance_pension?: number;
  last_work_day?: string;
}

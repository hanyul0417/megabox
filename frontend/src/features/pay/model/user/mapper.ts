import type { PayrollData } from '../type';
import type { UserPayroll } from './type';

export function mapToUserPayroll(data: PayrollData): UserPayroll {
  return {
    name: data.name,
    position: data.position,
    birth_date: data.birth_date ?? null,
    pay_date: data.pay_date ?? null,
    wage: data.wage,

    total_work_days: data.total_work_days,
    total_work_hours: data.total_work_hours,
    avg_daily_hours: data.avg_daily_hours,

    day_hours: data.day_hours,
    night_hours: data.night_hours,
    weekly_allowance_hours: data.weekly_allowance_hours,
    annual_leave_hours: data.annual_leave_hours,
    holiday_hours: data.holiday_hours,

    day_wage: data.day_wage,
    night_wage: data.night_wage,
    weekly_allowance_pay: data.weekly_allowance_pay,
    annual_leave_pay: data.annual_leave_pay,
    holiday_pay: data.holiday_pay,

    gross_pay: data.gross_pay,

    insurance_health: data.insurance_health,
    insurance_care: data.insurance_care,
    insurance_employment: data.insurance_employment,
    insurance_pension: data.insurance_pension,

    total_deduction: data.total_deduction,
    net_pay: data.net_pay,
  };
}

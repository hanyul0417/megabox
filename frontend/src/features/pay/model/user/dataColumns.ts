import type { UserPayroll, UserPayrollNumberKeys } from './type';

export const baseInfoColumns: { key: keyof UserPayroll; label: string }[] = [
  { key: 'name', label: '이름' },
  { key: 'birth_date', label: '생년월일' },
  { key: 'pay_date', label: '지급일' },
];

export const payColumns: {
  key: UserPayrollNumberKeys;
  label: string;
}[] = [
  { key: 'day_wage', label: '주간급여' },
  { key: 'night_wage', label: '야간근무수당' },
  { key: 'weekly_allowance_pay', label: '주휴수당' },
  { key: 'annual_leave_pay', label: '연차수당' },
  { key: 'holiday_pay', label: '법정공휴일수당' },
  { key: 'gross_pay', label: '급여총액' },
];

export const insuranceColumns: {
  key: UserPayrollNumberKeys;
  label: string;
}[] = [
  { key: 'insurance_health', label: '건강보험' },
  { key: 'insurance_care', label: '장기요양보험' },
  { key: 'insurance_employment', label: '고용보험' },
  { key: 'insurance_pension', label: '국민연금' },
  { key: 'total_deduction', label: '공제총액' },
];

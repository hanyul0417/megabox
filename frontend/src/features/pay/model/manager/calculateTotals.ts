export interface PayrollCalculatable {
  total_work_days?: number | null;
  total_work_hours?: number | null;
  avg_daily_hours?: number | null;

  day_hours?: number | null;
  night_hours?: number | null;
  weekly_allowance_hours?: number | null;
  annual_leave_hours?: number | null;
  holiday_hours?: number | null;

  day_wage?: number | null;
  night_wage?: number | null;
  weekly_allowance_pay?: number | null;
  annual_leave_pay?: number | null;
  holiday_pay?: number | null;

  gross_pay?: number | null;

  insurance_health?: number | null;
  insurance_care?: number | null;
  insurance_employment?: number | null;
  insurance_pension?: number | null;

  total_deduction?: number | null;
  net_pay?: number | null;
}

type NumberKeys<T> = Exclude<
  {
    [K in keyof T]: NonNullable<T[K]> extends number ? K : never;
  }[keyof T],
  undefined
>;

export const SUM_FIELDS: NumberKeys<PayrollCalculatable>[] = [
  'total_work_days',
  'total_work_hours',
  'avg_daily_hours',

  'day_hours',
  'night_hours',
  'weekly_allowance_hours',
  'annual_leave_hours',
  'holiday_hours',

  'day_wage',
  'night_wage',
  'weekly_allowance_pay',
  'annual_leave_pay',
  'holiday_pay',

  'gross_pay',

  'insurance_health',
  'insurance_care',
  'insurance_employment',
  'insurance_pension',

  'total_deduction',
  'net_pay',
];

export function calculateTotals<T extends PayrollCalculatable>(
  data: T[],
): Partial<Record<NumberKeys<PayrollCalculatable>, number>> {
  return data.reduce(
    (acc, cur) => {
      SUM_FIELDS.forEach((key) => {
        acc[key] = (acc[key] ?? 0) + (cur[key] ?? 0);
      });
      return acc;
    },
    {} as Partial<Record<NumberKeys<PayrollCalculatable>, number>>,
  );
}

export default calculateTotals;

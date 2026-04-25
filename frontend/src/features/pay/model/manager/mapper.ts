import type { PayrollData as BasePayrollData } from '../type';
import type { PayrollData } from '../type';

export function mapToManagerPayroll(data: BasePayrollData[]): PayrollData[] {
  return data.map((item) => ({
    ...item,
    name: item.name ?? '',
    rrn: item.rrn ?? '',
  }));
}

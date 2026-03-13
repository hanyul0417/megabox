import type { EmployeeDetail } from '../model/type';

import { ROLE_STYLES } from '@/entities/user/model/role';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/utils';

interface EmployeeTableProps {
  employees: EmployeeDetail[];
  isLoading?: boolean;
}

const EmployeeTable = ({ employees, isLoading }: EmployeeTableProps) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
        해당 월에 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="font-semibold text-sm text-gray-900">직원별 상세</h3>
        <p className="text-xs text-gray-400 mt-0.5">스케줄 vs 실제 근태 비교</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="text-xs font-semibold text-gray-600 min-w-[100px]">
                이름
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 text-center">
                직급
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 text-right">
                예정 시간
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 text-right">
                실제 시간
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 text-right">
                예상 급여
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 text-right">
                실제 급여
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 text-center">
                휴무
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 text-center">
                미출근
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => {
              const roleStyle = ROLE_STYLES[emp.position] ?? 'bg-gray-100 text-gray-700';
              return (
                <TableRow key={emp.user_id} className="hover:bg-gray-50/50">
                  <TableCell className="font-medium text-sm text-gray-900">
                    {emp.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold',
                        roleStyle,
                      )}
                    >
                      {emp.position}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {emp.scheduled_hours}h
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {emp.actual_hours}h
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {emp.scheduled_gross.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {emp.actual_gross.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {emp.dayoff_count > 0 ? (
                      <span className="text-sky-600 font-medium">{emp.dayoff_count}</span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {emp.absent_days > 0 ? (
                      <span className="text-red-600 font-medium">{emp.absent_days}</span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EmployeeTable;

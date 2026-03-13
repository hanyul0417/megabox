import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { mapPayroll } from '../model/mapper';

import { exportPayrollExcel, getPayroll, updatePayroll } from './service';

import type { PayrollResponse } from './dto';
import type { PayrollData } from '../model/type';

import { useAuthStore } from '@/shared/model/authStore';

interface UsePayrollQueryParams {
  year: number;
  month?: number;
}

export const usePayrollQuery = ({ year, month }: UsePayrollQueryParams) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<PayrollResponse, Error, PayrollData | PayrollData[]>({
    queryKey: ['payroll', year, month],
    queryFn: () => getPayroll({ year, month }),
    enabled: !!accessToken,
    select: (data) => {
      if (Array.isArray(data)) {
        return data.map(mapPayroll);
      }
      return mapPayroll(data);
    },
    staleTime: 0,
  });
};

export const useUpdatePayrollMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payrollId,
      data,
    }: {
      payrollId: number;
      data: Parameters<typeof updatePayroll>[1];
    }) => updatePayroll(payrollId, data),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success('급여 항목이 수정되었습니다.');
    },
    onError: () => {
      toast.error('급여 수정에 실패했습니다.');
    },
  });
};

export const useExportPayrollMutation = () => {
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      exportPayrollExcel(year, month),

    onSuccess: (blob, { year, month }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${year}_${String(month).padStart(2, '0')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('엑셀 다운로드가 완료되었습니다.');
    },
    onError: () => {
      toast.error('엑셀 다운로드에 실패했습니다.');
    },
  });
};

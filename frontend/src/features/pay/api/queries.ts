import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { mapPayroll } from '../model/mapper';

import {
  deletePayroll,
  exportPayrollExcel,
  getPayroll,
  recalculatePayroll,
  sendPayrollEmail,
  sendPayrollEmailBulk,
  updatePayroll,
} from './service';

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

export const useRecalculatePayrollMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      recalculatePayroll(year, month),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success('급여 재계산이 완료되었습니다.');
    },
    onError: () => {
      toast.error('급여 재계산에 실패했습니다.');
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

export const useDeletePayrollMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payrollId: number) => deletePayroll(payrollId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success('급여 내역이 삭제되었습니다.');
    },
    onError: () => {
      toast.error('삭제에 실패했습니다.');
    },
  });
};

export const useSendPayrollEmailMutation = () => {
  return useMutation({
    mutationFn: ({ payrollId, year, month }: { payrollId: number; year: number; month: number }) =>
      sendPayrollEmail(payrollId, year, month),
    onSuccess: () => {
      toast.success('급여명세서를 발송했습니다.');
    },
    onError: (error: unknown) => {
      const axErr = error as { response?: { data?: { detail?: string } } };
      toast.error(axErr.response?.data?.detail ?? '이메일 발송에 실패했습니다.');
    },
  });
};

export const useSendPayrollEmailBulkMutation = () => {
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      sendPayrollEmailBulk(year, month),
    onSuccess: (data) => {
      toast.success(
        `발송 완료: ${data.success_count}명 성공, ${data.fail_count}명 실패, ${data.skip_count}명 이메일 없음`,
      );
    },
    onError: (error: unknown) => {
      const axErr = error as { response?: { data?: { detail?: string } } };
      toast.error(axErr.response?.data?.detail ?? '일괄 발송에 실패했습니다.');
    },
  });
};

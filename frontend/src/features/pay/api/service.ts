import { apiClient, axiosInstance } from '../../../shared/api/apiClients';

import type { PayrollResponse, PayrollResponseDTO, PayrollUpdateRequest } from './dto';

interface GetPayrollParams {
  year: number;
  month?: number;
}

export async function getPayroll(params: GetPayrollParams): Promise<PayrollResponse> {
  return apiClient.get({
    url: '/api/payroll/',
    params,
  });
}

export async function updatePayroll(
  payrollId: number,
  data: PayrollUpdateRequest,
): Promise<PayrollResponseDTO> {
  return apiClient.patch({
    url: `/api/payroll/${payrollId}`,
    data,
  });
}

export async function exportPayrollExcel(year: number, month: number): Promise<Blob> {
  const response = await axiosInstance.get<Blob>('/api/payroll/export', {
    params: { year, month },
    responseType: 'blob',
  });
  return response.data;
}

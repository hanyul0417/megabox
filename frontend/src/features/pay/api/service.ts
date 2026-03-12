import { apiClient } from '../../../shared/api/apiClients';

import type { PayrollResponse, PayrollResponseDTO, PayrollUpdateRequest } from './dto';

interface GetPayrollParams {
  year: number;
  month?: number;
}

export async function getPayroll(params: GetPayrollParams): Promise<PayrollResponse> {
  return apiClient.get({
    url: '/api/payroll',
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
  const baseUrl = import.meta.env.VITE_BASE_URL ?? '';
  const token = JSON.parse(localStorage.getItem('auth-storage') ?? '{}')?.state?.accessToken;

  const response = await fetch(`${baseUrl}/api/payroll/export?year=${year}&month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('엑셀 다운로드 실패');
  }

  return response.blob();
}

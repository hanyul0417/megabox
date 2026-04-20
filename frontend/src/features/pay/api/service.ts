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

export async function deletePayroll(payrollId: number): Promise<void> {
  return apiClient.delete({ url: `/api/payroll/${payrollId}` });
}

export async function recalculatePayroll(year: number, month: number): Promise<void> {
  return apiClient.post({
    url: '/api/payroll/recalculate',
    params: { year, month },
  });
}

export async function exportPayrollExcel(year: number, month: number): Promise<Blob> {
  const response = await axiosInstance.get<Blob>('/api/payroll/export', {
    params: { year, month },
    responseType: 'blob',
  });
  return response.data;
}

export async function sendPayrollEmail(
  payrollId: number,
  year: number,
  month: number,
): Promise<{ success: boolean; message: string }> {
  return apiClient.post({
    url: `/api/payroll/${payrollId}/send-email`,
    params: { year, month },
  });
}

export interface BulkEmailResult {
  user_id: number;
  name: string;
  email: string | null;
  success: boolean;
  error?: string;
}

export interface BulkEmailResponse {
  total: number;
  success_count: number;
  fail_count: number;
  skip_count: number;
  results: BulkEmailResult[];
}

export async function sendPayrollEmailBulk(
  year: number,
  month: number,
): Promise<BulkEmailResponse> {
  return apiClient.post({
    url: '/api/payroll/send-email-bulk',
    params: { year, month },
  });
}

export interface BulkEmailLog {
  id: number;
  year: number;
  month: number;
  sent_by_name: string;
  sent_at: string;
  success_count: number;
  fail_count: number;
  skip_count: number;
}

export async function getPayrollBulkEmailHistory(
  year: number,
  month: number,
): Promise<BulkEmailLog[]> {
  return apiClient.get({
    url: '/api/payroll/send-email-bulk/history',
    params: { year, month },
  });
}

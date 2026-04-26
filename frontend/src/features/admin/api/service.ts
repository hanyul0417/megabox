import type {
  UniformWithUserDTO,
  UpdateUniformRequestDTO,
  UniformStockDTO,
  UpdateUniformStockRequestDTO,
  AdminUserDTO,
  AdminUserDetailDTO,
  AdminUsersResponseDTO,
  AutoPayDateRequestDTO,
  BulkUpdateWageRequestDTO,
  BulkUpdateWageResponseDTO,
  CreateAdminUserRequestDTO,
  CreateHolidayRequestDTO,
  CreateShiftPresetRequestDTO,
  DefaultWageResponseDTO,
  HolidayDTO,
  InsuranceRateCreateDTO,
  InsuranceRateResponseDTO,
  PayDateCreateDTO,
  PayDateResponseDTO,
  PayDateUpdateDTO,
  PendingUsersResponseDTO,
  RejectUserRequestDTO,
  ShiftPresetDTO,
  SuspendUserRequestDTO,
  SyncAllDefaultWagesResponseDTO,
  SyncHolidaysResponseDTO,
  UpdateAdminUserRequestDTO,
  UpdateHolidayRequestDTO,
  UpdateShiftPresetRequestDTO,
  UserPayrollHistoryDTO,
} from './dto';

import { apiClient, axiosInstance } from '@/shared/api/apiClients';

// 공휴일
export const getHolidays = (year: number) =>
  apiClient.get<HolidayDTO[]>({ url: '/api/admin/holidays', params: { year } });

export const createHoliday = (data: CreateHolidayRequestDTO) =>
  apiClient.post<HolidayDTO>({ url: '/api/admin/holidays', data });

export const updateHoliday = (id: number, data: UpdateHolidayRequestDTO) =>
  apiClient.put<HolidayDTO>({ url: `/api/admin/holidays/${id}`, data });

export const deleteHoliday = (id: number) =>
  apiClient.delete<{ success: boolean }>({ url: `/api/admin/holidays/${id}` });

export const syncHolidays = (year: number) =>
  apiClient.post<SyncHolidaysResponseDTO>({ url: '/api/admin/holidays/all', params: { year } });

// 직원 관리
export const getAdminUsers = (params?: { q?: string; limit?: number; offset?: number }) =>
  apiClient.get<AdminUsersResponseDTO>({ url: '/api/admin/users', params });

export const getAdminUserDetail = (memberId: number) =>
  apiClient.get<AdminUserDetailDTO>({ url: `/api/admin/users/${memberId}` });

export const createAdminUser = (data: CreateAdminUserRequestDTO) =>
  apiClient.post<AdminUserDTO>({ url: '/api/admin/users/create', data });

export const updateAdminUser = (memberId: number, data: UpdateAdminUserRequestDTO) =>
  apiClient.patch<AdminUserDTO>({ url: `/api/admin/users/${memberId}`, data });

export const deleteAdminUser = (memberId: number) =>
  apiClient.delete<void>({ url: `/api/admin/users/${memberId}` });

export const getUserPayrollHistory = (userId: number) =>
  apiClient.get<UserPayrollHistoryDTO[]>({ url: `/api/payroll/users/${userId}/history` });

export const downloadBulkTemplate = () =>
  axiosInstance.get('/api/payroll/bulk/template', { responseType: 'blob' }).then((res) => res.data as Blob);

export const bulkUploadPayroll = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return axiosInstance
    .post<{ inserted: number; updated: number; errors: string[] }>('/api/payroll/bulk/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};

// 가입 승인 관리
export const getPendingUsers = (params?: { limit?: number; offset?: number }) =>
  apiClient.get<PendingUsersResponseDTO>({ url: '/api/admin/pending-users', params });

export const approveUser = (memberId: number) =>
  apiClient.post<AdminUserDTO>({ url: `/api/admin/users/${memberId}/approve` });

export const rejectUser = (memberId: number, data: RejectUserRequestDTO = {}) =>
  apiClient.post<AdminUserDTO>({ url: `/api/admin/users/${memberId}/reject`, data });

export const suspendUser = (memberId: number, data: SuspendUserRequestDTO = {}) =>
  apiClient.post<AdminUserDTO>({ url: `/api/admin/users/${memberId}/suspend`, data });

export const unsuspendUser = (memberId: number) =>
  apiClient.post<AdminUserDTO>({ url: `/api/admin/users/${memberId}/unsuspend` });

// 4대보험 요율
export const getInsuranceRates = () =>
  apiClient.get<InsuranceRateResponseDTO[]>({ url: '/api/admin/insurance-rates' });

export const getInsuranceRateByYear = (year: number) =>
  apiClient.get<InsuranceRateResponseDTO>({ url: `/api/admin/insurance-rates/${year}` });

export const createInsuranceRate = (data: InsuranceRateCreateDTO) =>
  apiClient.post<InsuranceRateResponseDTO>({ url: '/api/admin/insurance-rates', data });

export const updateInsuranceRate = (year: number, data: InsuranceRateCreateDTO) =>
  apiClient.put<InsuranceRateResponseDTO>({ url: `/api/admin/insurance-rates/${year}`, data });

export const deleteInsuranceRate = (year: number) =>
  apiClient.delete<void>({ url: `/api/admin/insurance-rates/${year}` });

// 최저임금
export const getCurrentDefaultWage = () =>
  apiClient.get<DefaultWageResponseDTO>({ url: '/api/admin/default-wage/current' });

export const getDefaultWages = () =>
  apiClient.get<DefaultWageResponseDTO[]>({ url: '/api/admin/default-wage/' });

export const syncDefaultWage = (year: number) =>
  apiClient.post<DefaultWageResponseDTO>({ url: '/api/admin/default-wage/', params: { year } });

export const syncAllDefaultWages = () =>
  apiClient.post<SyncAllDefaultWagesResponseDTO>({ url: '/api/admin/default-wage/all' });

// 급여 지급일
export const getPayDates = (year: number) =>
  apiClient.get<PayDateResponseDTO[]>({ url: '/api/payroll/pay-dates', params: { year } });

export const createPayDate = (data: PayDateCreateDTO) =>
  apiClient.post<PayDateResponseDTO>({ url: '/api/payroll/pay-dates', data });

export const updatePayDate = (year: number, month: number, data: PayDateUpdateDTO) =>
  apiClient.patch<PayDateResponseDTO>({ url: `/api/payroll/pay-dates/${year}/${month}`, data });

export const deletePayDate = (year: number, month: number) =>
  apiClient.delete<void>({ url: `/api/payroll/pay-dates/${year}/${month}` });

export const autoCalculatePayDate = (data: AutoPayDateRequestDTO) =>
  apiClient.post<PayDateResponseDTO>({ url: '/api/payroll/pay-dates/auto', data });

// 시급 일괄 적용
export const bulkUpdateWage = (data: BulkUpdateWageRequestDTO) =>
  apiClient.patch<BulkUpdateWageResponseDTO>({ url: '/api/admin/users/wage/bulk', data });

// 유니폼
export const getUniforms = () =>
  apiClient.get<UniformWithUserDTO[]>({ url: '/api/admin/uniforms' });

export const upsertUniform = (userId: number, data: UpdateUniformRequestDTO) =>
  apiClient.put<UniformWithUserDTO>({ url: `/api/admin/uniforms/${userId}`, data });

export const getUniformStock = () =>
  apiClient.get<UniformStockDTO[]>({ url: '/api/admin/uniform-stock' });

export const updateUniformStock = (itemKey: string, data: UpdateUniformStockRequestDTO) =>
  apiClient.put<UniformStockDTO>({ url: `/api/admin/uniform-stock/${itemKey}`, data });

// 시프트 프리셋
export const getShiftPresets = () =>
  apiClient.get<ShiftPresetDTO[]>({ url: '/api/admin/shift-presets' });

export const createShiftPreset = (data: CreateShiftPresetRequestDTO) =>
  apiClient.post<ShiftPresetDTO>({ url: '/api/admin/shift-presets', data });

export const updateShiftPreset = (id: number, data: UpdateShiftPresetRequestDTO) =>
  apiClient.put<ShiftPresetDTO>({ url: `/api/admin/shift-presets/${id}`, data });

export const deleteShiftPreset = (id: number) =>
  apiClient.delete<void>({ url: `/api/admin/shift-presets/${id}` });

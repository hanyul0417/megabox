import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import {
  approveUser,
  autoCalculatePayDate,
  bulkUpdateWage,
  createAdminUser,
  createHoliday,
  createInsuranceRate,
  createShiftPreset,
  deleteAdminUser,
  deleteHoliday,
  deleteInsuranceRate,
  deleteShiftPreset,
  createPayDate,
  deletePayDate,
  getAdminUserDetail,
  getAdminUsers,
  getCurrentDefaultWage,
  getDefaultWages,
  getPayDates,
  getHolidays,
  getInsuranceRateByYear,
  getInsuranceRates,
  getPendingUsers,
  getShiftPresets,
  getUserPayrollHistory,
  rejectUser,
  suspendUser,
  syncAllDefaultWages,
  syncDefaultWage,
  updatePayDate,
  syncHolidays,
  unsuspendUser,
  updateAdminUser,
  updateHoliday,
  updateInsuranceRate,
  updateShiftPreset,
} from './service';

import type {
  AutoPayDateRequestDTO,
  BulkUpdateWageRequestDTO,
  CreateAdminUserRequestDTO,
  CreateHolidayRequestDTO,
  CreateShiftPresetRequestDTO,
  InsuranceRateCreateDTO,
  PayDateCreateDTO,
  PayDateUpdateDTO,
  RejectUserRequestDTO,
  SuspendUserRequestDTO,
  UpdateAdminUserRequestDTO,
  UpdateHolidayRequestDTO,
  UpdateShiftPresetRequestDTO,
} from './dto';

import { QUERY_KEYS } from '@/shared/api/queryKeys';

const ADMIN_QUERY_KEYS = QUERY_KEYS.admin;

// 공휴일
export function useHolidaysQuery(year: number) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.holidays(year),
    queryFn: () => getHolidays(year),
  });
}

export function useCreateHolidayMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHolidayRequestDTO) => createHoliday(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.holidaysBase() });
    },
  });
}

export function useUpdateHolidayMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateHolidayRequestDTO }) =>
      updateHoliday(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.holidaysBase() });
    },
  });
}

export function useDeleteHolidayMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteHoliday(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.holidaysBase() });
    },
  });
}

export function useSyncHolidaysMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (year: number) => syncHolidays(year),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.holidaysBase() });
    },
  });
}

// 직원 관리
export function useAdminUsersQuery(params?: { q?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.users(params),
    queryFn: () => getAdminUsers(params),
  });
}

export function useAdminUserDetailQuery(memberId: number) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.userDetail(memberId),
    queryFn: () => getAdminUserDetail(memberId),
    enabled: memberId > 0,
  });
}

export function useCreateAdminUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdminUserRequestDTO) => createAdminUser(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.usersBase() });
    },
  });
}

export function useUpdateAdminUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: number; data: UpdateAdminUserRequestDTO }) =>
      updateAdminUser(memberId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.usersBase() });
    },
  });
}

export function useDeleteAdminUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => deleteAdminUser(memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.usersBase() });
    },
  });
}

// 가입 승인 관리
export function usePendingUsersQuery(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.pendingUsers(),
    queryFn: () => getPendingUsers(params),
  });
}

export function useApproveUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => approveUser(memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.pendingUsers() });
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.usersBase() });
      toast.success('가입이 승인되었습니다.');
    },
  });
}

export function useRejectUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: number; data?: RejectUserRequestDTO }) =>
      rejectUser(memberId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.pendingUsers() });
      toast.success('가입이 거절되었습니다.');
    },
  });
}

export function useSuspendUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: number; data?: SuspendUserRequestDTO }) =>
      suspendUser(memberId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.usersBase() });
      toast.success('계정이 정지되었습니다.');
    },
  });
}

export function useUnsuspendUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => unsuspendUser(memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.usersBase() });
      toast.success('계정 정지가 해제되었습니다.');
    },
  });
}

// 4대보험 요율
export function useInsuranceRatesQuery() {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.insuranceRates(),
    queryFn: getInsuranceRates,
  });
}

export function useInsuranceRateByYearQuery(year: number) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.insuranceRateByYear(year),
    queryFn: async () => {
      try {
        return await getInsuranceRateByYear(year);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useCreateInsuranceRateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsuranceRateCreateDTO) => createInsuranceRate(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.insuranceRates() });
    },
  });
}

export function useUpdateInsuranceRateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, data }: { year: number; data: InsuranceRateCreateDTO }) =>
      updateInsuranceRate(year, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.insuranceRates() });
      void queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.insuranceRateByYear(variables.year),
      });
    },
  });
}

// 최저임금
export function useBulkUpdateWageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkUpdateWageRequestDTO) => bulkUpdateWage(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.usersBase() });
    },
  });
}

export function useCurrentDefaultWageQuery() {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.currentDefaultWage(),
    queryFn: getCurrentDefaultWage,
    retry: false,
  });
}

export function useDefaultWagesQuery() {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.defaultWages(),
    queryFn: getDefaultWages,
  });
}

export function useSyncDefaultWageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (year: number) => syncDefaultWage(year),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.defaultWages() });
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.currentDefaultWage() });
    },
  });
}

export function useSyncAllDefaultWagesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncAllDefaultWages,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.defaultWages() });
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.currentDefaultWage() });
    },
  });
}

// 급여 지급일
export function usePayDatesQuery(year: number) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.payDates(year),
    queryFn: () => getPayDates(year),
  });
}

export function useAutoCalculatePayDateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AutoPayDateRequestDTO) => autoCalculatePayDate(data),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.payDates(vars.year) });
    },
  });
}

export function useCreatePayDateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PayDateCreateDTO) => createPayDate(data),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.payDates(vars.year) });
    },
  });
}

export function useUpdatePayDateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month, data }: { year: number; month: number; data: PayDateUpdateDTO }) =>
      updatePayDate(year, month, data),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.payDates(vars.year) });
    },
  });
}

export function useDeletePayDateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) => deletePayDate(year, month),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.payDates(vars.year) });
    },
  });
}

export function useUserPayrollHistoryQuery(userId: number, enabled: boolean) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.userPayrollHistory(userId),
    queryFn: () => getUserPayrollHistory(userId),
    enabled: enabled && userId > 0,
  });
}

export function useDeleteInsuranceRateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (year: number) => deleteInsuranceRate(year),
    onSuccess: (_, year) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.insuranceRates() });
      void queryClient.removeQueries({
        queryKey: ADMIN_QUERY_KEYS.insuranceRateByYear(year),
      });
    },
  });
}

// 시프트 프리셋
export function useShiftPresetsQuery() {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.shiftPresets(),
    queryFn: getShiftPresets,
  });
}

export function useCreateShiftPresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShiftPresetRequestDTO) => createShiftPreset(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.shiftPresets() });
      toast.success('시프트 프리셋이 추가되었습니다.');
    },
  });
}

export function useUpdateShiftPresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateShiftPresetRequestDTO }) =>
      updateShiftPreset(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.shiftPresets() });
      toast.success('시프트 프리셋이 수정되었습니다.');
    },
  });
}

export function useDeleteShiftPresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteShiftPreset(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.shiftPresets() });
      toast.success('시프트 프리셋이 삭제되었습니다.');
    },
  });
}

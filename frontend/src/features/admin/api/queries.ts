import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import {
  approveUser,
  bulkUpdateWage,
  createAdminUser,
  createHoliday,
  createInsuranceRate,
  deleteAdminUser,
  deleteHoliday,
  deleteInsuranceRate,
  getAdminUserDetail,
  getAdminUsers,
  getCurrentDefaultWage,
  getHolidays,
  getInsuranceRateByYear,
  getInsuranceRates,
  getPendingUsers,
  rejectUser,
  suspendUser,
  syncHolidays,
  unsuspendUser,
  updateAdminUser,
  updateHoliday,
  updateInsuranceRate,
} from './service';

import type {
  BulkUpdateWageRequestDTO,
  CreateAdminUserRequestDTO,
  CreateHolidayRequestDTO,
  InsuranceRateCreateDTO,
  RejectUserRequestDTO,
  SuspendUserRequestDTO,
  UpdateAdminUserRequestDTO,
  UpdateHolidayRequestDTO,
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

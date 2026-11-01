import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDashboard, getMonthlyAudience, saveMonthlyAudience } from './service';

import type { MonthlyAudienceUpsertRequest } from '../model/type';

import { QUERY_KEYS } from '@/shared/api/queryKeys';

export function useAdminDashboardQuery(year: number, month: number) {
  return useQuery({
    queryKey: QUERY_KEYS.admin.dashboard(year, month),
    queryFn: () => getDashboard(year, month),
    staleTime: 1000 * 60 * 2,
  });
}

export function useMonthlyAudienceQuery(year: number, month: number) {
  return useQuery({
    queryKey: QUERY_KEYS.admin.monthlyAudience(year, month),
    queryFn: () => getMonthlyAudience(year, month),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSaveMonthlyAudienceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MonthlyAudienceUpsertRequest) => saveMonthlyAudience(data),
    onSuccess: (saved) => {
      queryClient.setQueryData(QUERY_KEYS.admin.monthlyAudience(saved.year, saved.month), saved);
    },
  });
}

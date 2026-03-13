import { useQuery } from '@tanstack/react-query';

import { getDashboard } from './service';

import { QUERY_KEYS } from '@/shared/api/queryKeys';

export function useAdminDashboardQuery(year: number, month: number) {
  return useQuery({
    queryKey: QUERY_KEYS.admin.dashboard(year, month),
    queryFn: () => getDashboard(year, month),
    staleTime: 1000 * 60 * 2,
  });
}

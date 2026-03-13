import type { DashboardResponse } from '../model/type';

import { apiClient } from '@/shared/api/apiClients';

export const getDashboard = (year: number, month: number) =>
  apiClient.get<DashboardResponse>({
    url: '/api/admin/dashboard',
    params: { year, month },
  });

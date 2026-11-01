import type {
  DashboardResponse,
  MonthlyAudience,
  MonthlyAudienceUpsertRequest,
} from '../model/type';

import { apiClient } from '@/shared/api/apiClients';

export const getDashboard = (year: number, month: number) =>
  apiClient.get<DashboardResponse>({
    url: '/api/admin/dashboard',
    params: { year, month },
  });

export const getMonthlyAudience = (year: number, month: number) =>
  apiClient.get<MonthlyAudience>({
    url: '/api/admin/dashboard/audience',
    params: { year, month },
  });

export const saveMonthlyAudience = (data: MonthlyAudienceUpsertRequest) =>
  apiClient.put<MonthlyAudience>({
    url: '/api/admin/dashboard/audience',
    data,
  });

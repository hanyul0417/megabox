import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as service from './service';

const QUERY_KEY = ['notifications'];

export function useNotificationsQuery() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: service.getNotifications,
    refetchInterval: 30_000, // 30초마다 폴링
    staleTime: 10_000,
  });
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'unread'],
    queryFn: service.getUnreadCount,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useMarkReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.markRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useMarkAllReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.markAllRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

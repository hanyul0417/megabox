import { apiClient } from '@/shared/api/apiClients';

import type { NotificationListResponse, UnreadCountResponse } from './dto';

export const getNotifications = () =>
  apiClient.get<NotificationListResponse>({ url: '/api/notifications/' });

export const getUnreadCount = () =>
  apiClient.get<UnreadCountResponse>({ url: '/api/notifications/unread-count' });

export const markRead = (id: number) =>
  apiClient.patch({ url: `/api/notifications/${id}/read` });

export const markAllRead = () =>
  apiClient.patch({ url: '/api/notifications/read-all' });

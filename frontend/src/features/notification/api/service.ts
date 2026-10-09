import type {
  NotificationListResponse,
  PushSubscribePayload,
  UnreadCountResponse,
  VapidPublicKeyResponse,
} from './dto';

import { apiClient } from '@/shared/api/apiClients';

export const getNotifications = () =>
  apiClient.get<NotificationListResponse>({ url: '/api/notifications/' });

export const getUnreadCount = () =>
  apiClient.get<UnreadCountResponse>({ url: '/api/notifications/unread-count' });

export const markRead = (id: number) => apiClient.patch({ url: `/api/notifications/${id}/read` });

export const markAllRead = () => apiClient.patch({ url: '/api/notifications/read-all' });

export const getVapidPublicKey = () =>
  apiClient.get<VapidPublicKeyResponse>({ url: '/api/notifications/push/public-key' });

export const subscribePush = (payload: PushSubscribePayload) =>
  apiClient.post({ url: '/api/notifications/push/subscribe', data: payload });

export const unsubscribePush = (endpoint: string) =>
  apiClient.post({ url: '/api/notifications/push/unsubscribe', data: { endpoint } });

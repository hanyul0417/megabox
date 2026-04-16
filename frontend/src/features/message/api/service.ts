import type { MessageCreateDTO, MessageResponse, UnreadCountDTO, UserSearchResultDTO } from './dto';

import { apiClient } from '@/shared/api/apiClients';

export const getInbox = () => apiClient.get<MessageResponse[]>({ url: '/api/message/inbox' });

export const getOutbox = () => apiClient.get<MessageResponse[]>({ url: '/api/message/outbox' });

export const getUnreadCount = () =>
  apiClient.get<UnreadCountDTO>({ url: '/api/message/unread-count' });

export const getMessage = (id: number) =>
  apiClient.get<MessageResponse>({ url: `/api/message/${id}` });

export const sendMessage = (data: MessageCreateDTO) =>
  apiClient.post<MessageResponse>({ url: '/api/message/', data });

export const deleteMessage = (id: number) => apiClient.delete<void>({ url: `/api/message/${id}` });

export const searchUsers = (q: string) =>
  apiClient.get<UserSearchResultDTO[]>({ url: '/api/message/users/search', params: { q } });

export const getContacts = () =>
  apiClient.get<UserSearchResultDTO[]>({ url: '/api/message/users/contacts' });

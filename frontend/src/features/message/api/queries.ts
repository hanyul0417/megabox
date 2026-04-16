import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import * as service from './service';

import type { MessageCreateDTO } from './dto';

import { QUERY_KEYS } from '@/shared/api/queryKeys';

const MESSAGE_KEY = QUERY_KEYS.message.base;

export function useInboxQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.message.inbox(),
    queryFn: service.getInbox,
  });
}

export function useOutboxQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.message.outbox(),
    queryFn: service.getOutbox,
  });
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.message.unread(),
    queryFn: service.getUnreadCount,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useMessageDetailQuery(id: number | null) {
  return useQuery({
    queryKey: QUERY_KEYS.message.detail(id!),
    queryFn: () => service.getMessage(id!),
    enabled: id !== null,
  });
}

export function useSendMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MessageCreateDTO) => service.sendMessage(data),
    onSuccess: () => {
      toast.success('쪽지를 보냈습니다.');
      void qc.invalidateQueries({ queryKey: MESSAGE_KEY });
    },
    onError: () => {
      toast.error('쪽지 전송에 실패했습니다.');
    },
  });
}

export function useDeleteMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => service.deleteMessage(id),
    onSuccess: () => {
      toast.success('쪽지를 삭제했습니다.');
      void qc.invalidateQueries({ queryKey: MESSAGE_KEY });
    },
    onError: () => {
      toast.error('삭제에 실패했습니다.');
    },
  });
}

export function useSearchUsersQuery(q: string) {
  return useQuery({
    queryKey: QUERY_KEYS.message.searchUsers(q),
    queryFn: () => service.searchUsers(q),
    enabled: q.length >= 1,
    staleTime: 5_000,
  });
}

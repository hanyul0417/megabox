export {
  useInboxQuery,
  useOutboxQuery,
  useUnreadCountQuery,
  useMessageDetailQuery,
  useSendMessageMutation,
  useDeleteMessageMutation,
  useSearchUsersQuery,
} from './api/queries';

export type {
  MessageResponse,
  MessageCreateDTO,
  UserSearchResultDTO,
  UnreadCountDTO,
} from './api/dto';

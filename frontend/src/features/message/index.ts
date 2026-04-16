export {
  useInboxQuery,
  useOutboxQuery,
  useUnreadCountQuery,
  useMessageDetailQuery,
  useSendMessageMutation,
  useDeleteMessageMutation,
  useOpenMessageMutation,
  useSearchUsersQuery,
} from './api/queries';

export type {
  MessageResponse,
  MessageCreateDTO,
  UserSearchResultDTO,
  UnreadCountDTO,
} from './api/dto';

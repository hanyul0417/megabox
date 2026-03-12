import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createPost,
  getCommunityPosts,
  getCommunityPostById,
  updatePost,
  deletePost,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getCategoryCounts,
  likePost,
  unlikePost,
} from './service';

import type {
  GetCommunityPostsParams,
  CreatePostRequestDTO,
  CommunityPostDTO,
  CommentsResponseDTO,
  CategoryCountsResponse,
} from './dto';

// 쿼리키 팩토리
export const communityKeys = {
  posts: (params: GetCommunityPostsParams) => ['communityPosts', params] as const,
  post: (id: number) => ['communityPost', id] as const,
  comments: (postId: number, page: number) => ['comments', postId, page] as const,
  categoryCounts: () => ['community', 'category-counts'] as const,
};

// 🔖 게시글
export function useCreatePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostRequestDTO) => createPost(data),

    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['communityPosts'],
      });
      await queryClient.refetchQueries({
        queryKey: ['community', 'category-counts'],
      });
    },
  });
}

export const useCommunityPostsQuery = (params: GetCommunityPostsParams) => {
  return useQuery({
    queryKey: communityKeys.posts(params),
    queryFn: () => getCommunityPosts(params),
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  });
};

export function useCommunityPostDetailQuery(id: number | null) {
  return useQuery({
    queryKey: ['communityPost', id],
    queryFn: () => getCommunityPostById(id!),
    enabled: !!id,
  });
}

export function useUpdatePostMutation() {
  const queryClient = useQueryClient();

  return useMutation<CommunityPostDTO, Error, { id: number; data: Partial<CreatePostRequestDTO> }>({
    mutationFn: ({ id, data }) => updatePost(id, data),

    onSuccess: (variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['communityPost', variables.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ['communityPosts'],
      });
    },
  });
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deletePost(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      void queryClient.invalidateQueries({
        queryKey: ['community', 'category-counts'],
      });
    },
  });
}

export const useCategoryCountsQuery = () => {
  return useQuery<CategoryCountsResponse>({
    queryKey: ['community', 'category-counts'],
    queryFn: () => getCategoryCounts(),
    staleTime: 1000 * 60,
  });
};

// 🔖 댓글
export const useCommentsQuery = (postId: number, page: number) =>
  useQuery<CommentsResponseDTO>({
    queryKey: ['comments', postId, page],
    queryFn: () => getComments(postId, page),
    placeholderData: (prev) => prev,
  });

export const useCreateCommentMutation = (postId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => createComment(postId, { content }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['comments', postId],
      });
      // 게시글 댓글 수 업데이트
      void queryClient.invalidateQueries({
        queryKey: ['communityPost', postId],
      });
    },
  });
};

export function useUpdateCommentMutation(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => updateComment(id, content),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['comments', postId],
      });
    },
  });
}

export function useDeleteCommentMutation(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteComment(id),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['comments', postId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['communityPost', postId],
      });
    },
  });
}

// 🔖 좋아요 (낙관적 업데이트)
export function useLikePostMutation(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ liked }: { liked: boolean }) => (liked ? unlikePost(postId) : likePost(postId)),

    onMutate: async ({ liked }) => {
      await queryClient.cancelQueries({ queryKey: communityKeys.post(postId) });
      const prev = queryClient.getQueryData<CommunityPostDTO>(communityKeys.post(postId));

      queryClient.setQueryData<CommunityPostDTO>(communityKeys.post(postId), (old) => {
        if (!old) return old;
        return {
          ...old,
          liked_by_me: !liked,
          likes_count: (old.likes_count ?? 0) + (liked ? -1 : 1),
        };
      });

      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(communityKeys.post(postId), ctx.prev);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) });
    },
  });
}

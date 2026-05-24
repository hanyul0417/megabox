import { apiClient, axiosInstance } from '../../../shared/api/apiClients';

import type {
  AttachmentDTO,
  CategoryCountsResponse,
  CommentDTO,
  CommentsResponseDTO,
  CommunityPostDTO,
  CommunityPostListResponseDTO,
  CreateCommentRequestDTO,
  CreatePostRequestDTO,
  CreatePostResponseDTO,
  GetCommunityPostsParams,
  UserSearchResultDTO,
} from './dto';

// 🔖 게시글
export const createPost = (data: CreatePostRequestDTO) =>
  apiClient.post<CreatePostResponseDTO>({
    url: '/api/community/posts',
    data,
  });

export const getCommunityPosts = (params?: GetCommunityPostsParams) =>
  apiClient.get<CommunityPostListResponseDTO>({
    url: '/api/community/posts',
    params,
  });

export const getCommunityPostById = (id: number) =>
  apiClient.get<CommunityPostDTO>({
    url: `/api/community/posts/${id}`,
  });

export const updatePost = (id: number, data: Partial<CreatePostRequestDTO>) =>
  apiClient.patch<CommunityPostDTO>({
    url: `/api/community/posts/${id}`,
    data,
  });

export const deletePost = (id: number) =>
  apiClient.delete<{ success: boolean }>({
    url: `/api/community/posts/${id}`,
  });

export const getCategoryCounts = () =>
  apiClient.get<CategoryCountsResponse>({
    url: '/api/community/category-counts',
  });

// 🔖 댓글
export const getComments = (postId: number, page = 1, pageSize = 10) =>
  apiClient.get<CommentsResponseDTO>({
    url: `/api/community/posts/${postId}/comments`,
    params: { page, page_size: pageSize },
  });

export const createComment = (postId: number, data: CreateCommentRequestDTO) =>
  apiClient.post<CommentDTO>({
    url: `/api/community/posts/${postId}/comments`,
    data,
  });

export const updateComment = (comment_id: number, content: string) =>
  apiClient.patch<CommentDTO>({
    url: `/api/community/comments/${comment_id}`,
    data: { content },
  });

export const deleteComment = (comment_id: number) =>
  apiClient.delete<{ success: boolean }>({
    url: `/api/community/comments/${comment_id}`,
  });

// 🔖 좋아요
export const likePost = (id: number) =>
  apiClient.post<{ likes_count: number; liked_by_me: boolean }>({
    url: `/api/community/posts/${id}/like`,
  });

export const unlikePost = (id: number) =>
  apiClient.delete<{ likes_count: number; liked_by_me: boolean }>({
    url: `/api/community/posts/${id}/like`,
  });

// 🔖 멘션 자동완성 유저 검색
export const searchUsersForMention = (q: string) =>
  apiClient.get<UserSearchResultDTO[]>({
    url: '/api/community/users/search',
    params: { q, limit: 10 },
  });

// 🔖 첨부파일
export const uploadAttachment = (postId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosInstance
    .post<AttachmentDTO>(`/api/community/posts/${postId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};

export const deleteAttachment = (attachmentId: number) =>
  apiClient.delete<{ message: string }>({
    url: `/api/community/attachments/${attachmentId}`,
  });

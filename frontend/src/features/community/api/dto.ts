// 멘션 유저 정보
export interface MentionedUserDTO {
  id: number;
  username: string;
  name: string;
}

// 게시글 생성 DTO
export interface CreatePostRequestDTO {
  title: string;
  content: string;
  category: '공지' | '자유게시판' | '근무교대' | '휴무신청';
}

export interface CreatePostResponseDTO {
  id: number;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

// 댓글 DTO
export interface CommentDTO {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  author_position: string;
  author_profile_image?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  like_count?: number;
  is_liked?: boolean;
  mentions?: MentionedUserDTO[];
}

// 게시글 DTO
export interface CommunityPostDTO {
  id: number;
  category: '공지' | '자유게시판' | '근무교대' | '휴무신청';
  title: string;
  content: string;
  author_id: number;
  author_name: string;
  author_position: string;
  author_profile_image?: string | null;
  system_generated: boolean;
  created_at: string;
  updated_at: string;
  comments: CommentDTO[];
  comments_count?: number;
  likes_count?: number;
  liked_by_me?: boolean;
}

// 게시글 목록 DTO
export interface CommunityPostListResponseDTO {
  items: CommunityPostDTO[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  previous: number | null;
  next: number | null;
}

// 댓글 조회 DTO
export interface CommentsResponseDTO {
  items: CommentDTO[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  previous: number | null;
  next: number | null;
}

// 댓글 생성 DTO
export interface CreateCommentRequestDTO {
  content: string;
}

// 게시글 목록 요청 파라미터
export interface GetCommunityPostsParams {
  category?: string;
  exclude_system?: boolean;
  page?: number;
  page_size?: number;
  search?: string;
  order?: 'latest' | 'oldest' | 'popular';
}

// 카테고리별 글 갯수
export interface CategoryCountsResponse {
  counts: Record<string, number>;
}

// 유저 검색 결과 (멘션 자동완성)
export interface UserSearchResultDTO {
  id: number;
  username: string;
  name: string;
  position: string;
}

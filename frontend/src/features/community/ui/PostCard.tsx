import { Heart, MessageSquare, Pin } from 'lucide-react';
import { memo } from 'react';

import { formatRelativeTime } from '../model/formatData';

import type { CommunityPostDTO } from '../api/dto';

import { ROLE_STYLES } from '@/entities/user/model/role';
import { getProfileImageUrl } from '@/shared/lib/avatar';
import { cn } from '@/shared/lib/utils';

// ── 카테고리 설정 ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  공지: { label: '공지', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200' },
  자유게시판: {
    label: '자유',
    dot: 'bg-purple-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  휴무신청: {
    label: '휴무신청',
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  근무교대: {
    label: '근무교대',
    dot: 'bg-green-500',
    badge: 'bg-green-50 text-green-700 border-green-200',
  },
};

const DEFAULT_CONFIG = {
  label: '기타',
  dot: 'bg-gray-400',
  badge: 'bg-gray-50 text-gray-600 border-gray-200',
};

interface PostCardProps {
  post: CommunityPostDTO;
  onClick: () => void;
  showCategory?: boolean;
}

export const PostCard = memo(({ post, onClick, showCategory = true }: PostCardProps) => {
  const config = CATEGORY_CONFIG[post.category] ?? DEFAULT_CONFIG;
  const likes = post.likes_count ?? 0;
  const comments = post.comments_count ?? post.comments?.length ?? 0;
  const isNotice = post.category === '공지';
  const profileImageUrl = getProfileImageUrl(post.author_profile_image);

  return (
    <article
      onClick={onClick}
      className={cn(
        'group relative bg-white rounded-2xl border border-gray-100 shadow-sm',
        'cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-gray-200 hover:-translate-y-[1px]',
        'overflow-hidden',
        isNotice && 'border-red-100 bg-gradient-to-r from-red-50/30 to-white',
      )}
    >
      {/* 카테고리 컬러 바 */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl', config.dot)} />

      <div className="pl-5 pr-5 py-4">
        {/* 상단: 카테고리 배지 + 작성 시간 */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            {showCategory && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border',
                  config.badge,
                )}
              >
                {isNotice && <Pin className="size-2.5" />}
                {config.label}
              </span>
            )}
            {post.system_generated && (
              <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                시스템
              </span>
            )}
          </div>
          <time className="text-[11px] text-gray-400">{formatRelativeTime(post.created_at)}</time>
        </div>

        {/* 제목 */}
        <h3 className="text-[15px] font-semibold text-gray-900 leading-snug mb-1.5 group-hover:text-mega transition-colors line-clamp-2">
          {post.title}
        </h3>

        {/* 내용 미리보기 */}
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">{post.content}</p>

        {/* 하단: 작성자 + 통계 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {/* 아바타 */}
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-mega-secondary/10 shrink-0 overflow-hidden">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={post.author_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-mega-secondary">
                  {post.author_name.charAt(0)}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-gray-700 truncate">{post.author_name}</span>
            {post.author_position && (
              <>
                <span className="text-gray-300 text-xs shrink-0">·</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0',
                    ROLE_STYLES[post.author_position] ?? 'bg-gray-100 text-gray-600',
                  )}
                >
                  {post.author_position}
                </span>
              </>
            )}
          </div>

          {/* 좋아요 + 댓글 */}
          <div className="flex items-center gap-3 shrink-0 ml-2">
            {likes > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                <Heart className="size-3.5 fill-rose-400" />
                {likes}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <MessageSquare className="size-3.5" />
              {comments}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
});

PostCard.displayName = 'PostCard';

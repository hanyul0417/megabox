import { MoreHorizontal, Pencil, Trash2, Heart } from 'lucide-react';
import { memo, useState } from 'react';

import { formatRelativeTime } from '../../model/formatData';

import type { CommentDTO } from '../../api/dto';

import { ROLE_STYLES } from '@/entities/user/model/role';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';

interface CommentItemProps {
  comment: CommentDTO;
  currentUserId: number;
  isAdmin?: boolean;
  onUpdate: (id: number, content: string) => void;
  onDelete: (id: number) => void;
  onLike?: (id: number) => void;
}

// @username 멘션 하이라이트 렌더링
function renderMentionContent(content: string): React.ReactNode {
  const parts = content.split(/(@[\w가-힣]+)/g);
  return parts.map((part, i) => {
    if (/^@[\w가-힣]+$/.test(part)) {
      return (
        <span
          key={i}
          className="text-mega-secondary font-semibold bg-mega-secondary/5 rounded px-0.5"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export const CommentItem = memo(
  ({ comment, currentUserId, isAdmin = false, onUpdate, onDelete, onLike }: CommentItemProps) => {
    const isMine = comment.author_id === currentUserId;
    const canManage = isMine || isAdmin;
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(comment.content);
    const isEdited = comment.updated_at !== comment.created_at;
    const likeCount = comment.like_count ?? 0;
    const isLiked = comment.is_liked ?? false;
    const hasMentions = (comment.mentions?.length ?? 0) > 0;

    const handleSave = () => {
      if (!value.trim()) return;
      onUpdate(comment.id, value.trim());
      setIsEditing(false);
    };

    const handleCancel = () => {
      setValue(comment.content);
      setIsEditing(false);
    };

    return (
      <div className={cn('flex gap-3 group', hasMentions && 'relative')}>
        {/* 아바타 */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-mega-secondary/10 shrink-0 mt-0.5">
          <span className="text-xs font-bold text-mega-secondary">
            {comment.author_name.charAt(0)}
          </span>
        </div>

        {/* 본문 */}
        <div className="flex-1 min-w-0">
          {/* 작성자 + 시간 */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-gray-800">{comment.author_name}</span>
            {comment.author_position && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-md font-medium',
                  ROLE_STYLES[comment.author_position] ?? 'bg-gray-100 text-gray-600',
                )}
              >
                {comment.author_position}
              </span>
            )}
            <span className="text-[11px] text-gray-400">
              {formatRelativeTime(comment.created_at)}
            </span>
            {isEdited && <span className="text-[10px] text-gray-300">(수정됨)</span>}
          </div>

          {/* 내용 or 수정 폼 */}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={3}
                autoFocus
                className="w-full resize-none rounded-xl border border-mega-secondary/30 bg-mega-secondary/5 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-mega-secondary/20"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-7 px-3 text-xs bg-mega hover:bg-nav-bg rounded-lg"
                >
                  저장
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  className="h-7 px-3 text-xs rounded-lg"
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">
              {renderMentionContent(comment.content)}
            </p>
          )}

          {/* 좋아요 버튼 */}
          {!isEditing && onLike && (
            <button
              type="button"
              onClick={() => onLike(comment.id)}
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg transition-all',
                isLiked
                  ? 'text-rose-500 bg-rose-50'
                  : 'text-gray-400 hover:text-rose-400 hover:bg-rose-50',
              )}
            >
              <Heart className={cn('size-3', isLiked && 'fill-rose-500')} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
          )}
        </div>

        {/* 내 댓글/관리자 메뉴 */}
        {canManage && !isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="self-start mt-0.5 p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[100px]">
              {isMine && (
                <DropdownMenuItem
                  onClick={() => setIsEditing(true)}
                  className="gap-2 cursor-pointer"
                >
                  <Pencil className="size-3.5" />
                  수정
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(comment.id)}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="size-3.5" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  },
);

CommentItem.displayName = 'CommentItem';
export default CommentItem;

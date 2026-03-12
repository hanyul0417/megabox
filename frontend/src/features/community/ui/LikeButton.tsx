import { Heart } from 'lucide-react';
import { memo } from 'react';

import { useLikePostMutation } from '../api/queries';

import { cn } from '@/shared/lib/utils';

interface LikeButtonProps {
  postId: number;
  likesCount: number;
  likedByMe: boolean;
  size?: 'sm' | 'lg';
}

export const LikeButton = memo(
  ({ postId, likesCount, likedByMe, size = 'sm' }: LikeButtonProps) => {
    const { mutate, isPending } = useLikePostMutation(postId);

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      mutate({ liked: likedByMe });
    };

    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-150',
          'disabled:opacity-50',
          size === 'sm'
            ? 'text-xs px-2 py-1'
            : 'text-sm px-4 py-2 border shadow-sm hover:shadow active:scale-[0.97]',
          likedByMe
            ? size === 'sm'
              ? 'text-rose-500'
              : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
            : size === 'sm'
              ? 'text-gray-400 hover:text-rose-500'
              : 'border-gray-200 bg-white text-gray-600 hover:border-rose-200 hover:text-rose-500',
        )}
      >
        <Heart
          className={cn(
            'transition-all duration-150',
            size === 'sm' ? 'size-3.5' : 'size-4',
            likedByMe ? 'fill-current' : '',
          )}
        />
        <span>{likesCount}</span>
      </button>
    );
  },
);

LikeButton.displayName = 'LikeButton';

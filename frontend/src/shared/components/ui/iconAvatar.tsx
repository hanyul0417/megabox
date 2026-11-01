import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/lib/utils';

const iconAvatarVariants = cva('flex items-center justify-center rounded-full shrink-0', {
  variants: {
    variant: {
      default: 'bg-muted text-foreground',
      brand: 'bg-mega text-white',
      blue: 'bg-ice-soft text-mega',
      green: 'bg-green-100 text-green-600',
      red: 'bg-red-100 text-red-600',
      gray: 'bg-gray-300/30 text-white',
    },
    size: {
      sm: 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4',
      md: 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
      lg: 'h-12 w-12 [&_svg]:h-6 [&_svg]:w-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export interface IconAvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconAvatarVariants> {
  children: React.ReactNode;
}

/**
 * 카드 헤더 타이틀 앞에 사용하는 아이콘 아바타 컴포넌트
 *
 * @param variant 아이콘 아바타의 배경 및 색상 스타일
 * @param size 아이콘 아바타의 크기
 *
 * @example
 * ```tsx
 * <IconAvatar variant="blue">
 *   <Calendar />
 * </IconAvatar>
 * ```
 */
function IconAvatar({ className, variant, size, children, ...props }: IconAvatarProps) {
  return (
    <div className={cn(iconAvatarVariants({ variant, size }), className)} {...props}>
      {children}
    </div>
  );
}

export { IconAvatar, iconAvatarVariants };

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared//lib/utils';

const cardVariants = cva('text-card-foreground flex flex-col rounded-2xl w-full overflow-hidden', {
  variants: {
    variant: {
      default: 'bg-white border border-gray-100',
      blueMain: 'bg-mega-light-blue border border-blue-100',
      blueSide: 'max-w-1/6 bg-mega-light-blue border border-blue-100',
      purpleMain: 'bg-mega-secondary text-white',
    },
    shadow: {
      default: 'shadow-sm',
      none: 'shadow-none',
    },
  },
  defaultVariants: {
    variant: 'default',
    shadow: 'default',
  },
});

type CardProps = React.ComponentProps<'div'> & VariantProps<typeof cardVariants>;

/** Card 전체 UI
 * @param variant 카드 테마
 * @param shadow 카드 그림자 옵션
 *
 * variant 옵션:
 * - `default`  : 기본 카드 (흰색 배경 + border + shadow)
 * - `blueMain` : 메인 영역 강조 카드 (연한 파란 배경)
 * - `blueSide` : 사이드 영역 카드 (연한 파란 배경 + 좁은 폭)
 * - `purpleMain` : 보라색 테마 카드 (연한 보라 배경)
 *
 * shadow 옵션:
 * - `default` : 기본 그림자 효과
 * - `none`    : 그림자 없음
 */
function Card({ className, variant, shadow, ...props }: CardProps) {
  return (
    <div data-slot="card" className={cn(cardVariants({ variant, shadow }), className)} {...props} />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start p-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold flex justify-between items-center', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
};

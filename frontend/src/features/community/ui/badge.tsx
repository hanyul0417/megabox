import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-sm px-2 py-0.5 text-xs', {
  variants: {
    variant: {
      notice: 'bg-red-100 text-red-600',
      free: 'bg-gray-100 text-gray-600',
      shift: 'bg-success-bg text-success',
      dayoff: 'bg-info-bg text-info',
    },
  },
  defaultVariants: {
    variant: 'free',
  },
});

type BadgeProps = VariantProps<typeof badgeVariants> & {
  label: string;
};

export function Badge({ variant, label }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }))}>{label}</span>;
}

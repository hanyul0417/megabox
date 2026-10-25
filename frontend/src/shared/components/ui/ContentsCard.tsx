import type { VariantProps } from 'class-variance-authority';
import type { PropsWithChildren } from 'react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cardVariants,
} from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

interface ContentsCardProps extends PropsWithChildren, VariantProps<typeof cardVariants> {
  profile?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const ContentsCard = ({
  profile,
  title,
  description,
  action,
  children,
  className,
  variant,
  shadow,
}: ContentsCardProps) => {
  return (
    <Card variant={variant} shadow={shadow} className={cn('min-w-0', className)}>
      <CardHeader>
        <CardTitle className=" flex gap-3 items-center">
          {profile ? profile : title}
          {action && <CardAction>{action}</CardAction>}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
};

export default ContentsCard;

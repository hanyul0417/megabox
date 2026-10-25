import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared//lib/utils';

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap text-sm font-semibold tracking-tight transition-[color,background-color,border-color,box-shadow,opacity] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/40 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-mega-secondary text-white shadow-xs hover:bg-mega-hover active:bg-mega',
        destructive:
          'bg-accent-red text-white shadow-xs hover:bg-accent-red/90 focus-visible:ring-destructive/25',
        green: 'bg-green text-white shadow-xs hover:bg-green/90 focus-visible:ring-green/25',
        blue: 'bg-accent-blue text-white shadow-xs hover:bg-accent-blue/90 focus-visible:ring-accent-blue/25',
        yellow: 'bg-orange text-white shadow-xs hover:bg-orange/90 focus-visible:ring-orange/25',
        outline:
          'border border-gray-200 bg-white text-gray-700 shadow-xs hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900',
        secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200/70',
        ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        link: 'text-mega-secondary underline-offset-4 hover:underline',
        nav: 'bg-white text-mega-secondary hover:bg-mega-soft focus-visible:ring-ring/40',
      },
      size: {
        default: 'h-10 px-4 has-[>svg]:px-3.5',
        sm: 'h-9 gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5',
        lg: 'h-11 px-6 text-[15px] has-[>svg]:px-5',
        icon: 'size-10',
        'icon-sm': 'size-9',
        'icon-lg': 'size-12 [&_svg]:size-5',
        transparent: 'py-2 px-4',
      },
      rounded: {
        default: 'rounded-lg',
        lg: 'rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  rounded,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, rounded, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

import * as React from 'react';

import { cn } from '@/shared//lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // 모바일 16px(text-base): iOS 입력 시 자동 확대 방지
        'file:text-foreground placeholder:text-gray-400 border-input h-10 w-full min-w-0 rounded-lg border bg-white px-3 py-1 text-base text-gray-900 shadow-xs transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 md:text-sm',
        'hover:border-gray-300 focus-visible:border-mega-secondary/60 focus-visible:ring-ring/25 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Input };

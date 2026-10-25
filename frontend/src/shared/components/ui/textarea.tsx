import * as React from 'react';

import { cn } from '@/shared//lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-gray-400 hover:border-gray-300 focus-visible:border-mega-secondary/60 focus-visible:ring-ring/25 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-lg border bg-white px-3 py-2 text-base leading-relaxed text-gray-900 shadow-xs transition-[color,box-shadow,border-color] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

import type { ReactNode } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';

export interface RHFInputProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  type?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
  transform?: (value: string) => string;
  suffix?: ReactNode;
  note?: ReactNode;
}

const RHFInput = <T extends FieldValues>({
  form,
  name,
  label,
  placeholder = '',
  type = 'text',
  className = '',
  disabled = false,
  maxLength,
  transform,
  suffix,
  note,
}: RHFInputProps<T>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col gap-0 w-full">
          {label && <FormLabel className="mb-1">{label}</FormLabel>}
          <FormControl>
            <div className="relative flex items-center">
              <Input
                type={type}
                placeholder={placeholder}
                disabled={disabled}
                maxLength={maxLength}
                data-testid={`input-${name}`}
                className={suffix ? `pr-10 ${className}` : className}
                {...field}
                onChange={(e) => {
                  const raw = e.target.value;
                  const transformed = transform ? transform(raw) : raw;
                  field.onChange(transformed);
                }}
              />
              {suffix && (
                <span className="absolute right-3 text-muted-foreground text-sm pointer-events-none">
                  {suffix}
                </span>
              )}
            </div>
          </FormControl>
          <FormMessage className="text-end">{note}</FormMessage>
        </FormItem>
      )}
    />
  );
};

export default RHFInput;

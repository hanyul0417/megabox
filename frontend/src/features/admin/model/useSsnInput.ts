import type { ChangeEvent } from 'react';
import type { UseFormSetValue } from 'react-hook-form';

import type { UserFormValues } from './user.schema';

/**
 * 주민등록번호 자동 포맷팅 hook
 * 입력: 9001011234567  →  출력: 900101-1234567
 */
export const useSsnInput = (setValue: UseFormSetValue<UserFormValues>) => {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 13);
    const formatted = raw.length > 6 ? `${raw.slice(0, 6)}-${raw.slice(6)}` : raw;
    setValue('ssn', formatted, { shouldValidate: true });
  };
};

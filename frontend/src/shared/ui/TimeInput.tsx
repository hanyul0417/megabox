import { useCallback, useRef, useState } from 'react';

import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

interface TimeInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * 시간 입력 컴포넌트 — 숫자만 입력, 자동 HH:MM 변환
 * - 4자리 입력 시 자동 변환 (예: 0900 -> 09:00)
 * - blur 시 자동 완성 (예: 09 -> 09:00, 900 -> 09:00)
 * - 유효성 검사 (시 0~23, 분 0~59)
 */
const TimeInput = ({ id, value, onChange, className, placeholder = 'HH:MM' }: TimeInputProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 외부 value 변경 감지
  if (value !== displayValue && !inputRef.current?.matches(':focus')) {
    setDisplayValue(value);
    setError(false);
  }

  const formatToTime = useCallback((raw: string): string | null => {
    const digits = raw.replace(/\D/g, '');

    if (digits.length === 0) return '';

    let hours: number;
    let minutes: number;

    if (digits.length <= 2) {
      hours = parseInt(digits, 10);
      minutes = 0;
    } else if (digits.length === 3) {
      hours = parseInt(digits.slice(0, 1), 10);
      minutes = parseInt(digits.slice(1), 10);
      if (minutes > 59) {
        hours = parseInt(digits.slice(0, 2), 10);
        minutes = parseInt(digits.slice(2) + '0', 10);
      }
    } else {
      hours = parseInt(digits.slice(0, 2), 10);
      minutes = parseInt(digits.slice(2, 4), 10);
    }

    if (hours > 23 || minutes > 59) return null;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // 콜론 포함된 입력도 허용
    const cleaned = raw.replace(/[^0-9:]/g, '');
    setDisplayValue(cleaned);
    setError(false);

    // 콜론이 있고 HH:MM 형태이면 바로 적용
    if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
      const formatted = formatToTime(cleaned);
      if (formatted) {
        onChange(formatted);
        return;
      }
    }

    // 숫자 4자리면 자동 변환
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length >= 4) {
      const formatted = formatToTime(digits.slice(0, 4));
      if (formatted) {
        setDisplayValue(formatted);
        onChange(formatted);
      } else {
        setError(true);
      }
    }
  };

  const handleBlur = () => {
    if (displayValue === '') {
      onChange('');
      setError(false);
      return;
    }

    const formatted = formatToTime(displayValue);
    if (formatted === null) {
      setError(true);
      return;
    }

    if (formatted === '') {
      setDisplayValue('');
      onChange('');
      return;
    }

    setDisplayValue(formatted);
    onChange(formatted);
    setError(false);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn('rounded-xl h-11', error && 'border-red-400 focus-visible:ring-red-300', className)}
        maxLength={5}
        autoComplete="off"
      />
      {error && (
        <p className="text-[10px] text-red-500 mt-0.5 absolute -bottom-4">
          올바른 시간을 입력하세요 (00:00~23:59)
        </p>
      )}
    </div>
  );
};

export default TimeInput;
